import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, WATER_LEVEL, DESTROY_RADIUS } from '@worms/shared';
import { TerrainBitmap } from '../terrain/TerrainBitmap.js';

const CAMERA_ZOOM = 2;
const ZOOM_MAX = 4;
const ZOOM_STEP = 0.1;

export class GameScene extends Phaser.Scene {
  private terrain!: TerrainBitmap;
  private isDragging = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private camStartX = 0;
  private camStartY = 0;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    // Sky gradient background
    const sky = this.add.graphics();
    sky.fillGradientStyle(0x87CEEB, 0x87CEEB, 0x4682B4, 0x4682B4, 1);
    sky.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    sky.setDepth(0);

    // Generate terrain with a random seed
    const seed = Date.now();
    this.terrain = new TerrainBitmap(this, seed);

    // Water
    const water = this.add.graphics();
    water.fillStyle(0x1E90FF, 0.7);
    water.fillRect(0, WATER_LEVEL, GAME_WIDTH, GAME_HEIGHT - WATER_LEVEL);
    water.setDepth(2);

    // Camera: zoom in and center on terrain
    const cam = this.cameras.main;
    cam.setBounds(0, 0, GAME_WIDTH, GAME_HEIGHT);
    cam.setZoom(CAMERA_ZOOM);
    cam.centerOn(GAME_WIDTH / 2, WATER_LEVEL - 100);

    // Middle-click or right-click drag to pan camera
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.middleButtonDown() || pointer.rightButtonDown()) {
        this.isDragging = true;
        this.dragStartX = pointer.x;
        this.dragStartY = pointer.y;
        this.camStartX = cam.scrollX;
        this.camStartY = cam.scrollY;
      } else if (pointer.leftButtonDown()) {
        // Left-click to destroy terrain (sandbox mode)
        this.terrain.destroy(pointer.worldX, pointer.worldY, DESTROY_RADIUS);
      }
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.isDragging) return;
      const dx = (pointer.x - this.dragStartX) / cam.zoom;
      const dy = (pointer.y - this.dragStartY) / cam.zoom;
      cam.scrollX = this.camStartX - dx;
      cam.scrollY = this.camStartY - dy;
    });

    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (!pointer.middleButtonDown() && !pointer.rightButtonDown()) {
        this.isDragging = false;
      }
    });

    // Scroll wheel to zoom toward mouse position
    const zoomMin = Math.max(this.scale.width / GAME_WIDTH, this.scale.height / GAME_HEIGHT);
    this.input.on('wheel', (pointer: Phaser.Input.Pointer, _gos: unknown[], _dx: number, dy: number) => {
      const oldZoom = cam.zoom;
      const newZoom = Phaser.Math.Clamp(oldZoom - dy * ZOOM_STEP * 0.01, zoomMin, ZOOM_MAX);
      if (newZoom === oldZoom) return;

      // Screen-space mouse position relative to camera viewport
      const px = pointer.x;
      const py = pointer.y;

      // Adjust scroll so the world point under the mouse stays fixed
      cam.scrollX += px * (1 / oldZoom - 1 / newZoom);
      cam.scrollY += py * (1 / oldZoom - 1 / newZoom);
      cam.setZoom(newZoom);
    });

    // Disable right-click context menu on the canvas
    this.game.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }
}
