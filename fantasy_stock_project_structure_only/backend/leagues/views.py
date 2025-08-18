from django.utils import timezone
from django.db import transaction as db_tx
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import League, LeagueMembership
from .serializers import LeagueSerializer, LeagueCreateSerializer, LeagueMembershipSerializer
from .permissions import IsLeagueManager

# Helper: Check if user is already in any join-blocking league (draft/active)

def _user_in_blocking_league(user):
    return LeagueMembership.objects.filter(user=user, is_active=True, league__status__in=[League.Status.DRAFT, League.Status.ACTIVE]).exists()

from django.db.models import Count, Max
from django.utils.timezone import now
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import League, LeagueMembership
from .serializers import LeagueSerializer, LeagueCreateSerializer
from .permissions import IsLeagueManager
from django.db import transaction as db_tx

# 외부 앱
from stocks.models import Transaction, Stock


class LeagueListCreateView(generics.GenericAPIView):
    print('yes')
    permission_classes = [IsAuthenticated]

    def _league_participant_count(self, league):
        return LeagueMembership.objects.filter(league=league).count()

    def _get_initial_cash(self, user, league):
        """
        초기자산 결정 로직:
        1) LeagueMembership.starting_cash 사용
        2) 없으면 League의 starting_cash / initial_cash 필드가 있으면 사용
        3) 둘 다 없으면 None
        """
        lm = LeagueMembership.objects.filter(user=user, league=league).first()
        if lm and getattr(lm, "starting_cash", None) not in (None, ""):
            return float(lm.starting_cash)

        # 리그 모델에 있는 필드명 대응(있을 수도/없을 수도 있음)
        for f in ("starting_cash", "initial_cash", "start_cash"):
            if hasattr(league, f):
                val = getattr(league, f)
                if val is not None:
                    return float(val)

        return None

    def _evaluation_date(self, league):
        """
        평가 기준일:
        - 종료된 리그: league.end_date
        - 진행 중: Stock 데이터의 최신 일자
        """
        if getattr(league, "end_date", None):
            return league.end_date
        latest = Stock.objects.aggregate(latest=Max("date"))["latest"]
        return latest

    def _iter_league_transactions(self, user, league, eval_date):
        """
        리그 거래 조회:
        - Transaction에 league FK가 있으면 그걸로 필터
        - 없으면 날짜 범위로 필터: [league.started_at, eval_date] (started_at는 필수라고 가정)
        """
        # 1) league FK가 있는 경우
        if hasattr(Transaction, "league"):
            qs = Transaction.objects.filter(user=user, league=league).order_by("created_at", "id")
            # eval_date가 주어지면 해당 날짜까지 컷
            if eval_date:
                qs = qs.filter(created_at__date__lte=eval_date)
            return qs

        # 2) league FK가 없으면 날짜 범위로 근사
        start_dt = getattr(league, "started_at", None)
        end_dt = getattr(league, "ended_at", None)

        qs = Transaction.objects.filter(user=user)

        if start_dt:
            start_val = start_dt.date() if hasattr(start_dt, "date") else start_dt
            qs = qs.filter(created_at__date__gte=start_val)

        # eval_date가 있으면 그 날짜까지 제한
        if eval_date:
            qs = qs.filter(created_at__date__lte=eval_date)

        # ended_at이 있다면 종료일까지 제한(있다면 eval_date와 중복 제한되어도 문제 없음)
        if end_dt:
            end_val = end_dt.date() if hasattr(end_dt, "date") else end_dt
            qs = qs.filter(created_at__date__lte=end_val)

        return qs.order_by("created_at", "id")

    def _price_on_or_before(self, symbol, ref_date):
        """
        ref_date 당일 가격이 없으면, 그 이전 가장 가까운 날짜의 close 가격 사용.
        없으면 0.0
        """
        if not ref_date:
            # 최신 스냅샷
            latest = Stock.objects.filter(symbol=symbol).order_by("-date").first()
            return float(latest.close) if latest else 0.0

        s = (
            Stock.objects
            .filter(symbol=symbol, date__lte=ref_date)
            .order_by("-date")
            .first()
        )
        return float(s.close) if s else 0.0

    def _compute_final_asset(self, user, league):
        """
        초기자산 + 거래기반 현금흐름 + 평가액으로 최종자산 계산
        """
        initial_cash = self._get_initial_cash(user, league)
        eval_date = self._evaluation_date(league)

        # 초기자산이 정의되지 않았다면 계산 불가 처리
        if initial_cash in (None,):
            return None, None, None

        # 1) 거래 반영: 현금/보유수량
        cash = float(initial_cash)
        position = {}  # symbol -> shares (정수/실수)

        tx_qs = self._iter_league_transactions(user, league, eval_date)
        for tx in tx_qs:
            sym = tx.symbol
            qty = float(tx.shares)
            price = float(tx.price)
            action = (tx.side or "").upper()  # side 필드 ("BUY"/"SELL")

            if action == "BUY":
                cash -= qty * price
                position[sym] = position.get(sym, 0.0) + qty
            elif action == "SELL":
                cash += qty * price
                position[sym] = position.get(sym, 0.0) - qty

        # 2) 평가액(심볼별 보유잔량 * 평가가격)
        equity = 0.0
        for sym, shares in position.items():
            if abs(shares) < 1e-12:
                continue
            px = self._price_on_or_before(sym, eval_date)
            equity += shares * px

        final_asset = cash + equity

        # 3) 수익률
        ret_pct = None
        if initial_cash not in (None, 0):
            ret_pct = ((final_asset - float(initial_cash)) / float(initial_cash)) * 100.0

        return initial_cash, final_asset, ret_pct

    def _compute_rank(self, league):
        """
        리그 내 모든 참가자에 대해 최종자산 계산하여 등수 산출.
        계산 불가(None)인 경우는 꼬리로 밀림.
        """
        members = LeagueMembership.objects.filter(league=league).select_related("user")
        rows = []
        for m in members:
            init_cash, fin_asset, _ = self._compute_final_asset(m.user, league)
            # None은 가장 뒤로 정렬되도록 키 구성
            sort_key = (0, fin_asset) if fin_asset is not None else (1, float("-inf"))
            rows.append((m.user_id, fin_asset, sort_key))

        # final_asset 내림차순, None은 뒤
        rows.sort(key=lambda x: x[2], reverse=True)

        # user_id -> rank 매핑
        rank_map = {}
        rank = 1
        for uid, fin_asset, _ in rows:
            rank_map[uid] = rank
            rank += 1
        return rank_map

    def get(self, request):
        """
        기본: 합류 가능한 리그(DRAFT)만 리턴 (기존 유지)
        ?mine=1: 내가 속했던 모든 리그 + 내 성적 요약(참가자수/초기/최종/수익률/등수)
        """
        mine = request.query_params.get("mine")
        if str(mine).lower() in ("1", "true", "yes"):
            leagues_qs = (
                League.objects
                .filter(memberships__user=request.user)  # ← 역참조 이름 수정
                .distinct()
                .order_by("-started_at", "-id")  # ← 필드명 수정
            )

            data = []
            for lg in leagues_qs:
                participant_count = self._league_participant_count(lg)

                # 내 성적 계산
                my_initial, my_final, my_ret = self._compute_final_asset(request.user, lg)

                # 등수 계산 (비용이 들지만 정확)
                rank_map = self._compute_rank(lg)
                my_rank = rank_map.get(request.user.id)

                data.append({
                    "id": lg.id,
                    "name": getattr(lg, "name", None),
                    "status": getattr(lg, "status", None),
                    # 프론트 키는 유지하되 실제 필드는 started_at/ended_at 사용
                    "start_date": getattr(lg, "started_at", None),
                    "end_date": getattr(lg, "ended_at", None),

                    "participant_count": participant_count,
                    "my_initial_asset": my_initial,
                    "my_final_asset": my_final,
                    "my_return_pct": my_ret,
                    "my_final_rank": my_rank,
                })

            return Response(data)

        # 기존: 합류 가능한 리그(DRAFT)만
        leagues = League.objects.filter(status=League.Status.DRAFT)
        data = LeagueSerializer(leagues, many=True).data
        return Response(data)

    def post(self, request):
        # Create a league (기존 유지)
        if _user_in_blocking_league(request.user):
            return Response({"detail": "You are already in a league."}, status=status.HTTP_400_BAD_REQUEST)
        ser = LeagueCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        with db_tx.atomic():
            league = League.objects.create(
                manager=request.user,
                **ser.validated_data
            )
            # Manager auto-join
            LeagueMembership.objects.create(
                user=request.user,
                league=league,
                starting_cash=0,
                cash_balance=0,
            )
        return Response(LeagueSerializer(league).data, status=status.HTTP_201_CREATED)

