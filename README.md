# BOMB RUN

Play: https://vandiddong.github.io/meowwoof-server/

The original `server.js` remains independent. The current game is deployed as compiled, obfuscated JavaScript on `gh-pages`. Current development source is retained privately in the cloud workspace and is not included in new public commits. Earlier source versions remain in public Git history; prior publication cannot be undone by hiding the current files.

`deployment-checks` verifies the compiled release, Web Audio output, a full five-round game and mobile controls. The CI workflow checks the published release version and the real HTTPS site. Obfuscation and removal of source maps reduce casual source inspection; browser code can still be inspected and modified. Server-authoritative competition is needed for trusted rankings.

Current release: **1.2.1**. Wind and friend rooms are removed; adjusted airspeed persists after releasing controls; bombs carry moderate forward momentum; final standings use cached AI results. [Release verification and remaining prerequisites](reports/release-v1.2.1.md) distinguishes locally verified server support from unconfigured production hosting and actual-device checks.

The 1.2.1 update accelerates only post-drop presentation. Impact positions and scoring remain identical; target placement and flight duration await discussion.
