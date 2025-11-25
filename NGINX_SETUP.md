# 🚀 Nginx + Docker Setup Guide

## Quick Start

### 1. Build and Start Services
```bash
# Build all containers
docker-compose build

# Start all services (nginx, django, postgres)
docker-compose up -d
```

### 2. Access Your Application

| Service | URL | Purpose |
|---------|-----|---------|
| **Main App** | http://localhost | Nginx reverse proxy (external) |
| **Django Direct** | http://localhost:8000 | Django dev server (internal) |
| **Admin Panel** | http://localhost/admin | Django admin |
| **API** | http://localhost/api/trails/ | REST API endpoints |
| **API Docs** | http://localhost/api/docs/ | Swagger documentation |
| **Database** | localhost:5432 | PostgreSQL (for db tools) |

### 3. Common Commands

```bash
# View logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f nginx
docker-compose logs -f web

# Run migrations
docker-compose exec web python manage.py migrate

# Create superuser
docker-compose exec web python manage.py createsuperuser

# Collect static files
docker-compose exec web python manage.py collectstatic --noinput

# Stop services
docker-compose down

# Clean up (remove containers and volumes)
docker-compose down -v
```

### 4. Verify Setup

```bash
# Check container status
docker-compose ps

# Check Nginx is working
curl http://localhost/health

# Check Django is working
curl http://localhost/api/trails/info/
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Your Computer (macOS)                     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Port 80 (HTTP)                                              │
│       ↓                                                       │
│  ┌──────────────┐                                             │
│  │  Nginx       │ (docker/nginx/Dockerfile)                  │
│  │  Alpine      │ - Reverse proxy                            │
│  │  Container   │ - Static file serving                      │
│  │              │ - Load balancing                           │
│  └──────┬───────┘                                             │
│         │ (port 8000)                                         │
│         ↓                                                     │
│  ┌──────────────┐          ┌──────────────┐                  │
│  │  Django      │          │  PostgreSQL  │                  │
│  │  Container   │ ------→  │  + PostGIS   │                  │
│  │              │          │  Container   │                  │
│  │ Port: 8000   │          │ Port: 5432   │                  │
│  │ (runserver)  │          │              │                  │
│  └──────────────┘          └──────────────┘                  │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## What Was Created

### Files Added:
1. **docker/nginx/nginx.conf** - Nginx configuration
   - Reverse proxy to Django (port 8000)
   - Static file serving with caching
   - Health check endpoint (/health)
   - Timeouts for geospatial queries

2. **docker/nginx/Dockerfile** - Nginx Alpine container
   - Lightweight (~10MB)
   - Production-ready

3. **docker-compose.yml** (updated)
   - Added nginx service on port 80
   - Network isolation (app_network)
   - Volume sharing for static files
   - Container naming for clarity

4. **.env.example** - Environment template
   - Database configuration
   - API keys placeholder
   - Easy reference

### Files Modified:
1. **Dockerfile** (updated)
   - Creates staticfiles directory
   - Collects static files during build
   - Runs migrations at startup

## Key Features

✅ **Reverse Proxy** - Nginx handles external requests on port 80
✅ **Static Files** - Served directly by Nginx (fast, no Django overhead)
✅ **Network Isolation** - Services communicate via Docker network
✅ **Easy Management** - docker-compose handles everything
✅ **Database Integrity** - No changes to PostgreSQL setup
✅ **Development Friendly** - Hot reload with volumes
✅ **Production Ready** - Same setup as Cloud Run environment

## Database Safety

Your PostgreSQL database is **completely unchanged**:
- Same PostGIS image (15-3.4)
- Same volume mounting
- Same user/password configuration
- All existing data preserved

## Notes for Cloud Run

- This Nginx setup is **local development only**
- Cloud Run doesn't use this Nginx container
- Cloud Run has built-in load balancing
- Your existing Cloud Build → Cloud Run pipeline works unchanged
- The staticfiles collection in Dockerfile helps Cloud Run serve static files

## Troubleshooting

**Port 80 in use:**
```bash
# Use different port
docker-compose up -d --publish 8080:80
# Then access http://localhost:8080
```

**Nginx not connecting to Django:**
```bash
# Check network
docker network ls
docker network inspect awm_assignment_app_network
```

**Static files not showing:**
```bash
# Rebuild and collect static files
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
docker-compose exec web python manage.py collectstatic --noinput
```

---

**Your setup is now ready to test!** 🎉
