# Browser Verifier

A zero-dependency, client-side verifier for Decision Passport bundles.

## Usage

Serve the repo root with any static file server:

```bash
npx serve . -l 3000
# Open http://localhost:3000/apps/verifier-web/
```

Then either:

- **Drag and drop** a bundle JSON file onto the page
- **Click** to browse for a file
- **Click** "valid-bundle.json" or "tampered-bundle.json" to verify the included fixtures

## How it works

All verification runs **entirely in your browser** using the Web Crypto API. Nothing is uploaded.

The verifier reimplements the same canonical serialisation and SHA-256 hashing used by `@decision-passport/core`, then:

1. Recomputes each record's `payload_hash` and `record_hash`
2. Verifies the `prev_hash` chain linkage
3. Checks the manifest `chain_hash` against the last record
4. Reports a detailed tamper analysis if anything fails

## Environment

- Works in any modern browser (Chrome, Firefox, Safari, Edge)
- No build step required
- No dependencies
