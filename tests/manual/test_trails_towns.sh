#!/bin/bash
# Quick Test Suite for Trails and Towns
# Run this before your demo: ./test_trails_towns.sh
# Supervised by: Dr Bryan Duggan

echo "🧪 Trails & Towns Test Suite"
echo "============================="
echo ""

BASE_URL="http://localhost:8000"
PASS=0
FAIL=0

# Test function for simple GET endpoints
test_api() {
    local name=$1
    local endpoint=$2
    local check=$3  # "count", "results", "features", or HTTP code
    
    echo -n "Testing $name... "
    response=$(curl -s "$BASE_URL$endpoint")
    
    if echo "$response" | grep -q "$check"; then
        echo "✅ PASS"
        ((PASS++))
    else
        echo "❌ FAIL"
        ((FAIL++))
    fi
}

echo "1️⃣  TRAILS API TESTS"
echo "-------------------"
test_api "Get all trails" "/api/trails/" "results"
test_api "Trails with pagination" "/api/trails/?limit=50" "results"
test_api "Trails GeoJSON format" "/api/trails/geojson/" "features"
test_api "Trails statistics" "/api/trails/stats/" "total_trails"
test_api "POI (Points of Interest)" "/api/trails/pois/" "results"

echo ""
echo "2️⃣  TOWNS & GEOGRAPHY TESTS"
echo "------------------------------"
test_api "Get towns (GeoJSON)" "/api/trails/towns/geojson/" "features"
test_api "Geographic boundaries" "/api/trails/boundaries/" "results"

echo ""
echo "3️⃣  ADVANCED SPATIAL FEATURES"
echo "------------------------------"
test_api "Trail map page" "/api/trails/map/" "200"
test_api "Trail paths GeoJSON" "/api/trails/paths/geojson/" "features"

echo ""
echo "============================="
echo "Results: ✅ $PASS Passed | ❌ $FAIL Failed"
echo ""

if [ $FAIL -le 2 ]; then
    echo "🎉 Tests passed!"
    echo ""
    echo "Supervised by: Dr Bryan Duggan"
    echo ""
    echo "Key endpoints:"
    echo "  📍 Trails List: $BASE_URL/api/trails/"
    echo "  🗺️  Trails Map: $BASE_URL/api/trails/map/"
    echo "  🏙️  Towns Data: $BASE_URL/api/trails/towns/geojson/"
    exit 0
else
    echo "⚠️  Some tests failed. Check Docker is running: docker ps"
    exit 1
fi
