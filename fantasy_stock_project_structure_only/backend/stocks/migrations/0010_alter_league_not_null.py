# backend/stocks/migrations/0010_alter_league_not_null.py
from django.db import migrations, models
import django.db.models.deletion

def assert_no_nulls(apps, schema_editor):
    Transaction = apps.get_model('stocks', 'Transaction')
    Portfolio = apps.get_model('stocks', 'Portfolio')

    if Transaction.objects.filter(league__isnull=True).exists():
        raise RuntimeError("There are still Transaction rows with NULL league_id. Run 0009 backfill first or fix data.")
    if Portfolio.objects.filter(league__isnull=True).exists():
        raise RuntimeError("There are still Portfolio rows with NULL league_id. Run 0009 backfill first or fix data.")

class Migration(migrations.Migration):

    dependencies = [
        ('stocks', '0009_backfill_league_on_transaction_and_portfolio'),
    ]

    operations = [
        # 1) 남은 NULL 있으면 중단
        migrations.RunPython(assert_no_nulls, migrations.RunPython.noop),

        # 2) Transaction.league NOT NULL
        migrations.AlterField(
            model_name='transaction',
            name='league',
            field=models.ForeignKey(
                to='leagues.league',
                on_delete=django.db.models.deletion.CASCADE,
                null=False,
                blank=False,
            ),
        ),

        # 3) Portfolio.league NOT NULL
        migrations.AlterField(
            model_name='portfolio',
            name='league',
            field=models.ForeignKey(
                to='leagues.league',
                on_delete=django.db.models.deletion.CASCADE,
                related_name='stock_portfolios',
                null=False,
                blank=False,
            ),
        ),
    ]
