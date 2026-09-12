# Stay & Trek development checklist

Started: 2026-09-10. Updated: 2026-09-12. This checklist records the
post-FYP development plan and verified release results. Unchecked work remains
pending or unverified; historical evidence is labelled below.

Current priority: finish the web application. The mobile app is a prototype;
mobile integration and device testing are deferred and do not gate web work.

## 1. Preserve and verify the baseline — complete

- [x] Confirm local and GitHub `dev`: `6e5515ee151be926f27205373256a183f2e9f385`.
- [x] Confirm the production image corresponds to that commit.
- [x] Confirm existing Cloud SQL backup settings and backup inventory.
- [x] Verify the new on-demand database backup finishes successfully.
- [x] Preserve final submission commit `119522457a8e700be4f65bef80944785d8bb10cd`
      using GitHub tag `fyp-final`.
- [x] Leave existing `submission-v1` tag and submission branch intact.

### Historical baseline evidence — before the security release

- Project: `long-octane-477515-k6`; region: `europe-west1`.
- Cloud Run service: `stay-and-trek-service`.
- Serving revision: `stay-and-trek-service-00310-dqb`, receiving 100% of traffic.
- Revision created: 2026-06-06T17:55:45Z.
- Image digest: `sha256:76e5422a1369b443b4901c9b600d839d676c7dd495b30fc672e648dcaa1841c5`.
- Matching regional Cloud Build: `64836004-6b47-44d0-8823-28af21a0e785`.
- Build completed successfully on 2026-04-15; source provenance resolves to
  `6e5515ee151be926f27205373256a183f2e9f385` on GitHub. Build results contain the
  same image digest as the live revision. Build includes the Django test step.
- Cloud SQL instance: `stay-trek-db`.
- Initial backup inventory was empty; automatic backups were disabled.
- New on-demand backup: `1789074915017`, requested 2026-09-10T21:15:15Z.
- Backup status: `SUCCESSFUL`, completed 2026-09-10T21:16:46Z.
- Automatic backups were subsequently enabled on 2026-09-10 at 12:00 UTC,
  retaining seven backups. The separate restoration test subsequently passed; see step 2.
- Existing `submission-v1` points to `66a6bbe50eab80f848fb958599e3d225ea106828`,
  the parent of the final-submission commit. It was not moved.
- New tag: https://github.com/AaronTU856/stay-and-trek-platform/tree/fyp-final
- The historical source contains previously identified embedded credentials.
  No additional source archive or release attachment was published. The tag
  references a commit already present on the public submission branch.

## 2. Protect production data and credentials

- [x] Create `security/post-fyp-hardening` from `dev`.
- [x] Restrict trail writes and administrative town operations to staff (deployed).
- [x] Remove the data-changing town GET endpoint; retain the management-command import.
- [x] Remove automatic administrator creation and its predictable password fallback.
- [x] Prepare replacement Django/weather secrets and grant runtime access.
- [x] Activate replacement Django/weather secrets through the verified production release.
- [ ] Revoke the old weather key at the provider after checking remaining consumers.
- [x] Enforce staff/CSRF town edits and separate suggestions from published descriptions.
- [x] Configure automatic database backups: daily at 12:00 UTC, retain seven.
- [x] Restore backup into `stay-trek-security-staging` and apply migration 0023 successfully.

Step 2 was deployed through PR #10, followed by CARTO fixes in PRs #11 and #12.
Production migration 0023 and isolated restored-PostGIS validation succeeded.
The latest Docker regression suite passed all 44 tests. Django, OpenWeather and
CARTO secret bindings are active. Old provider-key revocation and any other
credential cleanup remain unverified; see `docs/SECURITY_ROLLOUT.md`.

## 3. Establish local development and staging

- [x] Document fresh-checkout setup in `docs/LOCAL_DEVELOPMENT.md`, align
      `.env.example`, and isolate Compose from production database switches.
      Compose validation and an offline Docker settings check passed.
- [ ] Verify the documented startup end to end against a fresh local volume.
- [ ] Provide development data isolated from production.
- [x] Establish staging, explicit migration execution, and rollback procedures.

## 4. Strengthen validation

