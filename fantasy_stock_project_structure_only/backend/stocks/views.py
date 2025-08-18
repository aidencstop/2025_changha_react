from rest_framework import generics, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.status import HTTP_400_BAD_REQUEST
from django.utils import timezone
from .models import Stock, Portfolio, Transaction
from .serializers import StockSerializer, PortfolioSerializer, TransactionSerializer
from django.db.models import F
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.utils.timezone import now
from .models import Stock
import yfinance as yf
from datetime import datetime
from pytz import timezone
# 상단 import에 추가
from rest_framework.generics import ListAPIView
from rest_framework.pagination import PageNumberPagination
from .models import Transaction
from .serializers import TransactionSerializer
from .models import TrackedSymbol
import pandas as pd
import yfinance as yf
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


from django.shortcuts import get_object_or_404
from leagues.models import League
from .models import Stock, Portfolio, Transaction, LeagueBalance

from decimal import Decimal
from django.shortcuts import get_object_or_404
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.status import HTTP_400_BAD_REQUEST
from leagues.models import League, LeagueMembership
from .models import Stock, Portfolio, Transaction

from decimal import Decimal
from django.db import transaction
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.status import HTTP_400_BAD_REQUEST

from leagues.models import League, LeagueMembership
# from .models import Stock, Portfolio, Transaction  # 너의 기존 import 유지

from decimal import Decimal
from django.db import transaction
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.status import HTTP_400_BAD_REQUEST
# 필요 모델 임포트
# from .models import Stock, Portfolio, Transaction, LeagueMembership, League

from decimal import Decimal
from django.db import transaction
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.status import HTTP_400_BAD_REQUEST

from decimal import Decimal
from django.db import transaction as db_tx
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.status import HTTP_400_BAD_REQUEST

class BuySellStockView(APIView):
    permission_classes = [IsAuthenticated]

    @db_tx.atomic
    def post(self, request):
        # URL 이름으로 buy/sell 자동 판별
        url_name = getattr(getattr(request, "resolver_match", None), "url_name", None)
        if url_name == 'buy':
            is_buy = True
        elif url_name == 'sell':
            is_buy = False
        else:
            is_buy = bool(request.data.get('is_buy', True))

        # 입력 파라미터
        symbol = request.data.get('symbol')
        try:
            shares_int = int(request.data.get('shares'))
        except (TypeError, ValueError):
            shares_int = 0

        if not symbol or shares_int <= 0:
            return Response({'error': 'symbol/shares가 유효하지 않습니다.'}, status=HTTP_400_BAD_REQUEST)

        # 현재 참여 중인 리그
        membership = (
            LeagueMembership.objects
            .select_related('league')
            .filter(user=request.user, is_active=True)
            .order_by('-joined_at')
            .first()
        )
        if not membership:
            return Response({'error': '먼저 리그에 참여하세요.'}, status=HTTP_400_BAD_REQUEST)

        league = membership.league

        # 리그 상태 검사
        if hasattr(League, 'Status'):
            if league.status != League.Status.ACTIVE:
                return Response({'error': '리그가 아직 시작되지 않아 거래할 수 없습니다.'}, status=HTTP_400_BAD_REQUEST)
        else:
            if getattr(league, 'status', None) != "ACTIVE":
                return Response({'error': '리그가 아직 시작되지 않아 거래할 수 없습니다.'}, status=HTTP_400_BAD_REQUEST)

        # 최신 시세 스냅샷
        try:
            stock = Stock.objects.filter(symbol=symbol).latest('date')
        except Stock.DoesNotExist:
            return Response({'error': 'Stock not found'}, status=HTTP_400_BAD_REQUEST)

        price = Decimal(str(stock.close))
        qty = Decimal(str(shares_int))

        # ===== Portfolio는 symbol(CharField) 기준 =====
        if is_buy:
            total_cost = price * qty
            if Decimal(str(membership.cash_balance)) < total_cost:
                return Response({'error': 'Insufficient league cash'}, status=HTTP_400_BAD_REQUEST)

            # 보유 조회
            try:
                pf = Portfolio.objects.select_for_update().get(
                    user=request.user, league=league, symbol=symbol
                )
                # 과거 레코드에 stock FK가 비어 있는 경우 보정
                if getattr(pf, "stock_id", None) is None:
                    pf.stock = stock
                    pf.save(update_fields=["stock"])
            except Portfolio.DoesNotExist:
                # 새로 만들 때 FK 지정
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

            # 리그 현금 차감
            membership.cash_balance = Decimal(str(membership.cash_balance)) - total_cost
            membership.save(update_fields=['cash_balance'])

        else:
            # SELL: 보유 확인
            try:
                pf = Portfolio.objects.select_for_update().get(
                    user=request.user, league=league, symbol=symbol
                )
                # 비어있는 FK 보정
                if getattr(pf, "stock_id", None) is None:
                    pf.stock = stock
                    pf.save(update_fields=["stock"])
            except Portfolio.DoesNotExist:
                return Response({'error': 'You do not own this stock in this league'}, status=HTTP_400_BAD_REQUEST)

            if Decimal(str(pf.shares)) < qty:
                return Response({'error': 'Not enough shares'}, status=HTTP_400_BAD_REQUEST)

            total_revenue = price * qty
            remaining = Decimal(str(pf.shares)) - qty

            if remaining <= 0:
                pf.delete()
            else:
                pf.shares = remaining
                pf.save(update_fields=['shares'])

            # 리그 현금 증가
            membership.cash_balance = Decimal(str(membership.cash_balance)) + total_revenue
            membership.save(update_fields=['cash_balance'])

        # ===== 거래 내역 저장 (Transaction 스키마에 맞춤) =====
        Transaction.objects.create(
            user=request.user,
            league=league,
            symbol=symbol,                         # ✅ CharField
            side='BUY' if is_buy else 'SELL',      # ✅ choices: BUY/SELL
            shares=qty,                            # ✅ Decimal
            price=price                            # ✅ Decimal
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

    def get_queryset(self):
        return Transaction.objects.filter(user=self.request.user).order_by('-timestamp')

# ⚠️ yfinance 데이터 업데이트: 매일 전체 종목 Snapshot 저장
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_market_data(request):
    sp500_symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'TSLA']
    korea_tz = timezone('Asia/Seoul')
    today = now().astimezone(korea_tz).date()

    for symbol in sp500_symbols:
        try:
            ticker = yf.Ticker(symbol)
            hist = ticker.history(period="2d")  # 이전 종가와 비교를 위해 2일치 필요
            if len(hist) < 2:
                continue

            latest = hist.iloc[-1]
            previous = hist.iloc[-2]

            change = latest['Close'] - previous['Close']
            percent_change = (change / previous['Close']) * 100

            Stock.objects.update_or_create(
                symbol=symbol,
                date=today,
                defaults={
                    'name': ticker.info.get('shortName', symbol),
                    'close': latest['Close'],
                    'high': latest['High'],
                    'low': latest['Low'],
                    'volume': int(latest['Volume']),
                    'change': change,
                    'percent_change': percent_change,
                }
            )
        except Exception as e:
            print(f"Error updating {symbol}: {e}")
            continue

    return Response({'message': 'Market data updated'}, status=status.HTTP_200_OK)
