# backend/stocks/views.py

from pathlib import Path
import logging, json
from decimal import Decimal

import pandas as pd
import requests
import yfinance as yf

from django.utils.timezone import now as dj_now
from django.db import transaction as db_tx
from django.db.models import F, Max
from django.shortcuts import get_object_or_404
from django.contrib.auth import get_user_model

from rest_framework import generics, permissions, status
from rest_framework.generics import ListAPIView
from rest_framework.pagination import PageNumberPagination
from rest_framework.views import APIView
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response

from pytz import timezone as pytz_tz

from leagues.models import League, LeagueMembership
from .models import (
    Stock, Portfolio, Transaction, LeagueBalance,
    TrackedSymbol, Season, SeasonPortfolio
)
from .serializers import (
    StockSerializer, PortfolioSerializer, TransactionSerializer
)
from .utils import get_current_season

# ──────────────────────────────────────────────────────────────────────────────
# 경로/로거/캐시 파일
# ──────────────────────────────────────────────────────────────────────────────
APP_DIR = Path(__file__).resolve().parent
DATA_DIR = APP_DIR / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)

SP500_CACHE_PATH = DATA_DIR / "sp500_symbols.json"
SP500_NAME_CACHE_PATH = DATA_DIR / "sp500_name_map.json"

logger = logging.getLogger(__name__)

# ──────────────────────────────────────────────────────────────────────────────
# 공용 뷰
# ──────────────────────────────────────────────────────────────────────────────
class StockListView(generics.ListAPIView):
    queryset = Stock.objects.all().order_by('-date')[:500]
    serializer_class = StockSerializer
    permission_classes = [permissions.AllowAny]

class PortfolioPagination(PageNumberPagination):
    page_size = 10

class PortfolioView(ListAPIView):
    serializer_class = PortfolioSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = PortfolioPagination

    def get_queryset(self):
        league_id = self.request.query_params.get('league_id')
        qs = Portfolio.objects.filter(user=self.request.user)
        if league_id:
            qs = qs.filter(league_id=league_id)  # ✅ 리그 스코프
        return qs.order_by('-id')

