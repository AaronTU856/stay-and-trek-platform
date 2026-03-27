# 1. Use an official Python image
FROM python:3.11-slim

# 2. Install Geospatial dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    binutils \
    gdal-bin \
    libgdal-dev \
    libgeos-dev \
    libproj-dev \
    libsqlite3-mod-spatialite \
    && rm -rf /var/lib/apt/lists/*

# Fix: Find where the libraries are actually installed and link them to /usr/lib/
RUN ln -s $(find /usr/lib -name "libgdal.so*" | head -n 1) /usr/lib/libgdal.so || true && \
    ln -s $(find /usr/lib -name "libgeos_c.so*" | head -n 1) /usr/lib/libgeos_c.so || true

# 3. Set working directory
WORKDIR /app

# 4. Install Python dependencies (added gunicorn for production)
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt gunicorn

# 5. Copy the rest of the code
COPY . /app

# 6. Setup Nginx (Points to your specific subfolder path)
COPY docker/nginx/nginx.conf /etc/nginx/conf.d/default.conf
RUN rm -f /etc/nginx/sites-enabled/default

# 7. Create staticfiles and media directories
RUN mkdir -p /app/staticfiles /app/media
RUN python manage.py collectstatic --noinput --clear || true

# 8. Copy and prepare entrypoint script
# Make sure the entrypoint.sh in your root matches the background-gunicorn version
RUN chmod +x /app/entrypoint.sh

# Cloud Run health check port
EXPOSE 8080

# 9. Start the service directly with Gunicorn
# This bypasses any script delays and talks to Port 8080 immediately
CMD ["gunicorn", "--bind", "0.0.0.0:8080", "--timeout", "120", "webmapping_project.wsgi:application"]
