from django.contrib import admin
from .models import Stock, Portfolio, Transaction

@admin.register(Stock)
class StockAdmin(admin.ModelAdmin):
    list_display = ('symbol', 'name', 'close', 'date')
    search_fields = ('symbol', 'name')

@admin.register(Portfolio)
class PortfolioAdmin(admin.ModelAdmin):
    list_display = ('user', 'stock', 'shares', 'average_price')

@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ('user', 'stock', 'shares', 'price', 'is_buy', 'timestamp')
    list_filter = ('is_buy', 'timestamp')
