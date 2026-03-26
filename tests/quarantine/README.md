Legacy test and probe scripts live here so they remain available for manual
inspection without being picked up by automated Django or pytest discovery.

Why quarantined:
- They depend on a manually running local server or preloaded live-like data.
- They are useful for exploratory verification, but not for isolated CI/local
  automated test evidence.

Current quarantined scripts:
- `legacy_api_probe.py`
- `legacy_endpoint_probe.py`
- `legacy_spatial_probe.py`
