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
}