def fetch_sp500_symbols():
    url = 'https://en.wikipedia.org/wiki/List_of_S%26P_500_companies'
    tables = pd.read_html(url)
    df = tables[0]
    return list(set(df['Symbol'].tolist()))

def update_market_if_missing():
    from django.utils.timezone import now
    from pytz import timezone
    korea_tz = timezone('Asia/Seoul')
    today = now().astimezone(korea_tz).date()
    print("update start")
    if not Stock.objects.filter(date=today).exists():
        latest_symbols = fetch_sp500_symbols()
        existing_symbols = set(TrackedSymbol.objects.values_list('symbol', flat=True))
        new_symbols = set(latest_symbols) - existing_symbols
        TrackedSymbol.objects.bulk_create([TrackedSymbol(symbol=s) for s in new_symbols])
        all_symbols = set(latest_symbols).union(existing_symbols)

        for idx, symbol in enumerate(all_symbols):
            try:
                ticker = yf.Ticker(symbol)
                print(idx, "/", len(all_symbols), ticker)
                hist = ticker.history(period="2d")
                if len(hist) < 2:
                    continue
                latest = hist.iloc[-1]
                previous = hist.iloc[-2]
                change = latest['Close'] - previous['Close']
                percent_change = (change / previous['Close']) * 100

                Stock.objects.update_or_create(
                    symbol=symbol,
                    date=today,
                    defaults={
                        'name': ticker.info.get('shortName', symbol),
                        'close': latest['Close'],
                        'high': latest['High'],
                        'low': latest['Low'],
                        'volume': int(latest['Volume']),
                        'change': change,
                        'percent_change': percent_change,
                    }
                )
            except Exception as e:
                print(f"[AUTO UPDATE ERROR] {symbol}: {e}")
# 🟢 S&P 500 마켓 개요 불러오기 (가장 최근 날짜 기준)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_market_overview(request):
    update_market_if_missing()  # ← 자동 업데이트 시도
    latest_date = Stock.objects.order_by('-date').values_list('date', flat=True).first()
    if not latest_date:
        return Response({'error': 'No market data available'}, status=404)

    stocks = Stock.objects.filter(date=latest_date).values(
        'symbol', 'name', 'close', 'high', 'low', 'volume'
    )
    return Response(list(stocks), status=200)


# 🔍 특정 종목 상세 (차트 X, 요약 정보)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_stock_detail(request, symbol):
    korea_tz = timezone('Asia/Seoul')
    today = now().astimezone(korea_tz).date()
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



class TradeHistoryPagination(PageNumberPagination):
    page_size = 10  # 페이지당 항목 수, 프론트 Infinite Scroll에서 유동적으로 조정 가능
    page_size_query_param = 'page_size'
