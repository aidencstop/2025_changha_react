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

class Portfolio(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    stock = models.ForeignKey(Stock, on_delete=models.CASCADE)
    shares = models.IntegerField()
    average_price = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return f"{self.user.username} - {self.stock.symbol}"

class Transaction(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    stock = models.ForeignKey(Stock, on_delete=models.CASCADE)
    shares = models.IntegerField()
    price = models.DecimalField(max_digits=10, decimal_places=2)
    is_buy = models.BooleanField()
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        action = "Buy" if self.is_buy else "Sell"
        return f"{action} {self.shares} of {self.stock.symbol} by {self.user.username}"

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