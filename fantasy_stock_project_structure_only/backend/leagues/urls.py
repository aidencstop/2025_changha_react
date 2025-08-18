from django.urls import path
from . import views

urlpatterns = [
    path("", views.LeagueListCreateView.as_view(), name="league-list-create"),
    path("my/", views.MyLeagueView.as_view(), name="my-league"),
    path("<int:league_id>/join/", views.JoinLeagueView.as_view(), name="league-join"),
    path("<int:league_id>/leave/", views.LeaveLeagueView.as_view(), name="league-leave"),
    path("<int:league_id>/start/", views.StartLeagueView.as_view(), name="league-start"),
    path("<int:league_id>/end/", views.EndLeagueView.as_view(), name="league-end"),
]