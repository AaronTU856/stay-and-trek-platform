# Stay & Trek

Stay & Trek is a Django and PostGIS web mapping project focused on walking trails in Ireland. The system has:

- a live web application at `stay-and-trek.com`
- a Django admin for data moderation
- a mobile app in `stay-and-trek-mobile/`
- a shared backend API used by both web and mobile

The live site uses the Squarespace domain `stay-and-trek.com` and the backend is deployed to Google Cloud.

## Main features

- trail browsing and filtering
- nearby accommodation linked to trails
- route generation between trails and accommodation
- weather lookups for trails and towns
- mobile trail description submission and admin moderation
- polygon-based town search in the advanced mapping section
- town analytics and dashboard reporting
- Django admin moderation and data management

## Main workflow

- `devtest` is used for testing work before deployment
- `dev` is the branch used for the cloud deployment workflow
- pushing to `dev` triggers the Google Cloud deployment flow
- the cloud web app, cloud admin, and cloud database should be treated as the main production system

## Project structure

- `webmapping_project/` Django project settings and URLs
- `trails_api/` main backend models, API views, serializers, filters, and admin
- `advanced_js_mapping/` advanced mapping section of the web app
- `dashboard/` analytics and dashboard pages
- `authentication/` login and signup views
- `stay-and-trek-mobile/` Expo / React Native mobile app
- `docker/` local Docker setup for Django, PostGIS, and nginx

## Local development

The local system runs with Docker.

```bash
docker compose up -d --build
docker compose exec web python manage.py migrate
docker compose exec web python manage.py collectstatic --noinput
```

Important:

- local Docker and cloud use different databases
- `127.0.0.1:8000/admin` is the local admin only
- changes seen in local admin are not the same as cloud admin unless the same action is repeated against the cloud system

## Cloud deployment

Deployment is handled through Google Cloud Build and Cloud Run.

- push code to `dev`
- Google Cloud Build builds, tests, and deploys the backend
- the deployed backend is used by the live website and cloud admin

## Database access

To connect to the cloud database locally, use the proxy:

```bash
./cloud-sql-proxy --address 0.0.0.0 --port 8080 long-octane-477515-k6:europe-west1:stay-trek-db
```

Current database access setup:

- `trek-local` in TablePlus for local Docker / local Postgres work
- `trek-cloud` in TablePlus for the cloud database

## Mobile workflow

The mobile app uses the same backend API as the web application.

For local API testing, the mobile app can point to the local Docker backend.

For cloud testing, the mobile app must point to the cloud API, not the local Docker API. The safest way is to start Expo with an explicit base URL:

```bash
EXPO_PUBLIC_API_BASE_URL=https://stay-and-trek-service-642845720185.europe-west1.run.app npx expo start
```

This avoids mixing local mobile submissions with the cloud admin or cloud database.

The main mobile features include:

- trail browsing
- trail detail views
- nearby accommodation along route
- weather display
- trail description submission for moderation

## Moderation workflow

Trail description moderation works like this:

1. A signed-in mobile user submits a trail description.
2. The trail status becomes `Pending`.
3. A moderator opens the trail in Django admin.
4. The moderator reviews the description and changes the status to `Verified`.
5. Saving the record completes the approval.

Notes:

- the admin status is `Verified`, not `Confirmed`
- the right-side status list in admin is only a filter
- approval is done from the trail change form

## Main technologies

- Django
- Django REST Framework
- GeoDjango
- PostgreSQL / PostGIS
- pgRouting
- Leaflet
- Expo / React Native
- Docker
- Google Cloud Run

## Submission note

For final verification, treat the cloud system as the source of truth:

- cloud mobile/API with cloud admin
- local mobile/API with local admin

Do not mix local admin and cloud mobile results when checking moderation or database updates.
