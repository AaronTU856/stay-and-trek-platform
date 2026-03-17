/* /static/advanced_js_mapping/js/ui-controls.js */


function initializeUIControls() {
    console.log("UI Controls initialized and attached to window.");
    
    window.UIControls = {
        clearResults: function() {
            document.getElementById('citiesList').innerHTML = '';
            document.getElementById('analysisSummary').style.display = 'none';
            document.getElementById('citiesContainer').style.display = 'none';
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

            cities.forEach(city => {
                const item = document.createElement('div');
                item.className = "list-group-item list-group-item-action mb-2 shadow-sm rounded border-0";
                item.style.borderLeft = "5px solid var(--brand-primary, #2E8B57)";
                item.innerHTML = `
                    <div class="d-flex justify-content-between align-items-center">
                        <strong>${city.name}</strong>
                        <span class="badge bg-success">📍 View</span>
                    </div>
                    <small>Pop: ${city.population.toLocaleString()}</small>
                `;
                item.onclick = () => {
                    window.map.flyTo([city.latitude, city.longitude], 14);
                };
                list.appendChild(item);
            });
        }
    };
}