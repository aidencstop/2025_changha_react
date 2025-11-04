from django.contrib import admin
from django.urls import path, include
from django.views.generic import TemplateView
from django.http import JsonResponse
from django.conf import settings
from django.conf.urls.static import static

def health_root(request):
    return JsonResponse({"status": "ok", "app": "FantasyStock API", "time": "server"})

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/accounts/', include('accounts.urls')),
    path('api/stocks/', include('stocks.urls')),
    path('api/leagues/', include('leagues.urls')),
    path("", health_root),  # 루트는 간단한 JSON

]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
