# Local web development

Use Docker Desktop with Compose from the repository root. These instructions
are for the web application; mobile development is deferred.

## First checkout

```sh
git clone https://github.com/AaronTU856/stay-and-trek-platform.git
cd stay-and-trek-platform
git switch dev
cp .env.example .env
openssl rand -hex 32
```

Put the generated value in `.env` as `SECRET_KEY` and choose a local
`POSTGRES_PASSWORD`. Do not overwrite an existing `.env`; compare it with the
example instead. `.env` is ignored by Git. No Google Cloud credentials or
production database password are needed.

Compose explicitly selects database `stayandtrek` on `db:5432`, uses `DEBUG=1`,
and passes only the listed settings to Django. It does not import production
switches such as `ACTIVE_DB`, `K_SERVICE` or `USE_CLOUD_PROXY` from `.env`.
The database is accessible from the host on port 5444. Existing Compose
container names and ports must be free; stop another checkout's stack before
starting this one.

## Start and initialise

```sh
docker compose up -d --build db
docker compose run --rm web python manage.py migrate
docker compose run --rm web python manage.py createsuperuser
docker compose up -d web nginx
```

The web container waits for the database health check. Migrations are explicit;
startup only collects static assets and starts Django. `createsuperuser` prompts
for a local username and password. Production admin credentials are separate.

Open http://127.0.0.1:8000/ and http://127.0.0.1:8000/admin/.
Nginx is also available on http://127.0.0.1/.

A fresh database is empty. Create small development records through local admin
as needed; missing trail/accommodation data is not evidence of a failed install.
For a verified, separate sandbox with fictional records, use the demo stack
below. Do not restore production data for local setup.

Weather requires an optional development `OPENWEATHERMAP_API_KEY`. CARTO tiles
may show a watermark without a valid development key/referrer allowance. This
is expected when localhost is excluded; keep production restrictions intact.
Changing `.env` requires recreating the web container with `docker compose up -d web`.

## Tests and troubleshooting

Run the existing tests against an isolated, in-memory SpatiaLite database:

```sh
docker compose run --rm --no-deps \
  -e DJANGO_SETTINGS_MODULE=webmapping_project.settings_ci \
  web python manage.py test trails_api.tests --noinput
```

This does not use the development or production PostGIS database. The web image
must have been built first. PostGIS behaviour requires separate integration checks.

```sh
docker compose ps
docker compose logs --tail=50 web db
docker compose exec web python manage.py check
```

Static collection writes to a named volume rather than the tracked `staticfiles/`
directory. Stop with `docker compose down`; database and static volumes persist.
Do not add `-v` unless you intentionally want to delete the local database.


## Isolated demo stack with sample data

This standalone Compose file can coexist with the normal local stack. It uses
its own project/network/volume, database `stayandtrek_demo`, and web port 8010.
The database has no published port and remains on an internal network. Only the
web container joins a second network to publish `127.0.0.1:8010`. It has no Cloud
SQL credentials, source-directory mount or `.env` import. Its fixed development
passwords are for this isolated sandbox only.

First-time setup (do not repeat migrations just to restart an existing demo):

```sh
docker compose -p stay-trek-demo-check -f docker-compose.demo.yml build
docker compose -p stay-trek-demo-check -f docker-compose.demo.yml up -d --wait db
docker compose -p stay-trek-demo-check -f docker-compose.demo.yml run --rm web python manage.py migrate --noinput
docker compose -p stay-trek-demo-check -f docker-compose.demo.yml run --rm web python manage.py seed_demo_data
docker compose -p stay-trek-demo-check -f docker-compose.demo.yml run --rm web python manage.py createsuperuser
docker compose -p stay-trek-demo-check -f docker-compose.demo.yml up -d web
```

Open http://127.0.0.1:8010/ or http://127.0.0.1:8010/admin/.
The seed creates no user accounts; choose a separate local administrator.
After code changes, rebuild this demo image because source is not bind-mounted.

The seed provides three trails with simple geometry, two towns, and three
linked accommodations near Wicklow. Names start with `DEMO`; the routes and
businesses are fictional and must not be used for navigation. Running the seed
again adds no duplicates and preserves edits to existing records. It neither
deletes unrelated records nor resets a database. It refuses normal development,
production, proxy and non-demo database configurations before accessing the DB,
and checks the connected database identity before writing.

This dataset does not include a road-routing network. Weather is deliberately
unconfigured; local CARTO watermarks can appear. These external features are
not part of the offline data/startup checks.

To stop or resume this demo, preserving its data:

```sh
docker compose -p stay-trek-demo-check -f docker-compose.demo.yml stop
docker compose -p stay-trek-demo-check -f docker-compose.demo.yml up -d
```

Use the explicit project and Compose file above; normal `docker compose`
commands address the separate normal development stack. Do not remove volumes
or run broad Docker cleanup commands to restart the demo.

### Verification checkpoint — 2026-09-14

The new demo volume was created and all migrations applied on 2026-09-12.
On 2026-09-14 that same volume was resumed without repeating migrations. Seeding
created eight records; a repeat run created zero. Checks confirmed trail
geometry, accommodation links, preservation of an edited trail and an unrelated
town, and successful local admin sign-in. Temporary verification records were
rolled back. Eight public/login/map/analytics URLs returned HTTP 200; the trail
API returned three records. Two seed safety tests passed on 2026-09-12.
Browser visual rendering, external weather and full road routing were not tested.
Existing local and production databases were not used or changed by these checks.
