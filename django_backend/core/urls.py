from django.contrib import admin
from django.urls import path, include  # ✅ include is required to include app URLs

urlpatterns = [
    path('admin/', admin.site.urls),

    # ✅ Include the sentiment app's URL patterns
    path('api/sentiment/', include('sentiment.urls')),
]
