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

class TransactionSerializer(serializers.ModelSerializer):
    stock = StockSerializer()

    class Meta:
        model = Transaction
        fields = '__all__'