class TradeHistoryView(ListAPIView):
    serializer_class = TransactionSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = TradeHistoryPagination

    # ... class TradeHistoryListView(generics.ListAPIView):
    def get_queryset(self):
        user = self.request.user
        qs = Transaction.objects.filter(user=user)

        # 선택: 리그별 상세 보기일 때 league_id로 제한
        league_id = self.request.query_params.get('league_id')
        if league_id:
            qs = qs.filter(league_id=league_id)

        # 선택: 날짜 필터가 있다면 created_at 기준으로
        date_from = self.request.query_params.get('date_from')
        if date_from:
            qs = qs.filter(created_at__date__gte=date_from)

        date_to = self.request.query_params.get('date_to')
        if date_to:
            qs = qs.filter(created_at__date__lte=date_to)

        return qs.order_by('-created_at', '-id')  # ← '-timestamp' → '-created_at'


from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from .models import SeasonPortfolio, Season, Portfolio, Stock
from .utils import get_current_season

User = get_user_model()

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def season_users(request):
    # 1) 내 활성 리그 (DRAFT/ACTIVE) 확정
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
        return Response({"error": "먼저 리그에 참여하세요."}, status=400)

    my_league_id = my_mem.league_id

    # 2) 같은 리그의 활성 멤버 사용자 id 집합
    member_user_ids = list(
        LeagueMembership.objects.filter(
            league_id=my_league_id,
            is_active=True,
        ).values_list('user_id', flat=True)
    )

    # 3) 각 멤버의 리그 기준 포트폴리오 수익률 계산
    result = []
    for uid in member_user_ids:
        data, err, code = get_user_portfolio_data(user_id=int(uid), league_id=int(my_league_id))
        if err:
            # 멤버십은 있는데 보유내역/현금이 없을 수도 있으니, 필요시 0%로 보정해도 됨
            # 여기서는 에러 항목은 건너뜀
            continue
        result.append({
            "user_id": data["user_id"],
            "username": data["username"],
            "return_pct": data["return_pct"],
        })

    # 4) 수익률 내림차순 정렬
    result.sort(key=lambda x: x["return_pct"], reverse=True)
    return Response(result)




# backend/stocks/views.py (현재 파일에 있는 동일 함수 이름을 대체)
from decimal import Decimal
from django.db.models import Max
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from leagues.models import League, LeagueMembership
# from .models import Portfolio, Stock  # 프로젝트 기존 import 유지

def get_user_portfolio_data(user_id: int, league_id: int):
    from django.contrib.auth import get_user_model
    User = get_user_model()

    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return None, {"error": "User not found"}, 404

    league = League.objects.filter(id=league_id).first()
    if not league:
        return None, {"error": "Invalid league"}, 400

    # ✅ 현재 리그 기준 활성 멤버십만 인정
    membership = LeagueMembership.objects.filter(user=user, league=league, is_active=True).first()
    if not membership:
        return None, {"error": "Not a member of this league"}, 404

    # 보유 목록(리그 스코프)
    qs = Portfolio.objects.filter(user=user, league=league).select_related('stock')

    # 각 심볼 최신 가격 스냅샷
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
    # ✅ 요청자의 현재 활성 리그 자동 판별
    membership = (
        LeagueMembership.objects
        .select_related('league')
        .filter(user=request.user, is_active=True)
        .order_by('-joined_at')
        .first()
    )
    if not membership:
        return Response({"error": "먼저 리그에 참여하세요."}, status=400)

    league_id = membership.league.id
    data, error, status_code = get_user_portfolio_data(user_id=request.user.id, league_id=int(league_id))
    if error:
        return Response(error, status=status_code)
    return Response(data, status=status_code)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_portfolio(request, user_id):
    # ✅ 요청자의 현재 활성 리그를 기준으로 타 유저 포트폴리오 조회
    membership = (
        LeagueMembership.objects
        .select_related('league')
        .filter(user=request.user, is_active=True)
        .first()
    )
    if not membership:
        return Response({"error": "먼저 리그에 참여하세요."}, status=400)

    data, error, status_code = get_user_portfolio_data(
        user_id=int(user_id),
        league_id=int(membership.league_id)  # 내 리그를 강제
    )
    if error:
        return Response(error, status=status_code)
    return Response(data, status=status_code)




from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser
from django.contrib.auth import get_user_model
from .models import Season, SeasonPortfolio
from django.utils.timezone import now

@api_view(['POST'])
@permission_classes([IsAdminUser])
def initialize_season_and_portfolios(request):
    User = get_user_model()
    today = now().date()

    # 1️⃣ 기존 시즌 비활성화
    Season.objects.filter(is_active=True).update(is_active=False)

    # 2️⃣ 새 시즌 생성
    new_season = Season.objects.create(
        name=f"시즌 {today}",
        start_date=today,
        is_active=True
    )

    # 3️⃣ 모든 유저에 대해 SeasonPortfolio 생성 (중복 방지)
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