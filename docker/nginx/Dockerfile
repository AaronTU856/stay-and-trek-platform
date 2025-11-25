# Use lightweight Alpine image
FROM nginx:alpine

# Remove default Nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/nginx.conf

# Expose port 80
EXPOSE 80

# Start Nginx in foreground mode (required for Docker)
CMD ["nginx", "-g", "daemon off;"]
