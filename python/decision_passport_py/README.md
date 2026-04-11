# decision-passport-py

Offline-first Python reference implementation for Decision Passport Core.

## Scope

- Create append-only records locally.
- Create manifest from local records.
- Verify 1.4-basic bundles offline.
- Explain tamper findings and diff bundles.

This package is not a hosted API wrapper and does not include runtime policy enforcement, replay locks, claim tokens, or signed bundles.

## Install (editable)

```bash
pip install -e .
```

## API

```python
from decision_passport import (
    create_record,
    create_manifest,
    verify_basic_bundle,
    explain_tamper,
    diff_bundles,
    load_fixture,
)
```

## CLI

```bash
python -m decision_passport.verify ../../fixtures/valid-bundle.json
python -m decision_passport.diff ../../fixtures/valid-bundle.json ../../fixtures/tampered-bundle.json
```

Console script entrypoints:

```bash
decision-passport-verify ../../fixtures/valid-bundle.json
decision-passport-diff ../../fixtures/valid-bundle.json ../../fixtures/tampered-bundle.json
```

## Fixture-driven verification

```python
from decision_passport import load_fixture, verify_basic_bundle

bundle = load_fixture("valid-bundle")
result = verify_basic_bundle(bundle)
print(result["status"])  # PASS
```
