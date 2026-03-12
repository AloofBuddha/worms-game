import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, DESTROY_RADIUS } from '@worms/shared';
import { generateTerrainBitmap } from './TerrainGenerator.js';

/**
 * Manages the terrain as a bitmap texture in Phaser.
 * Supports carving (destruction) via canvas composite operations.
 */
export class TerrainBitmap {
  private canvas: OffscreenCanvas;
  private ctx: OffscreenCanvasRenderingContext2D;
  private texture: Phaser.Textures.CanvasTexture;
  private image: Phaser.GameObjects.Image;

  constructor(private scene: Phaser.Scene, seed: number) {
    // Generate terrain data
    const imageData = generateTerrainBitmap(seed);

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

    // Sync to Phaser texture
    const texCtx = this.texture.getContext();
    texCtx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    texCtx.drawImage(this.canvas, 0, 0);
    this.texture.refresh();
  }

  /**
   * Check if a pixel is solid terrain.
   */
  isSolid(x: number, y: number): boolean {
    if (x < 0 || x >= GAME_WIDTH || y < 0 || y >= GAME_HEIGHT) return false;
    const pixel = this.ctx.getImageData(Math.floor(x), Math.floor(y), 1, 1).data;
    return pixel[3] > 0;
  }

  getCanvas(): OffscreenCanvas {
    return this.canvas;
  }
}