# ──────────────────────────────────────────────────────────────────────────────
# 매수/매도
# ──────────────────────────────────────────────────────────────────────────────
class BuySellStockView(APIView):
    permission_classes = [IsAuthenticated]

    @db_tx.atomic
    def post(self, request):
        url_name = getattr(getattr(request, "resolver_match", None), "url_name", None)
        if url_name == 'buy':
            is_buy = True
        elif url_name == 'sell':
            is_buy = False
        else:
            is_buy = bool(request.data.get('is_buy', True))

        symbol = request.data.get('symbol')
        try:
            shares_int = int(request.data.get('shares'))
        except (TypeError, ValueError):
            shares_int = 0

        if not symbol or shares_int <= 0:
            return Response({'error': 'symbol/shares가 유효하지 않습니다.'}, status=status.HTTP_400_BAD_REQUEST)

        membership = (
            LeagueMembership.objects
            .select_related('league')
            .filter(user=request.user, is_active=True)
            .order_by('-joined_at')
            .first()
        )
        if not membership:
            return Response({'error': 'First, join the league.'}, status=status.HTTP_400_BAD_REQUEST)

        league = membership.league

        if hasattr(League, 'Status'):
            if league.status != League.Status.ACTIVE:
                return Response({'error': '리그가 아직 시작되지 않아 거래할 수 없습니다.'}, status=status.HTTP_400_BAD_REQUEST)
        else:
            if getattr(league, 'status', None) != "ACTIVE":
                return Response({'error': '리그가 아직 시작되지 않아 거래할 수 없습니다.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            stock = Stock.objects.filter(symbol=symbol).latest('date')
        except Stock.DoesNotExist:
            return Response({'error': 'Stock not found'}, status=status.HTTP_400_BAD_REQUEST)

        price = Decimal(str(stock.close))
        qty = Decimal(str(shares_int))

        if is_buy:
            total_cost = price * qty
            if Decimal(str(membership.cash_balance)) < total_cost:
                return Response({'error': 'Insufficient league cash'}, status=status.HTTP_400_BAD_REQUEST)

            try:
                pf = Portfolio.objects.select_for_update().get(
                    user=request.user, league=league, symbol=symbol
                )
                if getattr(pf, "stock_id", None) is None:
                    pf.stock = stock
                    pf.save(update_fields=["stock"])
            except Portfolio.DoesNotExist:
                pf = Portfolio(
                    user=request.user,
                    league=league,
                    symbol=symbol,
                    stock=stock,
                    shares=Decimal('0'),
                    average_price=Decimal('0'),
                )

            old_shares = Decimal(str(pf.shares))
            new_total_shares = old_shares + qty

            if new_total_shares <= 0:
                pf.shares = Decimal('0')
                pf.average_price = Decimal('0')
            else:
                old_cost = old_shares * Decimal(str(pf.average_price))
                pf.average_price = (old_cost + (qty * price)) / new_total_shares
                pf.shares = new_total_shares

            pf.save()

            membership.cash_balance = Decimal(str(membership.cash_balance)) - total_cost
            membership.save(update_fields=['cash_balance'])

        else:
            try:
                pf = Portfolio.objects.select_for_update().get(
                    user=request.user, league=league, symbol=symbol
                )
                if getattr(pf, "stock_id", None) is None:
                    pf.stock = stock
                    pf.save(update_fields=["stock"])
            except Portfolio.DoesNotExist:
                return Response({'error': 'You do not own this stock in this league'}, status=status.HTTP_400_BAD_REQUEST)

            if Decimal(str(pf.shares)) < qty:
                return Response({'error': 'Not enough shares'}, status=status.HTTP_400_BAD_REQUEST)

            total_revenue = price * qty
            remaining = Decimal(str(pf.shares)) - qty

            if remaining <= 0:
                pf.delete()
            else:
                pf.shares = remaining
                pf.save(update_fields=['shares'])

            membership.cash_balance = Decimal(str(membership.cash_balance)) + total_revenue
            membership.save(update_fields=['cash_balance'])

        Transaction.objects.create(
            user=request.user,
            league=league,
            symbol=symbol,
            side='BUY' if is_buy else 'SELL',
            shares=qty,
            price=price
        )

        return Response({
            'status': 'Transaction completed',
            'league_id': league.id,
            'action': 'buy' if is_buy else 'sell',
            'symbol': symbol,
            'shares': str(qty),
            'price': str(price),
            'cash_balance': str(membership.cash_balance),
        })

class TransactionHistoryView(generics.ListAPIView):
    serializer_class = TransactionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Transaction.objects.filter(user=self.request.user).order_by('-timestamp')

# ──────────────────────────────────────────────────────────────────────────────
# 이름 해석 유틸 (NEW)
# ──────────────────────────────────────────────────────────────────────────────
def load_sp500_name_map() -> dict:
    """
    위키피디아 표에서 (Symbol -> Security) 맵을 가져와 캐시.
    실패하면 캐시 파일이나 빈 dict 반환.
    """
    try:
        wiki_url = "https://en.wikipedia.org/wiki/List_of_S%26P_500_companies"
        headers = {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/119.0.0.0 Safari/537.36"
            )
        }
        resp = requests.get(wiki_url, headers=headers, timeout=10)
        resp.raise_for_status()
        tables = pd.read_html(resp.text, flavor="bs4")
        df = tables[0]

        sym_col, name_col = None, None
        for c in df.columns:
            lc = str(c).lower()
            if sym_col is None and lc in ("symbol", "ticker symbol", "ticker"):
                sym_col = c
            if name_col is None and lc in ("security", "company", "company name", "name"):
                name_col = c
        if sym_col is None:
            sym_col = df.columns[0]
        if name_col is None:
            name_col = df.columns[1]

        df[sym_col] = df[sym_col].astype(str).str.strip().str.upper().str.replace(".", "-", regex=False)
        df[name_col] = df[name_col].astype(str).str.strip()

        name_map = dict(zip(df[sym_col], df[name_col]))
        SP500_NAME_CACHE_PATH.write_text(json.dumps(name_map, ensure_ascii=False), encoding="utf-8")
        return name_map
    except Exception:
        try:
            if SP500_NAME_CACHE_PATH.exists():
                return json.loads(SP500_NAME_CACHE_PATH.read_text(encoding="utf-8"))
        except Exception:
            pass
        return {}

def safe_yf_company_name(symbol: str):
    """
    yfinance에서 '회사명' 추출을 최대한 안전하게 시도.
    우선 순위: shortName → longName → displayName
    실패 시 None.
    """
    try:
        t = yf.Ticker(symbol)
        getter = getattr(t, "get_info", None)
        if callable(getter):
            info = getter()
        else:
            info = getattr(t, "info", {}) or {}
        for key in ("shortName", "longName", "displayName"):
            val = info.get(key)
            if isinstance(val, str) and val.strip():
                return val.strip()
    except Exception:
        pass
    return None

def resolve_company_name(symbol: str, sp500_name_map: dict) -> str:
    """
    이름 해석 총합 라우터:
    1) (옵션) 위키 S&P500 맵
    2) yfinance get_info()
    3) 최종 폴백: symbol
    """
    if sp500_name_map and symbol in sp500_name_map:
        return sp500_name_map[symbol]
    yn = safe_yf_company_name(symbol)
    if yn:
        return yn
    return symbol

# ──────────────────────────────────────────────────────────────────────────────
# 심볼 수집/자동 업데이트
# ──────────────────────────────────────────────────────────────────────────────
def fetch_sp500_symbols():
    symbols = []
    try:
        if yf is not None and hasattr(yf, "tickers_sp500"):
            syms = yf.tickers_sp500()
            if isinstance(syms, (list, tuple)) and len(syms) >= 400:
                symbols = [
                    str(s).strip().upper().replace(".", "-")
                    for s in syms if s
                ]
                symbols = sorted(set(symbols))
                SP500_CACHE_PATH.write_text(json.dumps(symbols, ensure_ascii=False), encoding="utf-8")
                return symbols
    except Exception as e:
        logger.exception("yfinance.tickers_sp500() failed: %s", e)

    try:
        wiki_url = "https://en.wikipedia.org/wiki/List_of_S%26P_500_companies"
        headers = {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/119.0.0.0 Safari/537.36"
            )
        }
        resp = requests.get(wiki_url, headers=headers, timeout=10)
        resp.raise_for_status()

        tables = pd.read_html(resp.text, flavor="bs4")
        df = tables[0]
        col = None
        for c in df.columns:
            lc = str(c).lower()
            if lc in ("symbol", "ticker symbol", "ticker"):
                col = c
                break
        if col is None:
            col = df.columns[0]

        symbols = (
            df[col].astype(str)
                  .str.strip()
                  .str.upper()
                  .str.replace(".", "-", regex=False)
                  .tolist()
        )
        symbols = [s for s in symbols if s.isascii() and s.isupper() and 1 <= len(s) <= 8]
        if len(symbols) >= 400:
            symbols = sorted(set(symbols))
            SP500_CACHE_PATH.write_text(json.dumps(symbols, ensure_ascii=False), encoding="utf-8")
            return symbols
    except Exception as e:
        logger.exception("Wikipedia scrape failed: %s", e)

    try:
        if SP500_CACHE_PATH.exists():
            return json.loads(SP500_CACHE_PATH.read_text(encoding="utf-8"))
    except Exception as e:
        logger.exception("SP500 cache read failed: %s", e)

    return []

