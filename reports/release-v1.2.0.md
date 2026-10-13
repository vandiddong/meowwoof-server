# BOMB RUN 1.2.0

Play: https://vandiddong.github.io/meowwoof-server/?v=1.2.0

Bombs now inherit moderate forward momentum between the previous long throw and short near-vertical drop. Releasing the speed controls retains the changed airspeed. Wind is removed from generation, physics and the display. Friend rooms are removed. AI competitors are computed in small chunks during rounds; final standings consume cached results. Existing graphics, concealed in-flight targets, organic map damage and audio remain.

Validation: 43 passing tests, including 9 real HTTP server tests; 1,000 generated seeds, zero failures; a complete desktop five-round game and mobile touch/orientation/audio checks passed locally. Final standings painted in 6.8 ms in the local browser measurement, rather than running fresh AI flight calculations. This number is one emulated-browser measurement, not a guarantee for every device.

An authenticated daily competition service and browser integration are implemented and locally verified through five real browser rounds. The server owns date/current-round seed/start slot/deadline, recomputes flight/impact/score from bounded input logs, rejects submitted score or speed fields, rejects invalid/late/duplicate submissions, and persists accepted results in SQLite. No production API hosting address or hosting credentials are configured, so official online competition is not activated on this public site. Local daily records remain clearly labelled. Friend-room multiplayer is not restored.

Latest development source is kept out of new public commits. It is retained privately in the cloud workspace, a checksum-verified 56-file source archive and a complete Git bundle. A fresh isolated checkout restored from the bundle passed npm ci, all 43 tests, build and exposure audit. Public production assets match the fresh restored build. Private repository creation is still denied by the connected GitHub integration; external private source migration remains blocked. Obfuscation and missing source maps cannot completely hide JavaScript running in a browser; older public source history still exists.

Actual Android/iPhone hardware, silent-switch/Bluetooth routing and device FPS were not tested: no physical device or remote-device service is connected. Automated checks cover mobile first-touch audio, simultaneous steering/braking, retained speed, viewport rotation, engine/effects output, mute and suspended AudioContext resumption. Production HTTPS verification runs through the public CI workflow and records its own evidence.
