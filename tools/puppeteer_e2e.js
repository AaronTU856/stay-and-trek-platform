const fs = require('fs');
const puppeteer = require('puppeteer');

// Main async function to run Puppeteer E2E test
(async () => {
  const outScreenshot = 'tmp/puppeteer_map.png';
  const outNetwork = 'tmp/puppeteer_network.json';
  const outConsole = 'tmp/puppeteer_console.log';
  if (!fs.existsSync('tmp')) fs.mkdirSync('tmp');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();

  // Capture network requests and console logs
  const networkEvents = [];
  const consoleEvents = [];

  page.on('console', msg => {
    const text = `${msg.type().toUpperCase()}: ${msg.text()}`;
    consoleEvents.push(text);
    console.log(text);
  });

  // Capture all network requests
  page.on('requestfinished', async req => {
    try {
      const res = req.response();
      const url = req.url();
      const status = res ? res.status() : null;
      networkEvents.push({url, status});
    } catch (e) {
      // ignore
    }
  });

  // Navigate to the target URL
  const targetUrl = process.env.TARGET_URL || 'http://127.0.0.1:8000/advanced-js-mapping/map/';
  console.log('Opening', targetUrl);
  await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 30000 }).catch(e => {
    console.error('Failed to open page:', e.message);
  });

  // Wait a bit for front-end to initialize
  await new Promise(res => setTimeout(res, 3000));

  // Define polygon coordinates (lon,lat pairs) — sample polygon covering Limerick/Ennis area
  const polygonCoords = [[-9.5,52.5],[-9.5,53.0],[-8.5,53.0],[-8.5,52.5],[-9.5,52.5]];

  // Try to add a Leaflet polygon to the map and trigger analysis.
  const result = await page.evaluate(async (coords) => {
    const response = {addedPolygon:false, apiResponse:null, error:null};
    try {
      // convert [[lon,lat],...] to [[lat,lon],...]
      const latLngs = coords.map(c => [c[1], c[0]]);

      // attempt several possible global map references
      const map = (window.map || (window.AdvancedMapping && window.AdvancedMapping.map) || window._leaflet_map);

      if (map && typeof L !== 'undefined') {
        const poly = L.polygon(latLngs).addTo(map);
        map.fitBounds(poly.getBounds());
        response.addedPolygon = true;
      }

      // If the page exposes a helper to run polygon analysis, call it
      if (window.performPolygonAnalysis) {
        const res = await window.performPolygonAnalysis({type:'Polygon', coordinates:[coords]});
        response.apiResponse = res;
      } else {
        // fallback: call the backend polygon-search endpoint directly
        const res = await fetch('/advanced-js-mapping/api/polygon-search/', {
          method: 'POST',
          headers: {'Content-Type':'application/json'},
          body: JSON.stringify({polygon:{type:'Polygon', coordinates:[coords]}})
        });
        if (res.ok) response.apiResponse = await res.json(); else response.apiResponse = {httpStatus: res.status};
      }
    } catch (e) {
      response.error = e.message;
    }
    return response;
  }, polygonCoords);

  // Save network and console
  fs.writeFileSync(outNetwork, JSON.stringify(networkEvents, null, 2));
  fs.writeFileSync(outConsole, consoleEvents.join('\n'));

  // Screenshot map area
  try {
    await page.screenshot({ path: outScreenshot, fullPage: false });
    console.log('Screenshot saved to', outScreenshot);
  } catch (e) {
    console.error('Screenshot failed:', e.message);
  }

  console.log('Puppeteer result:', JSON.stringify(result, null, 2));

  await browser.close();
  process.exit(0);
})();