def update_market_if_missing():
    """
    오늘자 스냅샷이 없을 때만 업데이트 시도.
    실패해도 예외를 밖으로 던지지 않음(절대 500 방지).
    """
    try:
        korea_tz = pytz_tz('Asia/Seoul')
        today = dj_now().astimezone(korea_tz).date()

        if Stock.objects.filter(date=today).exists():
            return

        latest_symbols = fetch_sp500_symbols()
        if not latest_symbols:
            logger.warning("[AUTO UPDATE] No symbols fetched. Skip updating.")
            return

        try:
            existing_symbols = set(TrackedSymbol.objects.values_list('symbol', flat=True))
        except Exception:
            existing_symbols = set()

        new_symbols = set(latest_symbols) - existing_symbols
        if new_symbols:
            try:
                TrackedSymbol.objects.bulk_create([TrackedSymbol(symbol=s) for s in new_symbols], ignore_conflicts=True)
            except Exception as e:
                logger.warning("Bulk create TrackedSymbol failed: %s", e)

        all_symbols = sorted(set(latest_symbols).union(existing_symbols))

        # ✅ 이름 맵 준비 (한 번)
        sp500_name_map = load_sp500_name_map()

        for idx, symbol in enumerate(all_symbols):
            try:
                ticker = yf.Ticker(symbol)
                hist = ticker.history(period="2d", auto_adjust=False)
                if len(hist) < 2:
                    continue

                latest = hist.iloc[-1]
                previous = hist.iloc[-2]
                change = float(latest['Close']) - float(previous['Close'])
                percent_change = (change / float(previous['Close'])) * 100.0

                company_name = resolve_company_name(symbol, sp500_name_map)

                Stock.objects.update_or_create(
                    symbol=symbol,
                    date=today,
                    defaults={
                        'name': company_name,  # ✅ 항상 안전 해석기 사용
                        'close': float(latest['Close']),
                        'high': float(latest['High']),
                        'low': float(latest['Low']),
                        'volume': int(latest['Volume']) if not pd.isna(latest['Volume']) else 0,
                        'change': float(change),
                        'percent_change': float(percent_change),
                    }
                )
                if idx % 50 == 0:
                    logger.info("[AUTO UPDATE] %s / %s done", idx, len(all_symbols))
            except Exception as e:
                logger.warning("[AUTO UPDATE ERROR] %s: %s", symbol, e)
        return
    except Exception as e:
        logger.exception("update_market_if_missing fatal: %s", e)
        return

