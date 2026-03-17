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
                const maxPop = Math.max(...cities.map(c => c.population));
                const percentage = (city.population / maxPop) * 100;
                
                item.className = "list-group-item list-group-item-action mb-2 shadow-sm rounded border-0";
                item.style.borderLeft = "5px solid var(--brand-primary, #2E8B57)";

                item.innerHTML = `
                    <div class="d-flex justify-content-between align-items-center mb-1">
                        <strong style="color: var(--brand-dark)">${city.name}</strong>
                        <span class="badge bg-light text-primary border">Ranked Hub</span>
                    </div>
                    <div class="progress" style="height: 6px; background-color: #eee;">
                        <div class="progress-bar" style="width: ${percentage}%; background-color: var(--brand-primary);"></div>
                    </div>
                    <small class="text-muted mt-1 d-block">Weight: ${city.population.toLocaleString()} trekkers potential</small>
                `;
                item.onclick = () => {
                    window.map.flyTo([city.latitude, city.longitude], 14);
                };
                list.appendChild(item);
            });
        }
    };
}