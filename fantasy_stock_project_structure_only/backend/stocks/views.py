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
        return Portfolio.objects.filter(user=self.request.user).order_by('-id')


class BuySellStockView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        symbol = request.data.get('symbol')
        shares = int(request.data.get('shares'))
        is_buy = request.data.get('is_buy', True)

        try:
            stock = Stock.objects.filter(symbol=symbol).latest('date')
        except Stock.DoesNotExist:
            return Response({'error': 'Stock not found'}, status=HTTP_400_BAD_REQUEST)

        price = stock.close
        user = request.user

        if is_buy:
            total_cost = price * shares
            if user.balance < total_cost:
                return Response({'error': 'Insufficient balance'}, status=HTTP_400_BAD_REQUEST)

            # ⚠️ 종목 중복 방지: symbol 기준으로 기존 포트폴리오 조회
            portfolio_qs = Portfolio.objects.filter(user=user, stock__symbol=symbol)
            if portfolio_qs.exists():
                portfolio = portfolio_qs.first()
                total_shares = portfolio.shares + shares
                portfolio.average_price = (
                    (portfolio.average_price * portfolio.shares + price * shares) / total_shares
                )
                portfolio.shares = total_shares
                portfolio.save()
            else:
                # 새로 생성 시 최신 날짜의 stock 객체 사용
                portfolio = Portfolio.objects.create(
                    user=user,
                    stock=stock,
                    shares=shares,
                    average_price=price
                )

            user.balance -= total_cost
            user.save()

        else:
            try:
                portfolio = Portfolio.objects.get(user=user, stock__symbol=symbol)
            except Portfolio.DoesNotExist:
                return Response({'error': 'You do not own this stock'}, status=HTTP_400_BAD_REQUEST)

            if portfolio.shares < shares:
                return Response({'error': 'Not enough shares'}, status=HTTP_400_BAD_REQUEST)

            total_revenue = price * shares
            portfolio.shares -= shares
            if portfolio.shares == 0:
                portfolio.delete()
            else:
                portfolio.save()

            user.balance += total_revenue
            user.save()

        # 거래 내역은 정확한 날짜의 stock 객체로 저장
        Transaction.objects.create(
            user=user, stock=stock, shares=shares, price=price, is_buy=is_buy
        )

        return Response({'status': 'Transaction completed'})


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

class TradeHistoryView(ListAPIView):
    serializer_class = TransactionSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = TradeHistoryPagination

    def get_queryset(self):
        return Transaction.objects.filter(user=self.request.user).order_by('-timestamp')

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
    print('ok')
    season = get_current_season()
    if not season:
        print('nooo')
        return Response({"error": "활성화된 시즌이 없습니다."}, status=404)

    portfolios = SeasonPortfolio.objects.filter(season=season)
    result = []

    for p in portfolios:
        profit = p.cash + p.total_stock_value - p.starting_cash
        return_pct = round((profit / p.starting_cash) * 100, 2)
        result.append({
            "user_id": p.user.id,
            "username": p.user.username,
            "return_pct": return_pct,
        })

    return Response(result)


def get_user_portfolio_data(user_id):
    print("yes")
    season = get_current_season()
    if not season:
        return None, {"error": "활성화된 시즌이 없습니다."}, 404

    try:
        sp = SeasonPortfolio.objects.get(user__id=user_id, season=season)
    except SeasonPortfolio.DoesNotExist:
        print("here")
        return None, {"error": "시즌 포트폴리오 없음"}, 404

    profit = sp.cash + sp.total_stock_value - sp.starting_cash
    return_pct = round((profit / sp.starting_cash) * 100, 2)

    holdings = []
    portfolio_qs = Portfolio.objects.filter(user__id=user_id)

    for h in portfolio_qs:
        stock = h.stock
        current_price = stock.close
        evaluation = current_price * h.shares
        pnl = evaluation - h.average_price * h.shares
        pnl_pct = round((pnl / (h.average_price * h.shares)) * 100, 2) if h.average_price > 0 else 0

        holdings.append({
            "symbol": stock.symbol,
            "name": stock.name,
            "quantity": h.shares,
            "avg_price": float(h.average_price),
            "current_price": float(current_price),
            "evaluation": float(evaluation),
            "pnl": float(pnl),
            "pnl_pct": pnl_pct,
        })

    data = {
        "user_id": sp.user.id,
        "username": sp.user.username,
        "total_asset": float(sp.cash + sp.total_stock_value),
        "starting_cash": float(sp.starting_cash),
        "return_pct": return_pct,
        "holdings": holdings,
    }

    return data, None, 200

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_portfolio(request):
    print('ok')
    data, error, status_code = get_user_portfolio_data(request.user.id)
    if error:
        print("error")
        return Response(error, status=status_code)
    return Response(data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_portfolio(request, user_id):

    data, error, status_code = get_user_portfolio_data(user_id)
    if error:
        return Response(error, status=status_code)
    return Response(data)

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