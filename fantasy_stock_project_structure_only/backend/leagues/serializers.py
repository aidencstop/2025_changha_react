from rest_framework import serializers
from django.db.models import Count
from .models import League, LeagueMembership

class LeagueSerializer(serializers.ModelSerializer):
    current_members = serializers.SerializerMethodField()
    is_joinable = serializers.ReadOnlyField()

    class Meta:
        model = League
        fields = [
            "id", "name", "manager", "initial_cash", "max_members",
            "status", "created_at", "started_at", "ended_at",
            "current_members", "is_joinable"
        ]
        read_only_fields = ["manager", "status", "created_at", "started_at", "ended_at", "current_members", "is_joinable"]

    def get_current_members(self, obj):
        return obj.memberships.filter(is_active=True).count()

class LeagueCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = League
        fields = ["name", "initial_cash", "max_members"]

class LeagueMembershipSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = LeagueMembership
        fields = [
            "id", "username", "joined_at", "left_at", "is_active",
            "starting_cash", "cash_balance", "final_equity_value", "final_rank"
        ]