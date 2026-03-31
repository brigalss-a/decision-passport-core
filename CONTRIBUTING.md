# Contributing to Decision Passport

Thank you for your interest in contributing.

Decision Passport Core and OpenClaw Lite are open-source (Apache-2.0). Contributions to the public protocol are welcome.

---

## What we welcome

- Bug fixes in chain logic, hashing, or verifier
- Improved TypeScript types or documentation
- Additional examples (new OpenClaw tool integrations)
- Test coverage improvements
- Docs clarifications

## What we don't accept here

- Changes to enterprise features (claims, guard, outcomes). Those live in the private control-plane repo.
- Breaking changes to the `BasicProofBundle` schema without a major version discussion
- New external dependencies without prior discussion (the core verifier must remain zero-dependency)

---

## How to contribute

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/my-improvement`
3. Make your changes
4. Run tests: `pnpm test`
5. Commit with a clear message: `fix: correct sequence validation in verifyChain`
6. Open a Pull Request with:
   - What changed
   - Why it's needed
   - Test evidence

---

## Code standards

- TypeScript strict mode, no `any` unless absolutely necessary
- All public functions must have JSDoc comments
- All new code must include tests
- Use `pnpm`, do not commit `yarn.lock` or `package-lock.json`
- No raw `console.log` in library code (demos only)

---

## Schema compatibility

The `BasicProofBundle` and `LiteBundle` schemas are public protocol formats. Do not change field names or types without:

1. Bumping the `bundle_version`
2. Documenting the migration path
3. Maintaining backward-compatible verification

---

## Questions

Open a GitHub issue or email <contact@bespea.com>.

---

Copyright © 2025-2026 Bespoke Champions League Ltd
