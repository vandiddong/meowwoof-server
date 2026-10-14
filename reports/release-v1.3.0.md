# Boomkerque 1.3.0 web beta

Published site: https://vandiddong.github.io/meowwoof-server/?v=1.3.0

## Available in this public beta

- Boomkerque branding and a fictional World War I aviation theme with a biplane.
- Fresh local practice maps, concealed in-flight target, retained airspeed and no wind or friend rooms.
- Fast post-drop presentation; physical impact and scoring remain unchanged.
- 1080×1920 result-image download and native sharing where supported. No map, target, seed or credentials appear on the card.
- Rules and accurate privacy information. No advertising, payment or analytics SDK is enabled.

## Implemented and locally verified; not live publicly

Official competition allows three free attempts per account per Asia/Seoul day, five rounds per attempt and only the highest completed total per account. Issuing a map consumes an attempt; abandoned attempts still count. Secret assignment provides only the current map and rejects exact geometry previously issued to that account. Practice is separate. Difficulty is restricted to narrow bands, which does not prove equal subjective difficulty.

Server replay validation recomputes scores, checks timing, binds attempt/round IDs, rejects duplicate submissions and respects day end. Personal best appears immediately; public standings are immutable 30-minute snapshots. Previous seven days can be retrieved. Rate limiting only trusts explicitly configured proxy IPs.

Optional Google login validates signed identity tokens, issuer, audience and expiry, then uses an anonymous stable account ID. Cryptographic tests use a synthetic signing key; a real Google account has not been tested. Production OAuth client ID and API hosting are not configured, so the public build exposes neither official sign-in nor official-ranking buttons.

## Validation

- 57 automated tests, including 20 server tests and 2 Google signature tests.
- 300 officially assigned maps across 60 accounts: zero generation/acceptance failures. Aggregate report is adjacent to this document.
- Local real-browser five-round and API-connected five-round games passed.
- Compiled-source exposure audit passed; no source maps or raw development source is included in this release.
- Local final-score display: approximately 8 ms; post-drop results approximately 1.5–1.6 seconds. These are observed test measurements, not device-wide guarantees.
- Public HTTPS verification is run by the linked repository Actions workflow after publication.

## Before commercial launch

Provision an HTTPS API with durable private database and seed key, configure OAuth origins/client ID, supply operator/contact details and finalize privacy retention/deletion procedures and terms. Private source Git hosting remains outstanding because repository creation and Secrets were denied by the connected integration. Verified private archive and complete Git bundle are retained in the cloud workspace, outside public Git; environment snapshot publication is separate.

Monetization planning prioritizes cosmetic purchases and eventual ad removal, without paid official attempts, hints or competitive advantages. Payments, ads and purchasing are not activated. Internal terms/privacy drafts are unfinished and are not published as finalized policies.

Actual Android/iPhone audio, silent switch, Bluetooth and sustained performance remain untested. Mobile browser emulation passed. Previously published source history cannot be recalled, and client obfuscation cannot prevent inspection or automation.
