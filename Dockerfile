# Use an official Python image
FROM python:3.11-slim

# Install dependencies for GDAL/GEOS/PROJ
RUN apt-get update && apt-get install -y \
    gdal-bin \
    libgdal-dev \
    libgeos-dev \
    binutils \
    libproj-dev \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy the code
COPY . /app

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Environment variables for Geo libraries
ENV GEOS_LIBRARY_PATH=/usr/lib/aarch64-linux-gnu/libgeos_c.so
ENV GDAL_LIBRARY_PATH=/usr/lib/aarch64-linux-gnu/libgdal.so
ENV PROJ_LIB=/usr/share/proj

# Cloud Run expects port 8080
EXPOSE 8080

# Run migrations and start gunicorn
CMD exec gunicorn --bind :$PORT --workers 1 --timeout 0 webmapping_project.wsgi:application
