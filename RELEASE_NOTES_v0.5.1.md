# Release Notes v0.5.1

## Summary

This is a docs-only patch release that follows v0.5.0.

## What changed

- Updated README validation snapshot to reflect current local validation evidence.
- Added an explicit Python quick-check block in README:
  - install the local Python reference package in editable mode
  - run Python unit tests
  - run offline verification against the canonical valid fixture

## Hygiene verification

A targeted version-drift scan for legacy v0.2.0 identifiers was executed before this patch release.

Result:

- No active release-surface drift found.
- Matches exist only in local historical evidence files under reports/release-double-check/.

## Scope

No protocol logic changes.
No package API changes.
No fixture content changes.
Only documentation updates.
