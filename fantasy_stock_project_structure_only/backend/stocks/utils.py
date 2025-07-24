# stocks/utils.py
import pandas as pd
from .models import Season

def fetch_sp500_symbols():
    url = 'https://en.wikipedia.org/wiki/List_of_S%26P_500_companies'
    tables = pd.read_html(url)
    df = tables[0]
    symbols = df['Symbol'].tolist()
    return list(set(symbols))  # 중복 제거


def get_current_season():
    from .models import Season
    return Season.objects.filter(is_active=True).order_by('-start_date').first()
