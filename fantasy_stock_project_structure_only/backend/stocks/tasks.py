# stocks/tasks.py
from .models import Stock, TrackedSymbol
from .utils import fetch_sp500_symbols
from django.utils.timezone import now
from pytz import timezone
import yfinance as yf

def update_all_sp500_stocks():
    korea_tz = timezone('Asia/Seoul')
    today = now().astimezone(korea_tz).date()

    # 최신 S&P 500 종목
    latest_symbols = fetch_sp500_symbols()

    # 기존 저장된 심볼
    existing_symbols = set(TrackedSymbol.objects.values_list('symbol', flat=True))

    # 새 종목만 추가
    new_symbols = set(latest_symbols) - existing_symbols
    TrackedSymbol.objects.bulk_create([TrackedSymbol(symbol=s) for s in new_symbols])

    # 전체 심볼
    all_symbols = set(latest_symbols).union(existing_symbols)

    for symbol in all_symbols:
        try:
            ticker = yf.Ticker(symbol)
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
            print(f"[ERROR] {symbol}: {e}")
