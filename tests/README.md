# Testing Workspace

This folder is the coordination point for project testing.

Active automated Django tests:
- `trails_api/tests/`

Project-level test settings:
- `webmapping_project/settings_test_local.py`
- `webmapping_project/settings_ci.py`

Manual and support material:
- `tests/manual/` for manual test scripts and notes
- `tests/evidence/` for coverage outputs, logs, and captured evidence
- `tests/quarantine/` for legacy or experimental probes that are not part of the active suite

Notes:
- The current active automated suite remains inside `trails_api/tests/` because that is where the main application logic lives.
- Existing root-level shell scripts are not part of Django test discovery and can be reviewed/moved later once testing is complete.