# ──────────────────────────────────────────────────────────────────────────────
# 수동 스냅샷 업데이트 (샘플 6종)  ← 이름 로직 반영
# ──────────────────────────────────────────────────────────────────────────────
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_market_data(request):
    sp500_symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'TSLA']
    korea_tz = pytz_tz('Asia/Seoul')
    today = dj_now().astimezone(korea_tz).date()

    sp500_name_map = load_sp500_name_map()

    for symbol in sp500_symbols:
        try:
            ticker = yf.Ticker(symbol)
            hist = ticker.history(period="2d")
            if len(hist) < 2:
                continue

            latest = hist.iloc[-1]
            previous = hist.iloc[-2]

            change = float(latest['Close']) - float(previous['Close'])
            percent_change = (change / float(previous['Close'])) * 100.0

            company_name = resolve_company_name(symbol, sp500_name_map)

            Stock.objects.update_or_create(
                symbol=symbol,
                date=today,
                defaults={
                    'name': company_name,  # ✅ 변경점
                    'close': float(latest['Close']),
                    'high': float(latest['High']),
                    'low': float(latest['Low']),
                    'volume': int(latest['Volume']) if not pd.isna(latest['Volume']) else 0,
                    'change': float(change),
                    'percent_change': float(percent_change),
                }
            )
        except Exception as e:
            logger.warning("Error updating %s: %s", symbol, e)
            continue

    return Response({'message': 'Market data updated'}, status=status.HTTP_200_OK)

# ──────────────────────────────────────────────────────────────────────────────
# 마켓 개요 / 상세
# ──────────────────────────────────────────────────────────────────────────────
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_market_overview(request):
    try:
        update_market_if_missing()
    except Exception as e:
        logger.warning("get_market_overview: auto update attempt raised but ignored: %s", e)

    latest_date = Stock.objects.order_by('-date').values_list('date', flat=True).first()
    if not latest_date:
        return Response({'error': 'No market data available'}, status=404)

    stocks = (
        Stock.objects
             .filter(date=latest_date)
             .values('symbol', 'name', 'close', 'high', 'low', 'volume')
    )
    return Response(list(stocks), status=200)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_stock_detail(request, symbol):
    korea_tz = pytz_tz('Asia/Seoul')
    today = dj_now().astimezone(korea_tz).date()
    try:
        stock = Stock.objects.get(symbol=symbol, date=today)
    except Stock.DoesNotExist:
        return Response({'error': 'Stock not found'}, status=404)

    return Response({
        'symbol': stock.symbol,
        'name': stock.name,
        'close': stock.close,
        'high': stock.high,
        'low': stock.low,
        'volume': stock.volume,
    })

# ──────────────────────────────────────────────────────────────────────────────
# 트랜잭션 히스토리 (페이지네이션)
# ──────────────────────────────────────────────────────────────────────────────
class TradeHistoryPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'

class TradeHistoryView(ListAPIView):
    serializer_class = TransactionSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = TradeHistoryPagination

    def get_queryset(self):
        user = self.request.user
        qs = Transaction.objects.filter(user=user)

        league_id = self.request.query_params.get('league_id')
        if league_id:
            qs = qs.filter(league_id=league_id)

        date_from = self.request.query_params.get('date_from')
        if date_from:
            qs = qs.filter(created_at__date__gte=date_from)

        date_to = self.request.query_params.get('date_to')
        if date_to:
            qs = qs.filter(created_at__date__lte=date_to)

        return qs.order_by('-created_at', '-id')

