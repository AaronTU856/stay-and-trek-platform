Legacy test and probe scripts are kept here so they remain available for manual
inspection without being picked up by automated Django or pytest discovery.

Why quarantined:
- They depend on a manually running local server or preloaded live-like data.
- They are useful for exploratory verification, but not suitable for the isolated
  automated test workflow used in CI and local test runs.

Current quarantined scripts:
- `legacy_api_probe.py`
- `legacy_endpoint_probe.py`
- `legacy_spatial_probe.py`
