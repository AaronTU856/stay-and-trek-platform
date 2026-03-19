# 1. Use an official Python image
FROM python:3.11-slim

# 2. Install Geospatial dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    binutils \
    gdal-bin \
    libgdal-dev \
    libgeos-dev \
    libproj-dev \
    && rm -rf /var/lib/apt/lists/*

# Fix: Find where the libraries are actually installed and link them to /usr/lib/
RUN ln -s $(find /usr/lib -name "libgdal.so*" | head -n 1) /usr/lib/libgdal.so || true && \
    ln -s $(find /usr/lib -name "libgeos_c.so*" | head -n 1) /usr/lib/libgeos_c.so || true

# 3. Set working directory
WORKDIR /app

# 4. Install Python dependencies
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt gunicorn

# 5. Copy the rest of the code
COPY . /app

# 6. Create staticfiles and media directories
RUN mkdir -p /app/staticfiles /app/media
# We run collectstatic here during the build to prepare the files
RUN python manage.py collectstatic --noinput --clear || true

# 7. Copy and prepare entrypoint script
RUN chmod +x /app/entrypoint.sh

# Cloud Run health check port
EXPOSE 8080

# 8. Start the service
CMD ["/app/entrypoint.sh"]