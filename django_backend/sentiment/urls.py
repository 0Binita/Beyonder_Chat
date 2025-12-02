# sentiment/urls.py
from django.urls import path
from .views import SentimentAPIView, ToxicityAPIView, EnhancedSentimentAPIView
from .analytics import ModelAnalyticsAPIView

urlpatterns = [
    path('analyze/', SentimentAPIView.as_view(), name='analyze-sentiment'),
    path('enhanced/', EnhancedSentimentAPIView.as_view(), name='enhanced-sentiment'),
    path('toxicity/', ToxicityAPIView.as_view(), name='analyze-toxicity'),
    path('analytics/', ModelAnalyticsAPIView.as_view(), name='model-analytics'),
]
