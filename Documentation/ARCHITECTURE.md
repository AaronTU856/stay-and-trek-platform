# Stay & Trek Architecture

## Purpose

This document gives contributors and reviewers a high-level view of the Stay & Trek system. It describes the existing application structure only; it does not prescribe or change runtime behaviour.

## System Context

```text
Web user ────── Django templates + Leaflet ─┐
                                             ├── Django application and REST/GeoJSON API ── PostgreSQL + PostGIS
Mobile user ── Expo / React Native client ──┘                         │
                                                                       └── Weather-data integration
```

## Components

| Component | Responsibility |
| --- | --- |
| `trails_api/` | Core domain models, spatial data access, serializers, API views, map assets and automated tests. |
| `advanced_js_mapping/` | Advanced spatial exploration and mapping interfaces. |
| `dashboard/` | Analytics and reporting views. |
| `authentication/` | Web authentication, registration and profile presentation. |
| `stay-and-trek-mobile/` | Expo / React Native companion client consuming the application API. |
| `webmapping_project/` | Django project-level configuration and routing. |
| `docker/` | Local container images and reverse-proxy support. |

## Data Flow

1. Users explore trail and accommodation data through the web map or mobile client.
2. Django handles application requests and exposes REST or GeoJSON responses where appropriate.
3. PostgreSQL with PostGIS stores geographic features and supports spatial filters such as radius and bounding-box search.
4. Leaflet renders geographic data in the browser; the mobile client consumes the same backend API.
5. Weather information is integrated into trip-planning views.

## Local Development

The documented Docker Compose workflow is the supported route for local setup. See the root [README](../README.md) for prerequisites, setup and test commands.

## Security Hygiene

Keep real credentials outside version control. Use local environment files for development and managed secrets for deployed environments. Before any production deployment, review authentication, authorisation, CSRF, host and HTTPS settings as part of a separate security review.
