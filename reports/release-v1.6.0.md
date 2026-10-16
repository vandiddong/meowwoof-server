# Boomkerque 1.6.0: targets beyond the center

Play: https://vandiddong.github.io/meowwoof-server/?v=1.6.0

Previously the generator divided the safe target envelope itself into sixteen cells. That envelope overlaps the middle four cells of the full map, so targets still landed there 71% of the time. The new generator selects each full-map 4×4 cell with equal probability, then places the target inside its intersection with safe bounds ±360. This gives the middle four an expected 25% and outer twelve 75%, without moving targets to extreme map edges.

| Full-map region | Previous 1,000 maps | New 1,000 maps |
| --- | ---: | ---: |
| Central 2×2 | 71% | 27.5% |
| Outer twelve cells | 29% | 72.5% |

All sixteen cells were used (48–73 targets/cell). The official 300-map audit measured central25%/outer75%. These are sample distributions, not a guarantee that each five-round game contains a fixed mix.

The assigned cell persists through terrain retries and validated fallback selection. Official map seeds reserve a stable region prefix while difficulty candidates vary the terrain suffix, preventing filtering from recentering assignments. Fresh-maps-v5 tables preserve earlier records/accounts separately. The public beta still has no connected official API.

Validation: 62 automated tests; type checking/build/source-exposure audit; 1,000 generated maps with zero failures/fallbacks; 300 official maps with zero failures. A fixed-tick heading controller approached within 60m in all 1,200 cases: sixteen cells × five rounds × five starts × three retained speeds (32/49/76m/s), under the20-second flight limit. The slowest sampled approach took12.51seconds. The official sample added1,170 successful checks across78 round/cell combinations. This establishes sampled path feasibility, not equal human difficulty or actual-device performance. Local/public browser results are recorded after verification.

Map memorization remains10seconds, flight20seconds, with the1.5.0 scoring curve, local records, vivid roofs, tabletop objects and five-page guide. Bomb physics and fast presentation are unchanged. No ads, analytics, payment or production accounts were enabled. No domain/hosting migration or paid cloud changes were made. Current source is privately retained; public deployment contains obfuscated compiled assets without source maps.
