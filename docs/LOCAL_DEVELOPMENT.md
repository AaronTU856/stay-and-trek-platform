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
A reusable synthetic dataset and a full fresh-volume bootstrap verification
remain separate checklist tasks. Do not restore production data for this setup.

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
