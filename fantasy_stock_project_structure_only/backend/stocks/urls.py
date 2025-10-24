from django.urls import path
from .views import *
from . import views

urlpatterns = [
    path('list/', StockListView.as_view(), name='stock-list'),
    path('portfolio/', PortfolioView.as_view(), name='portfolio'),
    path('trade/', BuySellStockView.as_view(), name='trade'),
    path('history/', TransactionHistoryView.as_view(), name='history'),
    path('update/', views.update_market_data, name='update_market_data'),
    path('overview/', views.get_market_overview, name='get_market_overview'),
    path('detail/<str:symbol>/', views.get_stock_detail, name='get_stock_detail'),
    path('trade-history/', TradeHistoryView.as_view()),
    path('buy/', BuySellStockView.as_view(), name='buy'),
    path('sell/', BuySellStockView.as_view(), name='sell'),
    path('my-portfolio/', views.my_portfolio, name='my-portfolio'),
    path('season-users/', views.season_users, name='season-users'),
    path('user-portfolio/<int:user_id>/', views.user_portfolio, name='user-portfolio'),
    path('admin/init-season/', views.initialize_season_and_portfolios, name='init-season'),
    path("backfill-stock-names/", views.backfill_stock_names, name="backfill-stock-names"),  # POST, admin only
    path('company-profile/<str:symbol>/', views.company_profile),
    path('key-stats/<str:symbol>/', views.key_stats),
    path('news/yahoo-top/', views.yahoo_top_news, name='yahoo_top_news'),
    path('tickerbar/', views.tickerbar_random, name='tickerbar-random'),
]
