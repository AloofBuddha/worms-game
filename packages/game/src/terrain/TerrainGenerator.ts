import { createNoise2D } from 'simplex-noise';
import { GAME_WIDTH, GAME_HEIGHT, WATER_LEVEL } from '@worms/shared';

/** Simple seeded PRNG (mulberry32) */
function seededRandom(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Noise sampled at absolute pixel scale so terrain features are consistent
const SCALE = 0.005;
const EDGE_DEPTH = 6;
// Terrain lives in the bottom portion of the map
const SKY_CUTOFF = 0.3;

function sampleNoise(noise2D: (x: number, y: number) => number, x: number, y: number): number {
  return (
    0.5  * noise2D(x * SCALE, y * SCALE) +
    0.25 * noise2D(x * SCALE * 2, y * SCALE * 2) +
    0.125 * noise2D(x * SCALE * 4, y * SCALE * 4)
  );
}

function isSolidAt(noise2D: (x: number, y: number) => number, x: number, y: number): boolean {
  const depthFactor = y / GAME_HEIGHT;
  const threshold = -0.2 + depthFactor * 1.0;
  return sampleNoise(noise2D, x, y) < threshold && y > GAME_HEIGHT * SKY_CUTOFF && y < WATER_LEVEL;
}

export function generateTerrainBitmap(seed: number): ImageData {
  const width = GAME_WIDTH;
  const height = GAME_HEIGHT;
  const noise2D = createNoise2D(seededRandom(seed));
  const imageData = new ImageData(width, height);
  const data = imageData.data;

  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      const idx = (y * width + x) * 4;

      if (!isSolidAt(noise2D, x, y)) continue; // transparent by default (ImageData is zeroed)

      // Edge detection: check if air is above within EDGE_DEPTH pixels
      let isEdge = false;
      for (let dy = 1; dy <= EDGE_DEPTH; dy++) {
        if (!isSolidAt(noise2D, x, y - dy)) {
          isEdge = true;
          break;
        }
      }

      if (isEdge) {
        data[idx] = 34;      // green grass
        data[idx + 1] = 139;
        data[idx + 2] = 34;
      } else {
        data[idx] = 139;     // brown dirt
        data[idx + 1] = 69;
        data[idx + 2] = 19;
      }
      data[idx + 3] = 255;
    }
  }

  return imageData;
}
