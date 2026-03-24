/* /static/advanced_js_mapping/js/ui-controls.js */


function initializeUIControls() {
    console.log("UI Controls initialized and attached to window.");

    const townImagePool = [
        '/static/images/irish_town.jpg',
        '/static/images/towns.jpg',
        '/static/images/road.jpg',
        '/static/images/hiking.jpeg',
        '/static/images/hike_2.jpg'
    ];
    
    window.UIControls = {
        clearResults: function() {
            document.getElementById('citiesList').innerHTML = '';
            document.getElementById('analysisSummary').style.display = 'none';
            document.getElementById('citiesContainer').style.display = 'none';
            document.getElementById('polygonArea').textContent = '0';
            document.getElementById('populationDensity').textContent = '0';
        },

        updateResultsUI: function(cities, analysis) {
            console.log("Updating UI with", cities.length, "cities");
            const list = document.getElementById('citiesList');
            this.clearResults();

            if (cities.length === 0) return;

            document.getElementById('analysisSummary').style.display = 'block';
            document.getElementById('citiesContainer').style.display = 'block';
            document.getElementById('searchStatus').style.display = 'none';

            // Update stats
            document.getElementById('totalCities').textContent = analysis.total_cities || cities.length;
            document.getElementById('totalPopulation').textContent = (analysis.total_population || 0).toLocaleString();
            document.getElementById('polygonArea').textContent = Number(analysis.polygon_area_km2 || 0).toLocaleString(undefined, {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2
            });
            document.getElementById('populationDensity').textContent = Number(analysis.population_density || 0).toLocaleString(undefined, {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2
            });

            cities.forEach(city => {
                const item = document.createElement('div');
                item.className = "list-group-item list-group-item-action mb-2 shadow-sm rounded border-0 d-flex align-items-center";
                item.style.borderLeft = "5px solid var(--brand-primary)";
               
                // Use a deterministic local image so result thumbnails always load.
                const imageIndex = Math.abs((city.id || city.name.length) % townImagePool.length);
                const thumbUrl = townImagePool[imageIndex];

                item.innerHTML = `
                    <img src="${thumbUrl}" class="rounded-circle me-3" style="width: 50px; height: 50px; object-fit: cover; border: 2px solid var(--brand-light);">
                    <div class="flex-grow-1">
                        <div class="d-flex justify-content-between align-items-center">
                            <strong style="color: var(--brand-dark)">${city.name}</strong>
                            <span class="badge" style="background-color: var(--accent); color: #000;">📍 View</span>
                        </div>
                        <small class="text-muted">Pop: ${city.population.toLocaleString()}</small>
                    </div>
                `;

                item.onclick = () => {
                    window.map.flyTo([city.latitude, city.longitude], 14);
                    // This opens the popup on the map which will also have an image
                    L.popup()
                        .setLatLng([city.latitude, city.longitude])
                        .setContent(`
                            <div class="text-center">
                                <img src="${thumbUrl}" class="rounded mb-2" style="width:100%; height:100px; object-fit:cover;">
                                <h6 class="fw-bold">${city.name}</h6>
                                <p class="small mb-0">Great base for trekking!</p>
                            </div>
                        `)
                        .openOn(window.map);
                };
                list.appendChild(item);
            });
        }
    };
}
