# Use an official Python image
FROM python:3.11-slim

# Install system dependencies for GDAL/GEOS/PROJ
RUN apt-get update && apt-get install -y --no-install-recommends \
    gdal-bin \
    libgdal-dev \
    libgeos-dev \
    libproj-dev \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements first
COPY requirements.txt /app/

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the code
COPY . /app

# Create staticfiles and media directories
RUN mkdir -p /app/staticfiles /app/media

# Cloud Run expects port 8080, but can be overridden with PORT env var
EXPOSE 8080

# Use gunicorn with PORT environment variable (defaults to 8080 for Cloud Run, can be 8000 for local Docker)
CMD ["sh", "-c", "gunicorn --bind 0.0.0.0:${PORT:-8080} --workers 4 webmapping_project.wsgi:application"]

