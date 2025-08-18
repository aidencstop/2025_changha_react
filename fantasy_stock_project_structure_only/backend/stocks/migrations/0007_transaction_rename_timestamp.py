# backend/stocks/migrations/00xx_rename_timestamp.py
from django.db import migrations

class Migration(migrations.Migration):
    dependencies = [
        ('stocks', '0006_add_symbol_and_backfill_portfolio'),
    ]

    operations = [
        migrations.RenameField(
            model_name='transaction',
            old_name='timestamp',
            new_name='created_at',
        ),
    ]
