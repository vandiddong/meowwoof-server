# BOMB RUN 1.2.1

Play: https://vandiddong.github.io/meowwoof-server/?v=1.2.1

Post-drop flight is presented at 4x speed. In local browser checks, the five drops reached results in approximately 1.4–1.6 seconds. The physical trajectory still uses exactly the same 120 Hz steps, so impact coordinates, scoring, speed inheritance and practice predictions are unchanged. The optional server's completion-time validation now matches accelerated presentation while continuing to reject premature results. Target placement and the 20-second flight limit are unchanged pending discussion.

45 tests passed, including exact old/new impact equivalence, 30/60/144 FPS consistency and accelerated server acceptance. A full five-round compiled browser game, fast drop timing, mobile input/orientation and audio checks passed. Private source archive and complete Git bundle remain outside public Git. No official production API or real-device testing is newly claimed.

The public verification workflow checks this release's actual HTTPS assets, all five fast drops, final standings, mobile input and audio. Its result is recorded separately after completion.

Final production verification passed: https://github.com/vandiddong/meowwoof-server/actions/runs/38538076517 . All five actual HTTPS drops completed in 1.67–2.14 seconds, with a 10.9 ms final leaderboard paint and zero page errors. The 2.2-second drop assertion remained enabled. HTTPS assets and a fresh private-backup build matched byte-for-byte. Earlier instrumentation was corrected to measure from actual bomb phase; the final pacing rate is 4.
