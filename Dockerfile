# 1. Use an official Python image
FROM python:3.11-slim

# 2. Install Nginx + Geospatial dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    nginx \
    gdal-bin \
    libgdal-dev \
    libgeos-dev \
    libproj-dev \
    && rm -rf /var/lib/apt/lists/*

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

# 9. Start the service
CMD ["/app/entrypoint.sh"]