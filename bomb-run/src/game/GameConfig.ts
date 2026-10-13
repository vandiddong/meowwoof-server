export const CONFIG = {
  rounds: 5, mapSeconds: 5, mapExitSeconds: 0.65, flightSeconds: 20,
  fixedStep: 1 / 120, maxCatchupSeconds: 0.25,
  world: { size: 1200, maxHeight: 110, terrainSegments: 80, treeCount: 320, villageCount: 6, windMax: 9, startRadius: [340,440], forestCount: 7, maxAttempts: 80,
    difficultyBands: [[25,35],[35,45],[45,55],[55,65],[65,75]],
    damageBands: [[0,0],[0.02,0.05],[0.10,0.15],[0.15,0.20],[0.20,0.28]],
    weights: { distance: 18, similarity: 22, symmetry: 10, uniqueness: 10, visibility: 12, damage: 23, reachability: 5 } },
  flight: { altitude: 155, minSpeed: 32, cruiseSpeed: 49, maxSpeed: 76, acceleration: 1.6,
    maxTurnRate: 0.8, turnResponse: 3.2, maxBank: Math.PI / 4, boundaryMargin: 95 },
  bomb: { gravity: 9.81, drag: 0.12, windAcceleration: 0.75, radius: 1.5 },
  scoring: { scale: 90, exponent: 1.3 },
  effects: { revealSeconds: 0.6, puffSeconds: 2.5 },
  quality: { maxPixelRatio: 1.8, lowPixelRatio: 1 },
} as const;
export type Settings = { sound: boolean; quality: 'auto'|'low'|'high'; sensitivity: number; reducedMotion: boolean; trajectory: boolean };
export const DEFAULT_SETTINGS: Settings = { sound: true, quality: 'auto', sensitivity: 1, reducedMotion: false, trajectory: true };
