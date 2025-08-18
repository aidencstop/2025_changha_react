# backend/stocks/migrations/0005_add_portfolio_league_nullable.py
from django.db import migrations, models
import django.db.models.deletion

class Migration(migrations.Migration):

    dependencies = [
        ("stocks", "0004_alter_season_end_date"),     # 예: "0004_auto_20250817_2310"
        ("leagues", "0001_initial"),                           # leagues 초기 마이그 이름 (다르면 실제 이름)
    ]

    operations = [
        migrations.AddField(
            model_name="portfolio",
            name="league",
            field=models.ForeignKey(
                to="leagues.league",
                on_delete=django.db.models.deletion.CASCADE,
                related_name="stock_portfolios",
                null=True,   # DB를 먼저 NULL 허용으로 열어둠
                blank=True,
            ),
        ),
    ]
