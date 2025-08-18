from rest_framework.exceptions import ValidationError
from .models import LeagueMembership, League

def get_current_league_or_error(user, *, for_trading=False):
    """
    for_trading=True면 '거래 가능 상태(= ACTIVE)'인지까지 검사.
    """
    membership = (
        LeagueMembership.objects
        .select_related('league')
        .filter(user=user, is_active=True)
        .order_by('-joined_at')
        .first()
    )
    if not membership:
        raise ValidationError("먼저 리그에 참여하세요.")

    league = membership.league

    if for_trading and league.status != League.Status.ACTIVE:
        # DRAFT/HIDDEN 등은 거래 불가
        raise ValidationError("리그가 아직 시작되지 않아 거래할 수 없습니다.")

    return league, membership
