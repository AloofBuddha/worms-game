import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, WATER_LEVEL, DESTROY_RADIUS } from '@worms/shared';
import { TerrainBitmap } from '../terrain/TerrainBitmap.js';
import { Worm } from '../entities/Worm.js';

const ZOOM_DEFAULT = 3;
const ZOOM_MAX = 4;
const ZOOM_STEP = 0.1;
const CAMERA_LERP = 0.08; // smooth follow speed (0 = no follow, 1 = instant)

export class GameScene extends Phaser.Scene {
  private terrain!: TerrainBitmap;
  private activeWorm!: Worm;
  private keys!: Record<'A' | 'D' | 'ENTER', Phaser.Input.Keyboard.Key>;
  private isDragging = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private camStartX = 0;
  private camStartY = 0;
  private debugGraphics!: Phaser.GameObjects.Graphics;
  private showDebug = false;
  private cameraFollowing = true; // camera tracks active worm by default

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

    // Spawn worm — drop from above center of map
    this.activeWorm = new Worm(this, GAME_WIDTH / 2, 50, this.terrain);

    // Movement controls
    this.keys = {
      A: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      D: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      ENTER: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER),
    };

    // Camera setup — zoomed in, follow logic in update() handles positioning
    const cam = this.cameras.main;
    cam.setBounds(0, 0, GAME_WIDTH, GAME_HEIGHT);
    cam.setZoom(ZOOM_DEFAULT);
    // Snap to worm immediately on first frame
    const wormPos = this.activeWorm.getPosition();
    cam.centerOn(wormPos.x, wormPos.y);

    // Middle-click or right-click drag to pan camera (disables auto-follow)
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.middleButtonDown() || pointer.rightButtonDown()) {
        this.isDragging = true;
        this.cameraFollowing = false; // manual pan overrides follow
        this.dragStartX = pointer.x;
        this.dragStartY = pointer.y;
        this.camStartX = cam.scrollX;
        this.camStartY = cam.scrollY;
      } else if (pointer.leftButtonDown()) {
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

      const dx2 = pointer.x - cam.width * 0.5;
      const dy2 = pointer.y - cam.height * 0.5;

      cam.scrollX += dx2 * (1 / oldZoom - 1 / newZoom);
      cam.scrollY += dy2 * (1 / oldZoom - 1 / newZoom);
      cam.setZoom(newZoom);
    });

    // Debug overlay — L key toggles ground-detection rays
    this.debugGraphics = this.add.graphics();
    this.debugGraphics.setDepth(10);
    this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.L).on('down', () => {
      this.showDebug = !this.showDebug;
      if (!this.showDebug) {
        this.debugGraphics.clear();
      }
    });

    // Disable right-click context menu on the canvas
    this.game.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  update(_time: number, delta: number): void {
    const dt = delta / 1000;

    // Input — any movement key re-enables camera follow
    if (this.keys.A.isDown) {
      this.activeWorm.moveLeft();
      this.cameraFollowing = true;
    }
    if (this.keys.D.isDown) {
      this.activeWorm.moveRight();
      this.cameraFollowing = true;
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.ENTER)) {
      this.activeWorm.jump();
      this.cameraFollowing = true;
    }

    // Update worm physics
    this.activeWorm.update(dt);

    // Camera: smooth follow active worm
    if (this.cameraFollowing && !this.isDragging) {
      const cam = this.cameras.main;
      const pos = this.activeWorm.getPosition();
      const targetX = pos.x - cam.width * 0.5;
      const targetY = pos.y - cam.height * 0.5;
      cam.scrollX += (targetX - cam.scrollX) * CAMERA_LERP;
      cam.scrollY += (targetY - cam.scrollY) * CAMERA_LERP;
    }

    // Debug overlay
    if (this.showDebug) {
      this.debugGraphics.clear();
      const pos = this.activeWorm.getPosition();
      this.debugGraphics.lineStyle(1, 0x00ff00);
      this.debugGraphics.strokeCircle(this.activeWorm.x, this.activeWorm.y, 2);
      this.debugGraphics.lineStyle(1, 0xff0000);
      this.debugGraphics.strokeCircle(pos.x, pos.y, 3);
      this.debugGraphics.lineStyle(1, 0xffff00);
      this.debugGraphics.lineBetween(this.activeWorm.x, this.activeWorm.y, this.activeWorm.x, this.activeWorm.y + 20);
    }
  }
}
