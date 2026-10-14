# Boomkerque 1.4.1: clearer briefing targets

Play: https://vandiddong.github.io/meowwoof-server/?v=1.4.1

The five-second memorization map now identifies the impact target with a bright red flag/crosshair and pale outline. A slow 1.3-second pulsing ring draws attention to the target; the underlying marker remains visible throughout. Instructions explain remembering the red flag relative to rivers, villages and mountains. The marker is an impact target, not a precise instruction to release directly above it.

The ring is static for both the in-game reduced-motion setting and OS preference. Map and ring are removed at flight start, preserving the memory competition. Small landscape screens now show the whole map. Target placement bounds, fixed physics, flight time and bomb presentation speed are unchanged from 1.4.0.

60 automated tests, production build/type checking and compiled-source exposure audit passed. The local browser completed five rounds, audio, sharing and mobile controls, then tested aligned red pixels/pulse, in-flight indicator removal, desktop, 844×390/667×375 landscape, 390×844 portrait and both reduced-motion modes. No JS errors. Physical devices remain untested. Public HTTPS verification runs after deployment.

The current free static beta stays on GitHub Pages. Pages does not run the Node/SQLite official API. Official accounts/ranking, Google login, ads and payments remain inactive. Appropriate frontend/API hosting is needed before account/commercial launch. [GitHub Pages usage policy](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits) restricts online business, commercial transaction/SaaS sites and sensitive transactions; the current beta exposes none of these. [Free beta guide](public-beta-guide.md).

Source remains local-only with private archive/Git bundle. Public gh-pages contains obfuscated compiled assets without source maps. No Lightsail instance, paid infrastructure or domain was created or changed for this update.

[Public HTTPS verification passed](https://github.com/vandiddong/meowwoof-server/actions/runs/38572216444): full five-round game/audio/share/mobile plus all five marker/layout/motion checks. Ring position matched the red canvas target and indicators were removed in flight. Observed post-drop results 1.14–1.25 seconds and final scoreboard 41 ms. All live asset bytes matched the local audited build over verified HTTPS. Physical devices remain untested.
