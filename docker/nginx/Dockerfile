# Use lightweight Alpine image
FROM nginx:alpine

# Remove all default configs to avoid conflicts
RUN rm -f /etc/nginx/conf.d/*.conf

# Copy custom Nginx configuration
COPY docker/nginx/nginx.conf /etc/nginx/conf.d/nginx.conf

# Verify config is in place
RUN ls -la /etc/nginx/conf.d/

# Expose port 80
EXPOSE 80

# Start Nginx in foreground mode (required for Docker)
CMD ["nginx", "-g", "daemon off;"]
