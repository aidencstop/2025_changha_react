from django.urls import path
from .views import RegisterView, LoginView, LogoutView, UserDetailView, profile_view, upload_avatar_view

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('me/', UserDetailView.as_view(), name='user-detail'),
    path('profile/', profile_view, name='accounts-profile'),  # ✅
    path('profile/avatar/', upload_avatar_view, name='profile-avatar'),
]