class MyLeagueView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        membership = LeagueMembership.objects.filter(user=request.user, is_active=True, league__status__in=[League.Status.DRAFT, League.Status.ACTIVE]).select_related("league").first()
        if not membership:
            return Response({"in_league": False})
        league = membership.league
        payload = {
            "in_league": True,
            "league": LeagueSerializer(league).data,
            "members": LeagueMembershipSerializer(league.memberships.filter(is_active=True), many=True).data,
            "is_manager": league.manager_id == request.user.id,
        }
        return Response(payload)

class JoinLeagueView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, league_id: int):
        league = League.objects.filter(id=league_id).first()
        if not league or league.status != League.Status.DRAFT:
            return Response({"detail": "League not joinable."}, status=status.HTTP_400_BAD_REQUEST)

        # 한 리그만 소속 가능(다른 DRAFT/ACTIVE 리그 소속이면 차단)
        if _user_in_blocking_league(request.user):
            return Response({"detail": "You are already in a league."}, status=status.HTTP_400_BAD_REQUEST)

        # 수용 인원 체크 (재활성화든 신규든 '활성 멤버'가 1명 늘어남)
        if league.memberships.filter(is_active=True).count() >= league.max_members:
            return Response({"detail": "League is full."}, status=status.HTTP_400_BAD_REQUEST)

        # 기존 멤버십이 있는지 확인 (inactive로 남아있을 수 있음)
        membership = LeagueMembership.objects.filter(user=request.user, league=league).first()
        if membership:
            if membership.is_active:
                return Response({"detail": "Already in this league."}, status=status.HTTP_200_OK)
            # ✅ 시작 전(DRAFT)이므로 재입장 허용: 재활성화
            membership.is_active = True
            membership.left_at = None
            membership.save(update_fields=["is_active", "left_at"])
            return Response({"detail": "Rejoined."}, status=status.HTTP_200_OK)
        else:
            # 신규 참가
            LeagueMembership.objects.create(user=request.user, league=league)
            return Response({"detail": "Joined."}, status=status.HTTP_200_OK)

