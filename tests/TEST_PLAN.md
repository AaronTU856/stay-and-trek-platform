# Test Plan

## Step 1: High-Risk Backend and Workflow Tests

Priority areas:
- Route generation
- Nearby accommodation search
- Weather endpoints
- Radius/proximity search
- CI/CD regression gate

Initial real-failure focus:
1. Route request with missing coordinates
2. Route request with invalid coordinates
3. Route request when no route is available
4. Accommodation search with missing latitude/longitude
5. Weather endpoint with invalid trail or town identifiers

Evidence to capture:
- Failing terminal output or CI logs
- Fix applied
- Passing rerun

## Active Automated Suite

- `trails_api/tests/test_models.py`
- `trails_api/tests/test_filters.py`
- `trails_api/tests/test_api.py`
- `trails_api/tests/test_views.py`
- `trails_api/tests/test_integration.py`

## Current Gaps

- Route failure paths
- Accommodation validation/error handling
- Weather invalid-input coverage
- Broader integration around route workflow
