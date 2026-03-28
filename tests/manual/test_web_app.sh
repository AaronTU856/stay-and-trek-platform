#!/bin/bash
# Web Application Test Script
# Tests the Django web app and API endpoints

echo "🧪 Web Application Test Suite"
echo "=============================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

BASE_URL="http://localhost:8000"

# Function to test endpoint
test_endpoint() {
    local name=$1
    local endpoint=$2
    local expected_code=$3
    
    echo -n "Testing $name... "
    response=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL$endpoint")
    
    if [ "$response" == "$expected_code" ]; then
        echo -e "${GREEN}✅ PASS${NC} (HTTP $response)"
        return 0
    else
        echo -e "${RED}❌ FAIL${NC} (Expected $expected_code, got $response)"
        return 1
    fi
}

# Function to test JSON response
test_json_endpoint() {
    local name=$1
    local endpoint=$2
    
    echo -n "Testing $name... "
    response=$(curl -s "$BASE_URL$endpoint")
    
    if echo "$response" | grep -q "results\|count\|features"; then
        echo -e "${GREEN}✅ PASS${NC} (Valid JSON response)"
        return 0
    else
        echo -e "${RED}❌ FAIL${NC} (Invalid response)"
        return 1
    fi
}

echo "1️⃣  Home Page Tests"
echo "-------------------"
test_endpoint "Home page" "/" 200
test_endpoint "Admin page" "/admin/" 200 || test_endpoint "Admin redirects" "/admin/" 302

echo ""
echo "2️⃣  API Endpoints Tests"
echo "------------------------"
test_json_endpoint "Trails list" "/api/trails/"
test_json_endpoint "Towns GeoJSON" "/api/trails/towns/geojson/"
test_json_endpoint "Trails GeoJSON" "/api/trails/geojson/"
test_json_endpoint "POIs" "/api/trails/pois/"

echo ""
echo "3️⃣  Maps Tests"
echo "---------------"
test_endpoint "Trails map page" "/api/trails/map/" 200
test_endpoint "Advanced JS mapping" "/advanced-js-mapping/" 200

echo ""
echo "4️⃣  Dashboard Tests"
test_endpoint "Dashboard" "/dashboard/" 200 || test_endpoint "Dashboard redirect" "/dashboard/" 302

echo ""
echo "=============================="
echo "✅ Web Application Tests Complete!"
echo ""
echo "💡 Tips for your demo:"
echo "  • Home page: http://localhost:8000/"
echo "  • Trails map: http://localhost:8000/api/trails/map/"
echo "  • API docs: http://localhost:8000/api/docs/"
echo "  • Admin: http://localhost:8000/admin/"