# ──────────────────────────────────────────────────────────────────────────────
# 시즌/포트폴리오/리더보드
# ──────────────────────────────────────────────────────────────────────────────
User = get_user_model()

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def season_users(request):
    my_mem = (
        LeagueMembership.objects
        .select_related('league')
        .filter(
            user=request.user,
            is_active=True,
            league__status__in=[League.Status.DRAFT, League.Status.ACTIVE],
        )
        .order_by('-joined_at')
        .first()
    )
    if not my_mem:
        return Response({"error": "First, join the league."}, status=400)

    my_league_id = my_mem.league_id

    member_user_ids = list(
        LeagueMembership.objects.filter(
            league_id=my_league_id,
            is_active=True,
        ).values_list('user_id', flat=True)
    )

    result = []
    for uid in member_user_ids:
        data, err, code = get_user_portfolio_data(user_id=int(uid), league_id=int(my_league_id))
        if err:
            continue
        result.append({
            "user_id": data["user_id"],
            "username": data["username"],
            "return_pct": data["return_pct"],
        })

    result.sort(key=lambda x: x["return_pct"], reverse=True)
    return Response(result)

def get_user_portfolio_data(user_id: int, league_id: int):
    User = get_user_model()

    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return None, {"error": "User not found"}, 404

    league = League.objects.filter(id=league_id).first()
    if not league:
        return None, {"error": "Invalid league"}, 400

    membership = LeagueMembership.objects.filter(user=user, league=league, is_active=True).first()
    if not membership:
        return None, {"error": "Not a member of this league"}, 404

    qs = Portfolio.objects.filter(user=user, league=league).select_related('stock')

    latest = (
        Stock.objects
        .filter(symbol__in=qs.values_list('stock__symbol', flat=True))
        .values('symbol').annotate(latest=Max('date'))
    )
    latest_map = {row['symbol']: row['latest'] for row in latest}

    holdings = []
    total_stock_value = Decimal('0')
    for h in qs:
        symbol = h.stock.symbol
        latest_date = latest_map.get(symbol)
        if latest_date:
            s = Stock.objects.filter(symbol=symbol, date=latest_date).first() or h.stock
        else:
            s = h.stock
        current_price = Decimal(str(s.close))
        evaluation = current_price * Decimal(str(h.shares))
        pnl = evaluation - (Decimal(str(h.average_price)) * Decimal(str(h.shares)))
        pnl_base = (Decimal(str(h.average_price)) * Decimal(str(h.shares)))
        pnl_pct = float((pnl / pnl_base * 100).quantize(Decimal('0.01'))) if pnl_base > 0 else 0.0

        total_stock_value += evaluation
        holdings.append({
            "symbol": symbol,
            "name": s.name,
            "quantity": float(h.shares),
            "avg_price": float(h.average_price),
            "current_price": float(current_price),
            "evaluation": float(evaluation),
            "pnl": float(pnl),
            "pnl_pct": pnl_pct,
        })

    starting_cash = Decimal(str(membership.starting_cash or 0))
    cash = Decimal(str(membership.cash_balance or 0))
    total_asset = cash + total_stock_value
    return_pct = float(((total_asset - starting_cash) / starting_cash * 100).quantize(Decimal('0.01'))) if starting_cash > 0 else 0.0

    data = {
        "user_id": user.id,
        "username": user.username,
        "league_id": league.id,
        "starting_cash": float(starting_cash),
        "cash": float(cash),
        "total_stock_value": float(total_stock_value),
        "total_asset": float(total_asset),
        "return_pct": return_pct,
        "holdings": holdings,
    }
    return data, None, 200

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_portfolio(request):
    membership = (
        LeagueMembership.objects
        .select_related('league')
        .filter(user=request.user, is_active=True)
        .order_by('-joined_at')
        .first()
    )
    if not membership:
        return Response({"error": "First, join the league."}, status=400)

    league_id = membership.league.id
    data, error, status_code = get_user_portfolio_data(user_id=request.user.id, league_id=int(league_id))
    if error:
        return Response(error, status=status_code)
    return Response(data, status=status_code)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_portfolio(request, user_id):
    membership = (
        LeagueMembership.objects
        .select_related('league')
        .filter(user=request.user, is_active=True)
        .first()
    )
    if not membership:
        return Response({"error": "First, join the league."}, status=400)

    data, error, status_code = get_user_portfolio_data(
        user_id=int(user_id),
        league_id=int(membership.league_id)
    )
    if error:
        return Response(error, status=status_code)
    return Response(data, status=status_code)

