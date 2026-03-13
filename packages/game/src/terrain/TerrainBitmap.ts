import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, DESTROY_RADIUS } from '@worms/shared';
import { generateTerrainBitmap } from './TerrainGenerator.js';

/**
 * Manages the terrain as a bitmap texture in Phaser.
 * Maintains a cached alpha buffer for fast solid/air lookups.
 */
export class TerrainBitmap {
  private canvas: OffscreenCanvas;
  private ctx: OffscreenCanvasRenderingContext2D;
  private texture: Phaser.Textures.CanvasTexture;
  private image: Phaser.GameObjects.Image;
  private alphaBuffer: Uint8Array;

  constructor(private scene: Phaser.Scene, seed: number) {
    const imageData = generateTerrainBitmap(seed);

    // Cache alpha channel for fast lookups
    this.alphaBuffer = new Uint8Array(GAME_WIDTH * GAME_HEIGHT);
    for (let i = 0; i < this.alphaBuffer.length; i++) {
      this.alphaBuffer[i] = imageData.data[i * 4 + 3];
    }

    // Create offscreen canvas and paint terrain
    this.canvas = new OffscreenCanvas(GAME_WIDTH, GAME_HEIGHT);
    this.ctx = this.canvas.getContext('2d')!;
    this.ctx.putImageData(imageData, 0, 0);

    // Create Phaser texture from bitmap
    const texCanvas = scene.textures.createCanvas('terrain', GAME_WIDTH, GAME_HEIGHT)!;
    this.texture = texCanvas;
    const texCtx = this.texture.getContext();
    texCtx.drawImage(this.canvas, 0, 0);
    this.texture.refresh();

    // Display as a Phaser Image
    this.image = scene.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'terrain');
    this.image.setDepth(1);
  }

  /**
   * Carve a circular hole in the terrain at (x, y) with given radius.
   */
  destroy(x: number, y: number, radius: number = DESTROY_RADIUS): void {
    // Carve on offscreen canvas
    this.ctx.globalCompositeOperation = 'destination-out';
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.globalCompositeOperation = 'source-over';

    // Update alpha buffer in the affected region
    const r = Math.ceil(radius);
    const minX = Math.max(0, Math.floor(x) - r);
    const maxX = Math.min(GAME_WIDTH - 1, Math.floor(x) + r);
    const minY = Math.max(0, Math.floor(y) - r);
    const maxY = Math.min(GAME_HEIGHT - 1, Math.floor(y) + r);
    const r2 = radius * radius;

    for (let py = minY; py <= maxY; py++) {
      for (let px = minX; px <= maxX; px++) {
        const dx = px - x;
        const dy = py - y;
        if (dx * dx + dy * dy <= r2) {
          this.alphaBuffer[py * GAME_WIDTH + px] = 0;
        }
      }
    }

    // Sync to Phaser texture
    const texCtx = this.texture.getContext();
    texCtx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    texCtx.drawImage(this.canvas, 0, 0);
    this.texture.refresh();
  }

  /**
   * Check if a pixel is solid terrain. O(1) via alpha buffer.
   */
  isSolid(x: number, y: number): boolean {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    if (ix < 0 || ix >= GAME_WIDTH || iy < 0 || iy >= GAME_HEIGHT) return false;
    return this.alphaBuffer[iy * GAME_WIDTH + ix] > 0;
  }

  /**
   * Scan downward from (x, y) to find the first solid pixel.
   * Returns the y coordinate of the first solid pixel, or null if none found within maxDist.
   */
  findGround(x: number, y: number, maxDist: number): number | null {
    const ix = Math.floor(x);
    const startY = Math.floor(y);
    const endY = Math.min(Math.floor(y + maxDist), GAME_HEIGHT - 1);

    for (let iy = startY; iy <= endY; iy++) {
      if (ix >= 0 && ix < GAME_WIDTH && iy >= 0 && this.alphaBuffer[iy * GAME_WIDTH + ix] > 0) {
        return iy;
      }
    }
    return null;
  }

  /**
   * Bresenham line trace from (x1,y1) to (x2,y2).
   * Returns the first solid pixel hit, or null if the line is clear.
   *
   * On diagonal steps, both corner-adjacent pixels are checked so that
   * thin terrain (1-2px) is never skipped.
   */
  lineCollision(x1: number, y1: number, x2: number, y2: number): { x: number; y: number } | null {
    let ix = Math.floor(x1);
    let iy = Math.floor(y1);
    const ix2 = Math.floor(x2);
    const iy2 = Math.floor(y2);

    const dx = Math.abs(ix2 - ix);
    const dy = Math.abs(iy2 - iy);
    const sx = ix < ix2 ? 1 : -1;
    const sy = iy < iy2 ? 1 : -1;
    let err = dx - dy;

    while (true) {
      if (ix >= 0 && ix < GAME_WIDTH && iy >= 0 && iy < GAME_HEIGHT) {
        if (this.alphaBuffer[iy * GAME_WIDTH + ix] > 0) {
          return { x: ix, y: iy };
        }
      }

      if (ix === ix2 && iy === iy2) break;

      const e2 = 2 * err;
      const stepX = e2 > -dy;
      const stepY = e2 < dx;

      if (stepX && stepY) {
        // Diagonal step — check both corner-adjacent pixels before moving
        // so we never skip thin terrain at the corners
        const cx = ix + sx;
        const cy = iy + sy;
        if (cx >= 0 && cx < GAME_WIDTH && iy >= 0 && iy < GAME_HEIGHT &&
            this.alphaBuffer[iy * GAME_WIDTH + cx] > 0) {
          return { x: cx, y: iy };
        }
        if (ix >= 0 && ix < GAME_WIDTH && cy >= 0 && cy < GAME_HEIGHT &&
            this.alphaBuffer[cy * GAME_WIDTH + ix] > 0) {
          return { x: ix, y: cy };
        }
      }

      if (stepX) { err -= dy; ix += sx; }
      if (stepY) { err += dx; iy += sy; }
    }
    return null;
  }
}
