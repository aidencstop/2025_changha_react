# stocks/admin.py
from django.contrib import admin
from django.db.models import Q
from .models import (
    Stock, TrackedSymbol, Portfolio, Transaction,
    Season, SeasonHistory, SeasonPortfolio, LeagueBalance
)

# --- 공통 헬퍼 ---
def _get_attr(obj, names, default=None):
    """여러 후보 필드명 중 존재하는 첫 값을 반환"""
    for n in names:
        if hasattr(obj, n):
            val = getattr(obj, n)
            if callable(val):
                try:
                    return val()
                except TypeError:
                    pass
            return val
    return default

# --- 커스텀 필터: 매수/매도 ---
class BuySellFilter(admin.SimpleListFilter):
    title = "Side"
    parameter_name = "side"

    def lookups(self, request, model_admin):
        return [("buy", "Buy"), ("sell", "Sell")]

    def queryset(self, request, queryset):
        v = self.value()
        if not v:
            return queryset
        model = queryset.model
        field_names = {f.name for f in model._meta.get_fields()}

        if "is_buy" in field_names:
            return queryset.filter(is_buy=(v == "buy"))

        if "side" in field_names:
            if v == "buy":
                return queryset.filter(Q(side__iexact="buy"))
            else:
                return queryset.filter(Q(side__iexact="sell"))

        return queryset

# --- Portfolio Admin ---
@admin.register(Portfolio)
class PortfolioAdmin(admin.ModelAdmin):
    def stock_display(self, obj):
        # Portfolio는 stock FK 없이 symbol(CharField) 사용
        return _get_attr(obj, ["symbol"], "-")
    stock_display.short_description = "Stock"

    def avg_price_display(self, obj):
        return _get_attr(obj, ["average_price", "avg_price"], "-")
    avg_price_display.short_description = "Avg Price"

    def shares_display(self, obj):
        return _get_attr(obj, ["shares", "quantity"], "-")
    shares_display.short_description = "Shares"

    list_display = ("user", "league", "stock_display", "shares_display", "avg_price_display")
    #list_filter = ("league",)
    show_full_result_count = True
    # ✅ 실제 존재하는 필드만 사용
    search_fields = ("user__username", "symbol")
    ordering = ("-id",)

# --- Transaction Admin ---
@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    def stock_display(self, obj):
        return _get_attr(obj, ["symbol"], "-")
    stock_display.short_description = "Stock"

    def side_display(self, obj):
        if hasattr(obj, "is_buy"):
            return "BUY" if obj.is_buy else "SELL"
        return _get_attr(obj, ["side"], "-")
    side_display.short_description = "Side"

    def created_display(self, obj):
        return _get_attr(obj, ["created_at", "timestamp", "executed_at"], "-")
    created_display.short_description = "Created"

    def qty_display(self, obj):
        return _get_attr(obj, ["shares", "quantity", "qty"], "-")
    qty_display.short_description = "Qty"

    def price_display(self, obj):
        return _get_attr(obj, ["price", "executed_price", "fill_price"], "-")
    price_display.short_description = "Price"

    list_display = ("user", "league", "stock_display", "qty_display", "price_display", "side_display", "created_display")
    list_filter = (BuySellFilter, "league")
    # ✅ 실제 존재하는 필드만 사용
    search_fields = ("user__username", "symbol")
    ordering = ("-id",)

# --- Stock Admin ---
@admin.register(Stock)
class StockAdmin(admin.ModelAdmin):
    list_display = ("symbol", "name", "date", "close", "change", "percent_change", "volume")
    list_filter = ("date",)
    search_fields = ("symbol", "name")
    ordering = ("-date", "symbol")

# --- TrackedSymbol Admin ---
@admin.register(TrackedSymbol)
class TrackedSymbolAdmin(admin.ModelAdmin):
    list_display = ("symbol",)
    search_fields = ("symbol",)
    ordering = ("symbol",)

# --- Season Admin ---
@admin.register(Season)
class SeasonAdmin(admin.ModelAdmin):
    list_display = ("name", "start_date", "end_date", "is_active")
    list_filter = ("is_active",)
    search_fields = ("name",)
    ordering = ("-is_active", "-start_date")

# --- SeasonHistory Admin ---
@admin.register(SeasonHistory)
class SeasonHistoryAdmin(admin.ModelAdmin):
    list_display = ("user", "season_number", "final_balance", "total_profit", "rank", "created_at")
    list_filter = ("season_number", "rank")
    search_fields = ("user__username",)
    ordering = ("-season_number", "rank")

# --- SeasonPortfolio Admin ---
@admin.register(SeasonPortfolio)
class SeasonPortfolioAdmin(admin.ModelAdmin):
    list_display = ("user", "season", "starting_cash", "cash", "total_stock_value")
    list_filter = ("season",)
    search_fields = ("user__username", "season__name")
    ordering = ("-id",)

# --- LeagueBalance Admin ---
@admin.register(LeagueBalance)
class LeagueBalanceAdmin(admin.ModelAdmin):
    list_display = ("user", "league", "cash")
    list_filter = ("league",)
    search_fields = ("user__username",)
    ordering = ("-id",)