# ──────────────────────────────────────────────────────────────────────────────
# 시즌 초기화(관리자)
# ──────────────────────────────────────────────────────────────────────────────
@api_view(['POST'])
@permission_classes([IsAdminUser])
def initialize_season_and_portfolios(request):
    User = get_user_model()
    today = dj_now().date()

    Season.objects.filter(is_active=True).update(is_active=False)

    new_season = Season.objects.create(
        name=f"시즌 {today}",
        start_date=today,
        is_active=True
    )

    users = User.objects.all()
    created_users = []
    skipped_users = []

    for user in users:
        if SeasonPortfolio.objects.filter(user=user, season=new_season).exists():
            skipped_users.append(user.username)
            continue
        SeasonPortfolio.objects.create(
            user=user,
            season=new_season,
            starting_cash=1_000_000,
            cash=1_000_000,
            total_stock_value=0
        )
        created_users.append(user.username)

    return Response({
        "message": f"시즌 '{new_season.name}' 생성 완료",
        "created_users": created_users,
        "skipped_users": skipped_users,
    })

# ──────────────────────────────────────────────────────────────────────────────
# (옵션) 과거 name==symbol 레코드 백필 (관리자)
# ──────────────────────────────────────────────────────────────────────────────
@api_view(['POST'])
@permission_classes([IsAdminUser])
def backfill_stock_names(request):
    """
    name==symbol 인 레코드를 찾아 '회사명'으로 업데이트.
    최신/과거 관계없이 해당 symbol 전부 보정.
    """
    sp500_name_map = load_sp500_name_map()
    symbols = (
        Stock.objects
        .filter(name=F('symbol'))
        .values_list('symbol', flat=True)
        .distinct()
    )

    updated = 0
    for sym in symbols:
        new_name = resolve_company_name(sym, sp500_name_map)
        if not new_name or new_name == sym:
            continue
        cnt = Stock.objects.filter(symbol=sym, name=sym).update(name=new_name)
        updated += cnt

    return Response({"updated": updated}, status=200)

# backend/stocks/views.py (발췌/추가)
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .utils_yahoo import fetch_yahoo_key_stats, fetch_yahoo_profile

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def key_stats(request, symbol: str):
    """
    GET /api/stocks/key-stats/<symbol>/
    Detail Stock + 우상단 카드에 필요한 요약값들을 Yahoo에서 가져와 반환
    """
    try:
        data = fetch_yahoo_key_stats(symbol.upper())
        return Response(data)
    except Exception as e:
        return Response({"error": f"Failed to load Yahoo key stats: {e}"}, status=502)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def company_profile(request, symbol: str):
    """
    GET /api/stocks/company-profile/<symbol>/
    Overview(회사 개요) + 메타(섹터/산업/직원수/회계연도말) 반환
    프론트 기존 스키마 {profile, source}는 유지, 추가 필드는 선택적으로 사용 가능
    """
    try:
        data = fetch_yahoo_profile(symbol.upper())
        # 기존 프론트 호환을 위해 최소 필드만 우선 노출
        return Response({
            "profile": data.get("profile", ""),
            "source": data.get("source"),
            # 필요 시 프론트에서 아래 4개도 활용 가능
            "sector": data.get("sector"),
            "industry": data.get("industry"),
            "fullTimeEmployees": data.get("fullTimeEmployees"),
            "fiscalYearEnd": data.get("fiscalYearEnd"),
        })
    except Exception as e:
        return Response({"error": f"Failed to load Yahoo profile: {e}"}, status=502)


# backend/stocks/views.py
import html
import re
import requests
from django.http import JsonResponse
from xml.etree import ElementTree as ET

RSS_URL = "https://finance.yahoo.com/news/rssindex"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
}

def _strip_tags(s: str) -> str:
    return re.sub(r"<[^>]+>", "", s or "")

