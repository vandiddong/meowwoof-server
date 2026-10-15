# 붐케르크 · BOOMKERQUE

Play the free web beta: https://vandiddong.github.io/meowwoof-server/?v=1.5.0

A memory and bombing-accuracy game set in a fictional world inspired by World War I aviation. Study a partly covered map, remember the target, then find it in flight using terrain. Release results appear quickly. Save a 1080×1920 result card or use native sharing on supported devices; the card contains no target map or seed.

Current public release: **1.5.0**. Free play and personal records are available. Production official rankings and Google login are **not connected**; advertising and payments are **not active**.

The privately retained competition implementation allows three free five-round attempts per account per Korean calendar day, assigns fresh maps within round-specific difficulty bands, and publishes a 30-minute leaderboard snapshot. It verifies input logs and computes scores on the server. Production API hosting, Google OAuth configuration, privacy retention/deletion details and physical-device validation remain prerequisites. [Release verification and prerequisites](reports/release-v1.5.0.md).

The original `server.js` remains independent. The game on `gh-pages` contains compiled, obfuscated JavaScript without source maps. Current development source is retained privately in the cloud workspace; earlier source versions remain in public Git history. Browser code can still be inspected or modified. Obfuscation is not encryption or a guarantee against cheating.

`deployment-checks` verifies compiled asset exposure, the real HTTPS five-round game, audio, sharing and mobile controls. The CI workflow verifies the expected release identifier.

Operator: **charlielimJR**. Contact: [vandiddong@gmail.com](mailto:vandiddong@gmail.com).

1.4.0 widens target placement from ±135 to ±360 (60% of map width). Safe, separated starts stay equally distant from the target. Flight duration and bomb pacing remain unchanged. [Free beta publication guide](reports/public-beta-guide.md).

1.4.1 clarified the memorization map with a bright red, pale-outlined target, a slow pulsing ring and plain instructions. In-flight markers stay hidden. App/OS reduced motion shows a static ring. Small mobile landscape maps fit the screen. The free beta continues on GitHub Pages; official accounts/ranking and commercial features require appropriate hosting.

1.5.0 gives ten seconds to memorize the map and twenty seconds to fly, a more generous score curve, vivid matching red/yellow/blue roofs, recognizable apple/note/cup occluders and a five-page field guide before the first local flight. New personal/official record namespaces keep previous scores separate and preserved. [Advertising readiness assessment (Korean)](reports/ad-readiness-review-2026-10-15.md). No advertising SDK was activated.
