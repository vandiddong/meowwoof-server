# Boomkerque 1.4.0: wider targets

Play: https://vandiddong.github.io/meowwoof-server/?v=1.4.0

Targets previously occupied only ±135 of a 1,200-unit map. They now occupy ±360, extending slightly beyond the middle 2×2 cells of a full-map 4×4 grid while staying away from the extreme edge. A seed-selected placement region remains fixed across terrain retries; invalid outward starting positions no longer force targets back toward the center. Five dry, separated starts are selected from a safe arc at equal distance from the target, with an 80-unit buffer before automatic boundary steering.

1,000 generated maps: zero failures or fallback worlds, 847 targets outside the old central square and 287 outside the middle four full-map cells. The aggregate audit includes a 4×4 placement count grid. All twelve terrain archetypes were represented. The official assignment audit accepted 300 maps for 60 accounts with no failures.

Flight duration remains 20 seconds. A controller test reached within 60 units of the target at minimum retained airspeed from all five starts on 16 sampled maps. Bomb physics, inherited momentum and 4× post-release presentation remain unchanged. Local browser measurements: result after release 1.13–1.33 seconds; final scoreboard 140 ms. These measurements are not guarantees for every physical device.

The competition uses fresh-maps-v3 assignment/record/snapshot tables and HMAC namespace, preserving older records without mixing their central-target scores into the new rules. A database regression verifies the isolation and preservation. Accounts remain shared. Production official API hosting is still not configured, so this is implemented/locally tested support rather than a live public ranking.

60 automated tests (21 server tests), build/type checking, compiled-source exposure audit and a full local desktop/mobile browser game passed. Public HTTPS verification runs after publication. Current source and complete Git history are backed up privately, with compiled assets only on gh-pages.

This release can be shared as a free web beta: [publication guide and ready-to-use copy](public-beta-guide.md). Google login, official ranking, ads and payments remain inactive. Hosting/OAuth configuration, final retention/deletion policy, private source hosting and actual-device validation remain prerequisites for the corresponding launch features. Operator charlielimJR and contact vandiddong@gmail.com are published.
