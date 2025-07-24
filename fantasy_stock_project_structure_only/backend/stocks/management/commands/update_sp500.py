# stocks/management/commands/update_sp500.py
from django.core.management.base import BaseCommand
from stocks.models import Stock, TrackedSymbol
from django.utils.timezone import now
from pytz import timezone
import yfinance as yf
import pandas as pd

def fetch_sp500_symbols():
    url = 'https://en.wikipedia.org/wiki/List_of_S%26P_500_companies'
    tables = pd.read_html(url)
    df = tables[0]
    symbols = df['Symbol'].tolist()
    return list(set(symbols))

def update_all_sp500_stocks():
    korea_tz = timezone('Asia/Seoul')
    today = now().astimezone(korea_tz).date()

    latest_symbols = fetch_sp500_symbols()
    existing_symbols = set(TrackedSymbol.objects.values_list('symbol', flat=True))
    new_symbols = set(latest_symbols) - existing_symbols
    TrackedSymbol.objects.bulk_create([TrackedSymbol(symbol=s) for s in new_symbols])
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

class Command(BaseCommand):
    help = 'Fetch S&P 500 stock list and update daily prices.'

    def handle(self, *args, **kwargs):
        update_all_sp500_stocks()
        self.stdout.write(self.style.SUCCESS("✅ S&P 500 data successfully updated"))
