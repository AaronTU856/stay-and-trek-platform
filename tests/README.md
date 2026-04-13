# Testing Workspace

This folder groups the main testing notes and helper material for the project.

Active automated Django tests:
- `trails_api/tests/`

Project-level test settings:
- `webmapping_project/settings_test_local.py`
- `webmapping_project/settings_ci.py`

Manual and support material:
- `tests/manual/` for manual test scripts and notes

Notes:
- The current active automated suite remains inside `trails_api/tests/` because that is where the main application logic lives.
- The shell scripts in this area are support utilities and are not part of Django test discovery.
