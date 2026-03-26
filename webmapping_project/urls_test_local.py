"""
Minimal URL configuration for isolated local test execution.

This avoids importing the full project URL module during tests, which keeps
local test startup focused on the Trail API routes under test.
"""

from django.urls import include, path


urlpatterns = [
    path("api/trails/", include(("trails_api.urls", "trails"), namespace="trails")),
]
