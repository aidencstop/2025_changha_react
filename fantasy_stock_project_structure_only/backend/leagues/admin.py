# backend/leagues/admin.py
from django.contrib import admin
from django.utils import timezone
from .models import League, LeagueMembership

class LeagueMembershipInline(admin.TabularInline):
    model = LeagueMembership
    fields = (
        "user", "is_active", "joined_at", "left_at",
        "starting_cash", "cash_balance",
        "final_equity_value", "final_rank",
    )
    readonly_fields = ("joined_at",)
    extra = 0
    autocomplete_fields = ("user",)

@admin.register(League)
class LeagueAdmin(admin.ModelAdmin):
    list_display = (
        "name", "status", "manager",
        "initial_cash", "max_members",
        "active_member_count", "is_joinable_display",
        "created_at", "started_at", "ended_at",
    )
    list_filter = ("status", "created_at", "started_at", "ended_at")
    search_fields = ("name", "manager__username", "manager__email")
    readonly_fields = ("created_at",)
    autocomplete_fields = ("manager",)
    inlines = [LeagueMembershipInline]

    @admin.display(description="Active Members")
    def active_member_count(self, obj):
        return obj.memberships.filter(is_active=True).count()

    @admin.display(boolean=True, description="Joinable")
    def is_joinable_display(self, obj):
        return obj.is_joinable

@admin.register(LeagueMembership)
class LeagueMembershipAdmin(admin.ModelAdmin):
    list_display = (
        "user", "league", "is_active",
        "joined_at", "left_at",
        "starting_cash", "cash_balance",
        "final_equity_value", "final_rank",
    )
    list_filter = ("is_active", "league__status", "league")
    search_fields = ("user__username", "user__email", "league__name")
    date_hierarchy = "joined_at"
    list_select_related = ("league", "user")
    autocomplete_fields = ("user", "league")

    actions = ["mark_inactive_now", "mark_active"]

    @admin.action(description="선택한 멤버십을 지금 비활성화 처리")
    def mark_inactive_now(self, request, queryset):
        queryset.update(is_active=False, left_at=timezone.now())

    @admin.action(description="선택한 멤버십을 활성화 처리")
    def mark_active(self, request, queryset):
        queryset.update(is_active=True)

