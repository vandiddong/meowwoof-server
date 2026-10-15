# Boomkerque 1.5.0: learn, remember, try again

Play: https://vandiddong.github.io/meowwoof-server/?v=1.5.0

Map study now lasts 10 seconds; flight remains 20 seconds. Scores use round(100/(1+(distance/180)^1.5)): 50m=87, 100m=71, 200m=46, no drop=0. New personal and official record namespaces preserve earlier data without mixing score curves. Official competition is fresh-maps-v4; fixed flight/bomb physics is unchanged.

Roofs use vivid red/yellow/blue in the map and 3D world. Green apples, folded notes and coffee cups replace ink/water/tear masks. Occlusion still uses the rendered contours and protects targets/core clues. A five-page illustrated field guide explains memory, map objects, PC/touch controls, a single drop and scoring. It appears before first local play, with previous/next/skip/reopen and keyboard navigation; the round clock has not started while reading. App/OS reduced motion is supported.

Validation: 61 automated tests; type checking/build/source-exposure audit; 1,000 generated maps and 300 official maps without failures/fallbacks; a local five-round real-browser game plus audio/mobile/share and guide checks on desktop/portrait/landscape; a real local API five-round verified attempt. Local observed post-drop results 1.18–1.26 seconds and final board 136ms. Physical phones remain untested. Public HTTPS checks run after deployment.

Public beta remains free/static. Official rankings, Google login, ads, payments and analytics are not connected. Commercial hosting/API, ad approval/policies and retention/real-device checks remain prerequisites. [Short advertising-readiness review](ad-readiness-review-2026-10-15.md) is a separate proposal; its future suggestions were not implemented. No domain or paid AWS resource was changed.

Current source remains local-only with private archive and Git bundle. Public deployment contains obfuscated compiled assets without source maps. Obfuscation does not prevent inspection or guarantee anti-cheating.