def _fetch_og_image(url: str) -> str:
    try:
        r = requests.get(url, headers=HEADERS, timeout=8)
        r.raise_for_status()
        m = re.search(r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)["\']', r.text, re.I)
        return m.group(1) if m else ""
    except Exception:
        return ""

def yahoo_top_news(request):
    """
    Yahoo Finance RSS에서 첫 기사를 안전하게 파싱해 반환.
    title / description(짧게) / link / image 를 담아 JSON 응답.
    """
    try:
        # 1) RSS 불러오기
        rs = requests.get(RSS_URL, headers=HEADERS, timeout=8)
        rs.raise_for_status()

        # 2) XML 파싱
        root = ET.fromstring(rs.content)
        # 네임스페이스 처리 (media:content 등)
        ns = {
            "media": "http://search.yahoo.com/mrss/",
            "content": "http://purl.org/rss/1.0/modules/content/"
        }

        # 3) 첫 item 추출
        # 보통 구조: rss/channel/item
        channel = root.find("channel")
        if channel is None:
            channel = root.find("./{*}channel")  # 방어적

        if channel is None:
            return JsonResponse({"error": "invalid rss format"}, status=502)

        item = channel.find("item")
        if item is None:
            # 혹시 item이 없으면 폴백
            return JsonResponse({
                "title": "Top stories on Yahoo Finance",
                "description": "최신 금융 헤드라인을 확인하세요.",
                "image": "",
                "url": "https://finance.yahoo.com/news/",
                "source": "Yahoo Finance",
            })

        title = (item.findtext("title") or "").strip()
        link = (item.findtext("link") or "").strip()

        # description/encoded 중 택1
        description = item.findtext("description") or ""
        encoded = item.find("{http://purl.org/rss/1.0/modules/content/}encoded")
        if encoded is not None and encoded.text:
            description = encoded.text

        description = html.unescape(_strip_tags(description)).strip()

        # 4) 이미지: media:content 또는 og:image 폴백
        image = ""
        media_content = item.find("media:content", ns) or item.find("{http://search.yahoo.com/mrss/}content")
        if media_content is not None:
            image = media_content.attrib.get("url", "") or ""

        if not image and link:
            image = _fetch_og_image(link)

        # 5) 길이 제한(프론트에서 다시 자르지만 서버도 안전하게 보정)
        short_desc = (description[:240] + "…") if len(description) > 240 else description

        return JsonResponse({
            "title": title,
            "description": short_desc,
            "image": image,
            "url": link or "https://finance.yahoo.com/news/",
            "source": "Yahoo Finance",
        })

    except Exception as e:
        # 완전 폴백
        return JsonResponse({
            "title": "Top stories on Yahoo Finance",
            "description": "최신 금융 헤드라인을 확인하세요.",
            "image": "",
            "url": "https://finance.yahoo.com/news/",
            "source": "Yahoo Finance",
            "error": str(e),
        }, status=502)

# backend/stocks/views.py
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Max
import random

from .models import Stock  # symbol, date, close 등 필드 존재 가정

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def tickerbar_random(request):
    """
    최신 date와 직전 date의 종가를 비교해 랜덤 10개 티커를 반환.
    응답: { items: [{sym, price, chg}], asof: 'YYYY-MM-DD' }
    sym: 티커
    price: 최신 종가
    chg: (latest - prev) / prev  (예: 0.0123 == +1.23%)
    """
    latest_date = Stock.objects.aggregate(m=Max('date'))['m']
    if not latest_date:
        return Response({"items": [], "asof": None})

    prev_date = Stock.objects.filter(date__lt=latest_date).aggregate(m=Max('date'))['m']

    # prev_date가 없을 수 있음(첫 스냅샷인 날)
    qs = Stock.objects.filter(date__in=[latest_date, prev_date] if prev_date else [latest_date]) \
                      .values('symbol', 'date', 'close')

    per_sym = {}
    for row in qs:
        sym = row['symbol']
        d = per_sym.setdefault(sym, {})
        if row['date'] == latest_date:
            d['last'] = row['close']
        elif prev_date and row['date'] == prev_date:
            d['prev'] = row['close']

    items = []
    for sym, v in per_sym.items():
        last = v.get('last')
        prev = v.get('prev')
        if last is None:
            continue
        if prev and prev != 0:
            chg = (last - prev) / prev
        else:
            chg = 0.0  # 직전 없음/0이면 0으로 처리(또는 제외 가능)
        items.append({
            "sym": sym,
            "price": round(float(last), 2),
            "chg": float(chg),
        })

    # 10개 랜덤 샘플 (10개 미만이면 있는 만큼)
    if len(items) > 10:
        items = random.sample(items, 10)

    return Response({"items": items, "asof": str(latest_date)})
