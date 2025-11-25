import pytest


class TestDockerComposeSetup:
    """Test Docker Compose configuration and services"""
    
    def test_database_url_environment_variable(self):
        """Test DATABASE_URL is properly formatted in docker-compose"""
        with open("docker-compose.yml", "r") as f:
            content = f.read()
            assert "DATABASE_URL=postgres://postgres:postgres@db:5432/trails_db" in content
    
    def test_volume_persistence_configured(self):
        """Test named volume for database persistence"""
        with open("docker-compose.yml", "r") as f:
            content = f.read()
            assert "postgres_data:" in content
            assert "/var/lib/postgresql/data" in content
    
    def test_port_mappings_correct(self):
        """Test port mappings for web and database services"""
        with open("docker-compose.yml", "r") as f:
            content = f.read()
            assert '"8000:8000"' in content or "'8000:8000'" in content
            assert '"5432:5432"' in content or "'5432:5432'" in content
    
    def test_m1_mac_platform_specified(self):
        """Test platform is set for M1 Mac compatibility"""
        with open("docker-compose.yml", "r") as f:
            content = f.read()
            assert "linux/amd64" in content
    
    def test_debug_mode_enabled(self):
        """Test DEBUG environment variable is set"""
        with open("docker-compose.yml", "r") as f:
            content = f.read()
            assert "DEBUG=1" in content
    
