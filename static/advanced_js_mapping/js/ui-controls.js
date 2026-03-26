/* /static/advanced_js_mapping/js/ui-controls.js */

function initializeUIControls() {
    console.log("UI Controls initialized and attached to window.");

    // Cache references to key DOM elements for efficient updates
    function getElements() {
        return {
            welcomeState: document.getElementById('welcomeState'),
            loadingIndicator: document.getElementById('loadingIndicator'),
            analysisSummary: document.getElementById('analysisSummary'),
            citiesContainer: document.getElementById('citiesContainer'),
            citiesList: document.getElementById('citiesList'),
            resultsEmptyState: document.getElementById('resultsEmptyState'),
            resultsStateEyebrow: document.getElementById('resultsStateEyebrow'),
            resultsStateTitle: document.getElementById('resultsStateTitle'),
            resultsStateDescription: document.getElementById('resultsStateDescription'),
            totalCities: document.getElementById('totalCities'),
            totalPopulation: document.getElementById('totalPopulation'),
            polygonArea: document.getElementById('polygonArea'),
            populationDensity: document.getElementById('populationDensity')
        };
    }
    // Utility function to show/hide elements
    function setVisible(element, visible, displayValue) {
        if (!element) return;
        element.style.display = visible ? (displayValue || 'block') : 'none';
    }
    // Utility function to format numbers with commas and specified decimal places
    function formatNumber(value, fractionDigits) {
        return Number(value || 0).toLocaleString(undefined, {
            minimumFractionDigits: 0,
            maximumFractionDigits: fractionDigits
        });
    }

    function pluralizeTown(count) {
        return count === 1 ? 'town' : 'towns';
    }


    // Expose UI control functions globally
    window.UIControls = {
        showWorkflowState: function() {
            const els = getElements();
            setVisible(els.welcomeState, true);
            setVisible(els.loadingIndicator, false);
            setVisible(els.analysisSummary, false);
        },

        setLoadingState: function(show) {
            const els = getElements();
            if (show) {
                setVisible(els.welcomeState, false);
                setVisible(els.analysisSummary, false);
                setVisible(els.loadingIndicator, true);
            } else {
                setVisible(els.loadingIndicator, false);
            }
        },

        clearResults: function() {
            const els = getElements();
            if (els.citiesList) els.citiesList.innerHTML = '';
            if (els.resultsEmptyState) els.resultsEmptyState.classList.remove('is-visible');
            if (els.totalCities) els.totalCities.textContent = '0';
            if (els.totalPopulation) els.totalPopulation.textContent = '0';
            if (els.polygonArea) els.polygonArea.textContent = '0';
            if (els.populationDensity) els.populationDensity.textContent = '0';

            this.showWorkflowState();
        },

        // Main function to update the UI with new results
        updateResultsUI: function(cities, analysis) {
            console.log("Updating UI with", cities.length, "cities");
            const els = getElements();
            const totalCities = Number((analysis && analysis.total_cities) || cities.length || 0);
            const totalPopulation = Number((analysis && analysis.total_population) || 0);
            const polygonArea = Number((analysis && analysis.polygon_area_km2) || 0);
            const populationDensity = Number((analysis && analysis.population_density) || 0);

            if (els.citiesList) els.citiesList.innerHTML = '';
            if (els.resultsEmptyState) els.resultsEmptyState.classList.remove('is-visible');

            setVisible(els.welcomeState, false);
            setVisible(els.loadingIndicator, false);
            setVisible(els.analysisSummary, true);
            setVisible(els.citiesContainer, true);

            if (els.totalCities) els.totalCities.textContent = totalCities.toLocaleString();
            if (els.totalPopulation) els.totalPopulation.textContent = totalPopulation.toLocaleString();
            if (els.polygonArea) els.polygonArea.textContent = formatNumber(polygonArea, 2);
            if (els.populationDensity) els.populationDensity.textContent = formatNumber(populationDensity, 2);

            if (els.resultsStateEyebrow) {
                els.resultsStateEyebrow.textContent = totalCities > 0 ? 'Results Ready' : 'Search Complete';
            }

            if (els.resultsStateTitle) {
                els.resultsStateTitle.textContent = totalCities > 0
                    ? totalCities.toLocaleString() + ' ' + pluralizeTown(totalCities) + ' found in your selected area'
                    : 'No towns found in your selected area';
            }

            if (els.resultsStateDescription) {
                els.resultsStateDescription.textContent = totalCities > 0
                    ? 'The towns below are listed in the workflow panel and highlighted on the map.'
                    : 'Try a larger shape or explore another part of the map to find populated townlands.';
            }
            // Create list items for each city
            cities.forEach(city => {
                const item = document.createElement('button');
                item.type = 'button';
                item.className = "list-group-item list-group-item-action shadow-sm border-0 d-flex align-items-center px-3 py-3";

                const thumbUrl = window.AdvancedMapping && typeof window.AdvancedMapping.getTownImage === 'function'
                    ? window.AdvancedMapping.getTownImage(city)
                    : '/static/images/towns.jpg';

                item.innerHTML = `
                    <img src="${thumbUrl}" class="rounded-circle me-3" alt="${city.name}" style="width: 52px; height: 52px; object-fit: cover; border: 2px solid var(--brand-light);">
                    <div class="flex-grow-1 text-start">
                        <div class="d-flex justify-content-between align-items-center gap-2">
                            <strong style="color: var(--brand-dark)">${city.name}</strong>
                            <span class="badge rounded-pill" style="background-color: var(--brand-light); color: var(--brand-dark);">View on map</span>
                        </div>
                        <small class="text-muted d-block mt-1">Population: ${(city.population || 0).toLocaleString()}</small>
                    </div>
                `;

                item.onclick = () => {
                    if (window.AdvancedMapping && typeof window.AdvancedMapping.focusTown === 'function') {
                        window.AdvancedMapping.focusTown(city, thumbUrl);
                        return;
                    }

                    if (window.map) {
                        window.map.flyTo([city.latitude, city.longitude], 14);
                        L.popup()
                            .setLatLng([city.latitude, city.longitude])
                            .setContent(city.name)
                            .openOn(window.map);
                    }
                };

                if (els.citiesList) {
                    els.citiesList.appendChild(item);
                }
            });

            if (!cities.length && els.resultsEmptyState) {
                els.resultsEmptyState.classList.add('is-visible');
            }
        }
    };

    window.UIControls.showWorkflowState(); // Show initial state
}
