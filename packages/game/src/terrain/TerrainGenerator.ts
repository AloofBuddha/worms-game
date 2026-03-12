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

export function generateTerrainBitmap(seed: number): ImageData {
  const width = GAME_WIDTH;
  const height = GAME_HEIGHT;

  const noise2D = createNoise2D(seededRandom(seed));

  const imageData = new ImageData(width, height);
  const data = imageData.data;

  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      const idx = (y * width + x) * 4;

      // Vertical gradient: more likely solid at bottom
      const depthFactor = y / height;

      // Multi-octave noise
      const nx = x / width;
      const ny = y / height;
      let noiseVal =
        0.5 * noise2D(nx * 4, ny * 4) +
        0.25 * noise2D(nx * 8, ny * 8) +
        0.125 * noise2D(nx * 16, ny * 16);

      // Combine: below a threshold = solid terrain
      const threshold = -0.3 + depthFactor * 1.2;
      const isSolid = noiseVal < threshold && y > height * 0.15 && y < WATER_LEVEL;

      if (isSolid) {
        // Check if this pixel is near the terrain surface (edge detection)
        const edgeDepth = 8;
        let isEdge = false;

        // Simple edge detection: check if there's air above within edgeDepth pixels
        for (let dy = 1; dy <= edgeDepth; dy++) {
          const checkY = y - dy;
          if (checkY < 0) {
            isEdge = true;
            break;
          }
          const checkNx = x / width;
          const checkNy = checkY / height;
          const checkDepthFactor = checkY / height;
          const checkNoise =
            0.5 * noise2D(checkNx * 4, checkNy * 4) +
            0.25 * noise2D(checkNx * 8, checkNy * 8) +
            0.125 * noise2D(checkNx * 16, checkNy * 16);
          const checkThreshold = -0.3 + checkDepthFactor * 1.2;
          const checkSolid = checkNoise < checkThreshold && checkY > height * 0.15 && checkY < WATER_LEVEL;
          if (!checkSolid) {
            isEdge = true;
            break;
          }
        }

        if (isEdge) {
          // Green grass edge
          data[idx] = 34;     // R
          data[idx + 1] = 139; // G
          data[idx + 2] = 34;  // B
        } else {
          // Brown dirt interior
          data[idx] = 139;    // R
          data[idx + 1] = 69;  // G
          data[idx + 2] = 19;  // B
        }
        data[idx + 3] = 255; // A (opaque = solid)
      } else {
        // Transparent = air
        data[idx] = 0;
        data[idx + 1] = 0;
        data[idx + 2] = 0;
        data[idx + 3] = 0;
      }
    }
  }

  return imageData;
}
