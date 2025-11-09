// Wait for DOM to be fully loaded
document.addEventListener("DOMContentLoaded", function () {
  console.log("🗺️ Initializing weather map...");
  console.log("🔍 Leaflet available:", typeof L !== "undefined");
  console.log(
    "🔍 Map element exists:",
    document.getElementById("map") !== null,
  );

  // Check if Leaflet is loaded
  if (typeof L === "undefined") {
    console.error("❌ Leaflet library not loaded!");
    alert(
      "Error: Leaflet mapping library not loaded. Please check your internet connection.",
    );
    return;
  }

  // Check if map container exists
  const mapElement = document.getElementById("map");
  if (!mapElement) {
    console.error("❌ Map container element not found!");
    alert("Error: Map container not found in the page.");
    return;
  }

  // Initialize map centered on Europe
  const map = L.map("map").setView([48.8566, 2.3522], 3);
  console.log("✅ Map container initialized");

  // Add OpenStreetMap tiles
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap contributors",
    maxZoom: 19,
  }).addTo(map);
  console.log("✅ Map tiles added");

  // Store markers for reference
  const markers = {};

  // Custom icon for city markers
  const cityIcon = L.divIcon({
    className: "custom-div-icon",
    html: `<div style="
            background-color: #667eea; 
            width: 30px; 
            height: 30px; 
            border-radius: 50%; 
            border: 3px solid white; 
            box-shadow: 0 2px 5px rgba(0,0,0,0.3);
            cursor: pointer;
            transition: all 0.3s ease;
        "></div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });

  // Fetch and display cities
  async function loadCities() {
    console.log("📍 Loading cities...");
    console.log("🌐 Fetching from URL:", "api/cities/");

    try {
      const response = await fetch("api/cities/");
      console.log("📡 Response status:", response.status);
      console.log("📡 Response headers:", response.headers);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Response error:", errorText);
        throw new Error(
          `Failed to fetch cities: ${response.status} - ${errorText}`,
        );
      }

      const cities = await response.json();
      console.log(`✅ Loaded ${cities.length} cities:`, cities);

      if (cities.length === 0) {
        console.warn(
          "⚠️ No cities found in database. Please run: python manage.py populate_cities",
        );
        alert("No cities found! Please run the populate_cities command first.");
        return;
      }

      console.log("🎯 Starting to add markers for each city...");
      cities.forEach((city, index) => {
        console.log(`🔄 Processing city ${index + 1}/${cities.length}:`, city);
        addCityMarker(city);
      });

      console.log("✅ All city markers added to map");
      console.log(`📊 Total markers created: ${Object.keys(markers).length}`);
    } catch (error) {
      console.error("❌ Error loading cities:", error);
      console.error("❌ Error details:", error.message);
      console.error("❌ Error stack:", error.stack);

      // Show user-friendly error message
      const errorMsg = `Failed to load cities: ${error.message}`;
      alert(errorMsg);

      // Also display error on map
      const errorPopup = L.popup()
        .setLatLng([48.8566, 2.3522])
        .setContent(
          `<div style="color: red; font-weight: bold;">Error: ${error.message}</div>`,
        )
        .openOn(map);
    }
  }

  // Add a marker for a city
  function addCityMarker(city) {
    console.log(`📍 Adding marker for ${city.name}, ${city.country}`);
    console.log(`📍 Coordinates: lat=${city.latitude}, lon=${city.longitude}`);
    console.log(`📍 City object:`, city);

    try {
      const marker = L.marker([city.latitude, city.longitude], {
        icon: cityIcon,
        title: `${city.name}, ${city.country}`,
      }).addTo(map);

      console.log(`✅ Marker object created:`, marker);

      // Show loading popup on click
      marker.on("click", () => {
        console.log(`🖱️ Clicked on ${city.name}`);
        fetchWeatherData(city.id, marker);
      });

      // Store marker reference
      markers[city.id] = marker;
      console.log(
        `✅ Marker added for ${city.name} at [${city.latitude}, ${city.longitude}]`,
      );
    } catch (error) {
      console.error(`❌ Error creating marker for ${city.name}:`, error);
    }
  }

  // Fetch weather data for a city
  async function fetchWeatherData(cityId, marker) {
    console.log(`🌤️ Fetching weather for city ID: ${cityId}`);
    console.log(
      "🌐 Weather URL:",
      `api/weather/${cityId}/`,
    );
    showLoading();

    try {
      const response = await fetch(
        `/api/weather/${cityId}/`,
      );
      console.log("📡 Weather response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Weather response error:", errorText);
        throw new Error(
          `Failed to fetch weather data: ${response.status} - ${errorText}`,
        );
      }

      const data = await response.json();
      console.log("✅ Weather data received:", data);
      displayWeatherPopup(data, marker);
    } catch (error) {
      console.error("❌ Error fetching weather:", error);
      displayErrorPopup(marker, error.message);
    } finally {
      hideLoading();
    }
  }

  // Display weather information in popup
  function displayWeatherPopup(data, marker) {
    const iconUrl = data.mock_data
      ? `https://openweathermap.org/img/wn/${data.icon}@2x.png`
      : `https://openweathermap.org/img/wn/${data.icon}@2x.png`;

    // Add indicator for mock data
    const dataSourceIndicator = data.mock_data
      ? `<div style="background: #ffeaa7; padding: 4px 8px; border-radius: 4px; margin-bottom: 8px; font-size: 12px;">
                📡 ${data.error_reason || "Using simulated data (API unavailable)"}
               </div>`
      : `<div style="background: #00b894; color: white; padding: 4px 8px; border-radius: 4px; margin-bottom: 8px; font-size: 12px;">
                🌐 Live weather data
               </div>`;

    const popupContent = `
            <div class="weather-popup">
                <h3>${data.city}, ${data.country}</h3>

                ${dataSourceIndicator}

                <div class="weather-icon-container">
                    <img src="${iconUrl}" alt="${data.description}" ${data.mock_data ? 'style="opacity: 0.8;"' : ""}>
                    <div class="weather-description">${data.description}</div>
                </div>

                <div class="weather-info">
                    <div class="weather-item">
                        <div>
                            <strong>🌡️ Temperature</strong>
                            <span>${data.temperature.toFixed(1)}°C</span>
                        </div>
                    </div>

                    <div class="weather-item">
                        <div>
                            <strong>🤔 Feels Like</strong>
                            <span>${data.feels_like.toFixed(1)}°C</span>
                        </div>
                    </div>

                    <div class="weather-item">
                        <div>
                            <strong>💧 Humidity</strong>
                            <span>${data.humidity}%</span>
                        </div>
                    </div>

                    <div class="weather-item">
                        <div>
                            <strong>🌪️ Wind Speed</strong>
                            <span>${data.wind_speed} m/s</span>
                        </div>
                    </div>

                    <div class="weather-item">
                        <div>
                            <strong>🔽 Pressure</strong>
                            <span>${data.pressure} hPa</span>
                        </div>
                    </div>
                </div>
            </div>
        `;

    marker
      .bindPopup(popupContent, {
        maxWidth: 320,
        className: "weather-popup-container",
      })
      .openPopup();

    console.log(
      `✅ Weather popup displayed for ${data.city} (${data.mock_data ? "mock" : "real"} data)`,
    );
  }

  // Display error message in popup
  function displayErrorPopup(marker, errorMessage = "Unknown error") {
    const errorContent = `
            <div class="weather-popup">
                <h3>❌ Error</h3>
                <div class="error-message">
                    Unable to fetch weather data: ${errorMessage}
                    <br><br>
                    Please try again later.
                </div>
            </div>
        `;

    marker.bindPopup(errorContent).openPopup();
    console.log("❌ Error popup displayed");
  }

  // Show loading overlay
  function showLoading() {
    const loadingEl = document.getElementById("loading");
    if (loadingEl) {
      loadingEl.classList.add("active");
      console.log("⏳ Loading overlay shown");
    }
  }

  // Hide loading overlay
  function hideLoading() {
    const loadingEl = document.getElementById("loading");
    if (loadingEl) {
      loadingEl.classList.remove("active");
      console.log("✅ Loading overlay hidden");
    }
  }

  // Initialize the application
  console.log("🚀 Starting weather map application...");
  loadCities();

  // Add some helpful debugging
  window.debugMap = {
    map: map,
    markers: markers,
    loadCities: loadCities,
    reloadCities: () => {
      Object.values(markers).forEach((marker) => map.removeLayer(marker));
      Object.keys(markers).forEach((key) => delete markers[key]);
      loadCities();
    },
  };

  console.log("🎯 Weather map initialized! Use window.debugMap for debugging.");
});
