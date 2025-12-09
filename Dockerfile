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

# Copy and make entrypoint executable
COPY entrypoint.sh /app/
RUN chmod +x /app/entrypoint.sh

# Cloud Run expects port 8080, but can be overridden with PORT env var
EXPOSE 8080

# Use entrypoint script to run migrations and start gunicorn
ENTRYPOINT ["/app/entrypoint.sh"]

