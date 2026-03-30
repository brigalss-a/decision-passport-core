# Decision Passport — Pricing

> Priced on value: governed execution, not just seats.

---

## Tiers

### Free — Core (this repo)

**£0 — forever**

The open-source public protocol. No limits. No expiry.

Includes:
- Append-only hash chain engine
- BasicProofBundle export (JSON)
- Offline verifier (zero-dependency)
- CLI verifier
- Demo + examples
- OpenClaw Lite bridge
- Apache-2.0 licensed

Best for: builders, OSS integrations, evaluation, learning.

---

### Pro — Builders

**£49/month** (billed monthly) or **£470/year** (save 20%)

Self-serve. No contract required.

Everything in Core, plus:
- Hosted verifier (web UI — paste bundle, get PASS/FAIL)
- Bundle history (rolling 30 days)
- Team workspace (up to 5 users)
- Email + Slack alerts on bundle events
- Enhanced export (HTML summary view)
- Priority community support

Best for: individual developers and small OpenClaw teams.

---

### Business — Teams

**£299/month** (billed monthly) or **£2,870/year** (save 20%)

Self-serve. No contract required.

Everything in Pro, plus:
- API access (REST + webhooks)
- Multi-environment support (dev / staging / prod — separate chains per env)
- RBAC (role-based access control)
- Audit exports (compliance-ready JSON + PDF)
- Usage analytics (action counts, bundle volumes)
- Extended retention (90 days)
- Priority email support
- Up to 20 users

Best for: internal dev teams running real agent workflows.

---

### Enterprise — Execution Control

**From £18,000/year**

Annual contract. Includes onboarding and dedicated support.

Everything in Business, plus:
- **Execution claim engine** — single-use authorisation tokens before every execution
- **Guard enforcement** — policy-based blocking before actions run
- **Replay protection** — nonce + TTL prevents reuse attacks
- **Outcome binding** — cryptographic sealing of execution results
- **PostgreSQL persistence** — enterprise-grade storage with audit retention
- **Redis / distributed locking** — safe concurrent multi-tenant use
- **Advanced Merkle bundle** — stronger cryptographic proof for compliance
- **Advanced verifier** — enterprise-grade, full-bundle with policy checks
- **Private provider bridges** — custom integrations (Grok, custom runtimes)
- **SSO** (SAML / OIDC)
- **Tenant isolation** — full multi-tenant separation
- **SLA** — 99.9% uptime guarantee
- **Dedicated onboarding** + slack channel

Pricing structure:
- Base platform fee (per workspace / tenant environment)
- \+ Governed action volume tier
- \+ Support tier

Best for: regulated industries, financial workflows, enterprise AI platforms.

---

### Sovereign — Regulated Environments

**From £60,000/year**

Custom contract. Includes deployment engineering.

Everything in Enterprise, plus:
- **Air-gapped verifier** — runs fully offline, no outbound network
- **Signed bundles** — HMAC-SHA256 manifest signatures with key metadata
- **Redaction modes** — `metadata-only`, `hash-only`, `sovereign-redacted` for sensitive data
- **Offline verification packs** — deployable verifier packaging for closed environments
- **Secure deployment architecture docs** — hardened configuration guides
- **GDPR / data residency** — deployment options with data sovereignty controls
- **Defence / classified readiness** — separate deployment track

Pricing structure:
- Annual licence fee
- \+ Deployment and integration fee
- \+ Optional maintenance & support tier

Best for: defence, finance, government, heavily regulated enterprise environments.

---

## How pricing works

Decision Passport is **not priced per seat**. Seat-based pricing is wrong for execution governance — the value is in protecting and recording execution volume, not in human logins.

**Primary pricing axis:** workspace / tenant / environment
**Secondary axis:** governed action volume
**Tertiary axis:** deployment mode (cloud / private / air-gapped)

### Example Enterprise calculation

| Component | Detail |
|---|---|
| Base platform | 1 production workspace |
| Governed actions | 500,000 actions/month |
| Deployment | Managed cloud |
| Support | Business tier |
| **Total** | **~£24,000/year** |

Contact [contact@bespea.com](mailto:contact@bespea.com) for a custom quote.

---

## Comparison table

| Feature | Free | Pro | Business | Enterprise | Sovereign |
|---|---|---|---|---|---|
| Append-only chain | ✓ | ✓ | ✓ | ✓ | ✓ |
| Bundle export | ✓ | ✓ | ✓ | ✓ | ✓ |
| Offline verifier | ✓ | ✓ | ✓ | ✓ | ✓ |
| Hosted verifier | — | ✓ | ✓ | ✓ | ✓ |
| Bundle history | — | 30d | 90d | Custom | Custom |
| API access | — | — | ✓ | ✓ | ✓ |
| RBAC | — | — | ✓ | ✓ | ✓ |
| Multi-environment | — | — | ✓ | ✓ | ✓ |
| Execution claims | — | — | — | ✓ | ✓ |
| Guard enforcement | — | — | — | ✓ | ✓ |
| Replay protection | — | — | — | ✓ | ✓ |
| Outcome binding | — | — | — | ✓ | ✓ |
| PostgreSQL | — | — | — | ✓ | ✓ |
| Advanced verifier | — | — | — | ✓ | ✓ |
| SSO | — | — | — | ✓ | ✓ |
| Air-gapped verifier | — | — | — | — | ✓ |
| Signed bundles | — | — | — | — | ✓ |
| Redaction modes | — | — | — | — | ✓ |

---

## FAQ

**Can I start with Free and upgrade later?**
Yes. Free is the open-source protocol. Pro and Business are self-serve upgrades. Enterprise requires a conversation.

**Is the source code for Enterprise available?**
No. Enterprise and Sovereign layers are proprietary. The public Core and Lite repos are Apache-2.0.

**Can I host Enterprise myself?**
Yes. Private deployment is available at Enterprise and Sovereign tiers.

**Is there a trial for Enterprise?**
Yes — contact [contact@bespea.com](mailto:contact@bespea.com) to arrange a 30-day evaluation.

**What data do you store?**
In managed tiers, bundle metadata and records are stored encrypted. You can export or delete at any time. Sovereign mode means your data never leaves your environment.

---

## Contact

**Grigore-Andrei Traistaru**
Founder — Bespea / Bespoke Champions League Ltd
contact@bespea.com
