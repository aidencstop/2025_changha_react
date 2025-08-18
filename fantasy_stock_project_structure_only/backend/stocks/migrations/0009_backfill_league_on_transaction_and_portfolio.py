# backend/stocks/migrations/0009_backfill_league_on_transaction_and_portfolio.py
from django.db import migrations

def _pick_membership(LeagueMembership, user_id):
    """
    우선순위:
    1) is_active=True 중 가장 최근 가입
    2) 전체 중 가장 최근 가입
    """
    lm = (LeagueMembership.objects
          .filter(user_id=user_id, is_active=True)
          .order_by('-joined_at')
          .first())
    if lm is None:
        lm = (LeagueMembership.objects
              .filter(user_id=user_id)
              .order_by('-joined_at')
              .first())
    return lm

def backfill_league_on_tx_and_portfolio(apps, schema_editor):
    Transaction = apps.get_model('stocks', 'Transaction')
    Portfolio = apps.get_model('stocks', 'Portfolio')
    LeagueMembership = apps.get_model('leagues', 'LeagueMembership')

    # ----- Transaction.league 백필 -----
    tx_qs = Transaction.objects.filter(league__isnull=True)
    tx_fixed = 0
    for t in tx_qs.iterator():
        lm = _pick_membership(LeagueMembership, t.user_id)
        if lm:
            t.league_id = lm.league_id
            t.save(update_fields=['league'])
            tx_fixed += 1
    # print(f"Backfilled league on {tx_fixed} transactions")

    # ----- Portfolio.league 백필 -----
    pf_qs = Portfolio.objects.filter(league__isnull=True)
    pf_fixed, pf_removed = 0, 0
    for p in pf_qs.iterator():
        lm = _pick_membership(LeagueMembership, p.user_id)
        if lm:
            p.league_id = lm.league_id
            p.save(update_fields=['league'])
            pf_fixed += 1
        else:
            # 멤버십이 전혀 없는 고아 데이터는 삭제(운영 정책에 맞게 조정 가능)
            p.delete()
            pf_removed += 1
    # print(f"Backfilled league on {pf_fixed} portfolios, removed {pf_removed} without membership")

class Migration(migrations.Migration):

    dependencies = [
        ('stocks', '0008_leaguebalance_remove_transaction_is_buy_and_more'),
        # 예: ('leagues', '0005_auto_20250818_1234')
        ('leagues', '0002_alter_leaguemembership_options_and_more'),
    ]

    operations = [
        migrations.RunPython(backfill_league_on_tx_and_portfolio, migrations.RunPython.noop),
    ]
