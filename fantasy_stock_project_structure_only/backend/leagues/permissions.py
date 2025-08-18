from rest_framework.permissions import BasePermission

class IsLeagueManager(BasePermission):
    def has_object_permission(self, request, view, obj):
        return obj.manager_id == request.user.id