- [x] Add permission/authentication, CSRF, and moderation regression coverage.
- [x] Verify production-platform image includes tests: latest suite: all 44 tests passed.
- [x] Exercise migration and core application workflows against restored staging PostGIS.
- [x] Test full URL configuration and staging web login, staff edits, JWT submissions, moderation.
- [ ] Verify the mobile UI on physical devices or simulators.
- [x] Remove Dockerfile suppression of static-file collection failures.

## 5. Align mobile and backend — deferred

- [x] Accept mobile JWTs in backend authentication; regression test passes.
- [ ] Correct shared helper URLs, request methods, and weather parameters.
- [ ] Consolidate screen requests into the shared API client.
- [ ] Configure development/staging/production URLs and token refresh handling.
- [ ] Verify core workflows on physical devices or simulators.

## 6. Reconcile branches and deployment

- [ ] Review unique changes before merging or retiring old branches.
- [ ] Reconcile useful changes on `main` and `dev` through a pull request.
- [ ] Protect production branches and require appropriate checks.
- [x] Verify the renamed repository connection and `^dev$` trigger.
- [ ] Plan and verify a deployment-branch switch only if desired; `dev` remains the release branch.

## 7. Refresh repository presentation

- [ ] Rewrite product documentation and archive FYP-specific material.
- [ ] Remove generated tracked files only after generation is reproducible.
- [ ] Review duplicate templates, prototypes, and obsolete scripts.
- [ ] Retire or replace `cleanup.sh`; it deletes the active `maps` app and backups.

## 8. Improve maintainability and product experience

- [ ] Split large backend and map modules incrementally with regression coverage.
- [ ] Prioritise accessibility, mobile usability, performance, and data quality.
- [ ] Maintain a small, demonstrable feature roadmap for the portfolio.

## Release checkpoint — 2026-09-12

- PRs #10, #11 and #12 are merged into `dev`.
- Deployed commit: `cc7e344459febd867465a71d83b9c18f0bdc8923`.
- Cloud Run revision: `stay-and-trek-service-00328-veh`, verified at 100% traffic.
- Matching successful Cloud Build: `966d952c-fff8-4f72-bc9e-0f97b2de8288`.
- Image digest: `sha256:8b18f944e286ae1ee78cf251440a678395230a0b440056f9dc7dd3da6773d5e6`.
- Runtime CARTO secret binding and `strict-origin-when-cross-origin` response
  policy verified. Existing Django, weather and other secret bindings preserved.
- Trails & Stays, Townland Explorer and dashboard candidate pages returned 200.
  The user confirmed no watermark in the candidate browser map. After promotion,
  the production map returned 200 with the corrected policy; a tile requested
  using production configuration/referrer returned 200 and was visually checked
  without a watermark. A full production browser sweep was not completed.
- Production migration 0023 succeeded in `stay-trek-production-migrate-zltt2`.
  Backup, restoration, migration and staging validation are complete; do not
  repeat them as unfinished work from this checklist.
- Cloud Build deploys candidates with no traffic; promotion follows validation.
- CARTO rollback target: `stay-and-trek-service-00311-v59`. It retains the security
  release but lacks the CARTO fix, so watermarked maps can return after rollback.

## Next bounded tasks

- [ ] Confirm the temporary CARTO `*.a.run.app` referrer allowance has been removed;
      keep `stay-and-trek.com` and `www.stay-and-trek.com`. Removal was requested
      after promotion but has not been confirmed.
- [x] Fix `/dashboard/analytics/` HTTP 500 locally: import `Accommodation` and
      remove unused queries against its calculated category property. Two Docker
      regression tests reproduce the previous error and pass with the fix,
      covering an empty catalogue and populated summary statistics.
- [x] Release the analytics fix through PR #13. Candidate and production page
      checks passed; commit `eac7c9c5ed6ea9225506c34385092bea7aa3416a`, revision
      `stay-and-trek-service-00330-fur`, received 100% traffic. This supersedes
      the earlier CARTO release checkpoint above.
- [ ] Confirm whether the old exposed OpenWeather key has been revoked at the
      provider. The replacement key is already active through Secret Manager.
      Prototype mobile compatibility does not gate web work; mobile changes are
      deferred. Old-key revocation itself has not been confirmed.
- [ ] Complete the remaining web administrator/credential review.
- [ ] Deferred: mobile integration and UI/device checks.
