from rest_framework import serializers
from .models import Stock, Portfolio, Transaction

class StockSerializer(serializers.ModelSerializer):
    class Meta:
        model = Stock
        fields = '__all__'

class PortfolioSerializer(serializers.ModelSerializer):
    stock_symbol = serializers.CharField(source='stock.symbol')

    class Meta:
        model = Portfolio
        fields = ['stock_symbol', 'shares', 'average_price']

    def to_representation(self, instance):
        return {
            "stock_symbol": instance.stock.symbol,
            "quantity": instance.shares,
            "avg_buy_price": float(instance.average_price)
        }

from rest_framework import serializers
from .models import Transaction

class TransactionSerializer(serializers.ModelSerializer):
    # 프론트 호환: timestamp ↔ created_at
    timestamp = serializers.DateTimeField(source='created_at', read_only=True)
    # 프론트 호환: stock ↔ symbol
    stock = serializers.CharField(source='symbol', read_only=True)
    # 프론트 호환: quantity ↔ shares
    quantity = serializers.FloatField(source='shares', read_only=True)
    # 프론트 호환: action ↔ side ("BUY"/"SELL")
    action = serializers.CharField(source='side', read_only=True)

    class Meta:
        model = Transaction
        # 프론트가 기대할 법한 키들을 alias와 함께 모두 포함
        fields = [
            'id',
            'stock',      # alias -> symbol
            'symbol',
            'quantity',   # alias -> shares
            'shares',
            'price',
            'action',     # alias -> side
            'side',
            'timestamp',  # alias -> created_at
            'league',
        ]

