from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator

User = settings.AUTH_USER_MODEL

class League(models.Model):
    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"        # visible in Leagues list, joinable
        ACTIVE = "ACTIVE", "Active"      # hidden from Leagues list, trading ongoing
        ENDED = "ENDED", "Ended"        # historical only

    name = models.CharField(max_length=100, unique=True)
    manager = models.ForeignKey(User, on_delete=models.CASCADE, related_name="managed_leagues")
    initial_cash = models.DecimalField(max_digits=16, decimal_places=2, validators=[MinValueValidator(0)])
    max_members = models.PositiveIntegerField(validators=[MinValueValidator(2), MaxValueValidator(500)])

    status = models.CharField(max_length=10, choices=Status.choices, default=Status.DRAFT)
    created_at = models.DateTimeField(auto_now_add=True)
    started_at = models.DateTimeField(null=True, blank=True)
    ended_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.name} ({self.status})"

    @property
    def is_joinable(self):
        return self.status == League.Status.DRAFT and self.memberships.filter(is_active=True).count() < self.max_members



from django.db.models import Q
class LeagueMembership(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="league_memberships")
    league = models.ForeignKey(League, on_delete=models.CASCADE, related_name="memberships")
    joined_at = models.DateTimeField(auto_now_add=True)
    left_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)  # active member of this league (until leave/end)

    # Balance snapshot scoped to league lifecycle
    starting_cash = models.DecimalField(max_digits=16, decimal_places=2, default=0)
    cash_balance = models.DecimalField(max_digits=16, decimal_places=2, default=0)

    # Finalization fields when leaving mid-league or at league end
    final_equity_value = models.DecimalField(max_digits=16, decimal_places=2, null=True, blank=True)
    final_rank = models.PositiveIntegerField(null=True, blank=True)

    class Meta:
        constraints = [
            # 사용자별 활성 멤버십은 하나만 허용
            models.UniqueConstraint(
                fields=['user'],
                condition=Q(is_active=True),
                name='unique_active_membership_per_user',
            ),
        ]

    def __str__(self):
        return f"{self.user} in {self.league} (active={self.is_active})"