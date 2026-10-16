# 붐케르크 · BOOMKERQUE

Play the free web beta: https://vandiddong.github.io/meowwoof-server/?v=1.10.0

A memory and bombing-accuracy game set in a fictional world inspired by World War I aviation. Study a partly covered map, remember the target, then find it in flight using terrain. Release results appear quickly. Save a 1080×1920 result card or use native sharing on supported devices; the card contains no target map or seed.

Current public release: **1.10.0**. Free play and personal records are available. Production official rankings and Google login are **not connected**; advertising and payments are **not active**.

New in1.9.0: optional **플레이 점검** shows this browser’s recent30-day completion/retry/next-day-play and frame aggregates after explicit consent. It defaults off, has no automatic upload, supports manual file download and statistics-only deletion, and excludes practice/training/official games. This is a manual beta-test aid, not whole-population analytics.

The privately retained competition implementation allows three free five-round attempts per account per Korean calendar day, assigns fresh maps within round-specific difficulty bands, and publishes a 30-minute leaderboard snapshot. It verifies input logs and computes scores on the server. Production API hosting, Google OAuth configuration, privacy retention/deletion details and physical-device validation remain prerequisites. [Release verification and prerequisites](reports/release-v1.10.0.md).

The original `server.js` remains independent. The game on `gh-pages` contains compiled, obfuscated JavaScript without source maps. Current development source is retained privately in the cloud workspace; earlier source versions remain in public Git history. Browser code can still be inspected or modified. Obfuscation is not encryption or a guarantee against cheating.

`deployment-checks` verifies compiled asset exposure, the real HTTPS five-round game, audio, sharing and mobile controls. The CI workflow verifies the expected release identifier.

Operator: **charlielimJR**. Contact: [vandiddong@gmail.com](mailto:vandiddong@gmail.com).

1.4.0 widens target placement from ±135 to ±360 (60% of map width). Safe, separated starts stay equally distant from the target. Flight duration and bomb pacing remain unchanged. [Free beta publication guide](reports/public-beta-guide.md).

1.4.1 clarified the memorization map with a bright red, pale-outlined target, a slow pulsing ring and plain instructions. In-flight markers stay hidden. App/OS reduced motion shows a static ring. Small mobile landscape maps fit the screen. The free beta continues on GitHub Pages; official accounts/ranking and commercial features require appropriate hosting.

1.5.0 gives ten seconds to memorize the map and twenty seconds to fly, a more generous score curve, vivid matching red/yellow/blue roofs, recognizable apple/note/cup occluders and a five-page field guide before the first local flight. New personal/official record namespaces keep previous scores separate and preserved. [Advertising readiness assessment (Korean)](reports/ad-readiness-review-2026-10-15.md). No advertising SDK was activated.

1.6.0 selects among the full map’s sixteen cells equally, clipping each cell to safe target bounds ±360. A 1,000-map audit reduced the central-four share from 71% to 27.5%; the official 300-map audit yielded 25%. Placement survives terrain and difficulty retries. 1,200 fixed-tick approach checks covered all sixteen cells, five rounds, five starts and three speeds with no failures. Flight remains twenty seconds; scoring and local personal records are retained.

1.7.0 explains each completed drop with a top-down target/impact/release diagram, pilot-relative fore/aft and left/right errors, and contextual advice for the next attempt. The release pose is captured before the aircraft moves on. No-drop has separate guidance. All information appears after the round; gameplay, target placement, scoring and personal records stay on the same rules.

1.8.0 offers an optional hands-on lesson after the first local guide: turn, slow down, then release a bomb while a training target and cyan predicted-impact ring are visible. The final20-second approach starts only after an explicit ready action. A fixed training course and its results stay separate from personal/daily/official records. Retry the drop, repeat the lesson from the menu, or skip and resume the originally requested mode. Official competition bypasses the lesson. Training markers are explicitly concealed again in normal flight.
