# stocks/migrations/0012_add_symbol_and_backfill_portfolio.py
from django.db import migrations, models

def backfill_symbol_from_stock_id(apps, schema_editor):
    """
    stocks_portfolio 테이블에 symbol 컬럼을 채워 넣는다.
    - 만약 legacy 컬럼 stock_id가 남아 있으면 Stock.symbol을 조인해 채움.
    - SQLite에서도 동작하도록 raw SQL 사용.
    """
    conn = schema_editor.connection
    cursor = conn.cursor()

    # 컬럼 목록 확인
    cursor.execute("PRAGMA table_info(stocks_portfolio)")
    cols = [row[1] for row in cursor.fetchall()]

    # symbol이 방금 추가됐을 것이고, stock_id가 남아 있으면 백필
    if "stock_id" in cols:
        # stocks_stock.id -> stocks_stock.symbol 로 매핑하여 채움
        cursor.execute("""
            UPDATE stocks_portfolio AS p
            SET symbol = (
                SELECT s.symbol FROM stocks_stock AS s
                WHERE s.id = p.stock_id
            )
            WHERE (p.symbol IS NULL OR p.symbol = '')
        """)

    # symbol이 아직 비어있는 레코드는 안전하게 플레이스홀더로 채움(필요 시)
    cursor.execute("""
        UPDATE stocks_portfolio
        SET symbol = 'UNKNOWN'
        WHERE symbol IS NULL OR symbol = ''
    """)

def noop_reverse(apps, schema_editor):
    pass

class Migration(migrations.Migration):

    dependencies = [
        ('stocks', '0005_add_portfolio_league_nullable'),  # ← 직전 파일명/번호로 바꾸세요
    ]

    operations = [
        # 1) symbol 컬럼 추가 (nullable 허용 후 데이터 채움)
        migrations.AddField(
            model_name='portfolio',
            name='symbol',
            field=models.CharField(max_length=10, default='', blank=True),
        ),
        # 2) 데이터 백필
        migrations.RunPython(backfill_symbol_from_stock_id, noop_reverse),
        # 3) 이후 비어있지 않도록 제약 강화(원하면 null/blank 금지로 변경)
        migrations.AlterField(
            model_name='portfolio',
            name='symbol',
            field=models.CharField(max_length=10),
        ),
        # 4) 유니크 제약은 현재 모델에 이미 선언되어 있으니 DB에 반영됨
        #    (user, league, symbol) UniqueConstraint
    ]
