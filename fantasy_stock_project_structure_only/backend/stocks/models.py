from django.db import models
from django.conf import settings
from django.db import models
from accounts.models import CustomUser


class Stock(models.Model):
    symbol = models.CharField(max_length=10)
    name = models.CharField(max_length=100)
    close = models.DecimalField(max_digits=10, decimal_places=2)
    high = models.DecimalField(max_digits=10, decimal_places=2)
    low = models.DecimalField(max_digits=10, decimal_places=2)
    change = models.DecimalField(max_digits=10, decimal_places=2)
    percent_change = models.DecimalField(max_digits=6, decimal_places=2)
    volume = models.BigIntegerField()
    date = models.DateField()

    def __str__(self):
        return f"{self.symbol} - {self.date}"


class TrackedSymbol(models.Model):
    symbol = models.CharField(max_length=10, unique=True)

    def __str__(self):
        return self.symbol


from django.db import models
from django.conf import settings

class Portfolio(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    league = models.ForeignKey('leagues.League', on_delete=models.CASCADE, related_name='stock_portfolios', default=None)
    symbol = models.CharField(max_length=10)

    # ✅ 최소 추가: 최신 시세 스냅샷 참조용 FK (기존 DB에 stock_id가 존재하므로 정합)
    stock = models.ForeignKey('stocks.Stock', on_delete=models.PROTECT, null=True, blank=True, related_name='portfolios')

    shares = models.DecimalField(max_digits=20, decimal_places=6, default=0)
    average_price = models.DecimalField(max_digits=20, decimal_places=6, default=0)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'league', 'symbol'],
                name='uniq_user_league_symbol'
            )
        ]



class Transaction(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    league = models.ForeignKey('leagues.League', on_delete=models.CASCADE, related_name='stock_transactions', default=None)
    symbol = models.CharField(max_length=10, default='')
    side = models.CharField(max_length=4, choices=[('BUY','BUY'),('SELL','SELL')], default='')
    shares = models.DecimalField(max_digits=20, decimal_places=6)
    price = models.DecimalField(max_digits=20, decimal_places=6)
    created_at = models.DateTimeField(auto_now_add=True)

class Season(models.Model):
    name = models.CharField(max_length=100)
    start_date = models.DateField()
    end_date = models.DateTimeField(null=True, blank=True)  # ✅ null 허용
    is_active = models.BooleanField(default=False)

    def __str__(self):
        return self.name

class SeasonHistory(models.Model):
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    season_number = models.IntegerField()
    final_balance = models.FloatField()
    total_profit = models.FloatField()
    rank = models.IntegerField()

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Season {self.season_number} - {self.user.username} - Rank {self.rank}"

class SeasonPortfolio(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    season = models.ForeignKey(Season, on_delete=models.CASCADE)
    starting_cash = models.DecimalField(max_digits=20, decimal_places=2)
    cash = models.DecimalField(max_digits=20, decimal_places=2)
    total_stock_value = models.DecimalField(max_digits=20, decimal_places=2)

    def __str__(self):
        return f"{self.user.username} - {self.season.name}"

class LeagueBalance(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='league_balances')
    league = models.ForeignKey('leagues.League', on_delete=models.CASCADE, related_name='league_balances')
    cash = models.DecimalField(max_digits=20, decimal_places=2, default=0)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['user', 'league'], name='uniq_user_league_balance')
        ]

    def __str__(self):
        return f'{self.user.username}-{self.league_id}: {self.cash}'