class LeaveLeagueView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, league_id: int):
        membership = LeagueMembership.objects.filter(user=request.user, league_id=league_id, is_active=True).select_related("league").first()
        if not membership:
            return Response({"detail": "Not a member."}, status=status.HTTP_400_BAD_REQUEST)
        league = membership.league
        now = timezone.now()

        # TODO: compute current equity if ACTIVE (cash + holdings MV)
        # For now, when ACTIVE we freeze cash_balance as final_equity_value placeholder
        if league.status == League.Status.ACTIVE:
            membership.final_equity_value = membership.cash_balance  # will replace with cash + MV
        membership.left_at = now
        membership.is_active = False
        membership.save(update_fields=["final_equity_value", "left_at", "is_active"])
        return Response({"detail": "Left the league."})

class StartLeagueView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, league_id: int):
        league = League.objects.filter(id=league_id).first()
        if not league:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        if league.manager_id != request.user.id:
            return Response({"detail": "Only manager can start."}, status=status.HTTP_403_FORBIDDEN)
        if league.status != League.Status.DRAFT:
            return Response({"detail": "League already started or ended."}, status=status.HTTP_400_BAD_REQUEST)
        with db_tx.atomic():
            now = timezone.now()
            league.status = League.Status.ACTIVE
            league.started_at = now
            league.save(update_fields=["status", "started_at"])
            # Seed balances for all active members
            for m in league.memberships.filter(is_active=True):
                m.starting_cash = league.initial_cash
                m.cash_balance = league.initial_cash
                m.save(update_fields=["starting_cash", "cash_balance"])
            # NOTE: In the next step, we'll also clear/create league-scoped portfolios & transactions
        return Response({"detail": "League started."}, status=status.HTTP_200_OK)

class EndLeagueView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, league_id: int):
        league = League.objects.filter(id=league_id).first()
        if not league:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        if league.manager_id != request.user.id:
            return Response({"detail": "Only manager can end."}, status=status.HTTP_403_FORBIDDEN)
        if league.status != League.Status.ACTIVE:
            return Response({"detail": "League is not active."}, status=status.HTTP_400_BAD_REQUEST)

        # TODO: compute final equity for each active member (cash + holdings MV) and assign ranks
        with db_tx.atomic():
            now = timezone.now()
            # Placeholder: use cash_balance as final_equity_value until trading integration
            active_members = list(league.memberships.filter(is_active=True))
            # Rank by cash_balance desc
            active_members.sort(key=lambda m: (m.cash_balance, ), reverse=True)
            for rank, m in enumerate(active_members, start=1):
                m.final_equity_value = m.cash_balance
                m.final_rank = rank
                m.is_active = False
                m.left_at = now
                m.save(update_fields=["final_equity_value", "final_rank", "is_active", "left_at"])

            league.status = League.Status.ENDED
            league.ended_at = now
            league.save(update_fields=["status", "ended_at"])
        return Response({"detail": "League ended."}, status=status.HTTP_200_OK)