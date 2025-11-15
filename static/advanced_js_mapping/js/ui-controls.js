/* UI controls (compat shim) */
console.log('🎛️ Loading UI controls shim...');

function initializeUIControls() {
    // minimal placeholder to avoid JS errors
    window.UIControls = {
        clearResults: function() {
            try { document.getElementById('citiesList').innerHTML = ''; } catch(e){}
            try { document.getElementById('analysisSummary').style.display = 'none'; } catch(e){}
            try { document.getElementById('citiesContainer').style.display = 'none'; } catch(e){}
        }
    };
}
