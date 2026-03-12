import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '@worms/shared';
import { TerrainBitmap } from './TerrainBitmap.js';

const CELL_SIZE = 16;
const COLS = Math.ceil(GAME_WIDTH / CELL_SIZE);
const ROWS = Math.ceil(GAME_HEIGHT / CELL_SIZE);

/**
 * Generates Matter.js static rectangle bodies from the terrain bitmap.
 * Simple grid: each cell is sampled, and solid cells get a static rectangle.
 */
export class TerrainPhysics {
  private bodies: (MatterJS.BodyType | null)[][] = [];
  private scene: Phaser.Scene;
  private terrainBitmap: TerrainBitmap;

  constructor(scene: Phaser.Scene, terrainBitmap: TerrainBitmap) {
    this.scene = scene;
    this.terrainBitmap = terrainBitmap;

    for (let row = 0; row < ROWS; row++) {
      this.bodies[row] = new Array(COLS).fill(null);
    }

    this.rebuildAll();
  }

  rebuildAll(): void {
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        this.rebuildCell(row, col);
      }
    }
  }

  rebuildAround(x: number, y: number, radius: number): void {
    const minCol = Math.max(0, Math.floor((x - radius) / CELL_SIZE) - 1);
    const maxCol = Math.min(COLS - 1, Math.ceil((x + radius) / CELL_SIZE) + 1);
    const minRow = Math.max(0, Math.floor((y - radius) / CELL_SIZE) - 1);
    const maxRow = Math.min(ROWS - 1, Math.ceil((y + radius) / CELL_SIZE) + 1);

    for (let row = minRow; row <= maxRow; row++) {
      for (let col = minCol; col <= maxCol; col++) {
        this.rebuildCell(row, col);
      }
    }
  }

  private rebuildCell(row: number, col: number): void {
    if (this.bodies[row][col]) {
      this.scene.matter.world.remove(this.bodies[row][col]!);
      this.bodies[row][col] = null;
    }

    const cellX = col * CELL_SIZE;
    const cellY = row * CELL_SIZE;
    const cx = cellX + CELL_SIZE / 2;
    const cy = cellY + CELL_SIZE / 2;

    // Sample a few points in the cell to decide if it's solid enough for a body
    const half = CELL_SIZE / 2;
    const quarter = CELL_SIZE / 4;
    let solidCount = 0;
    const samples = [
      [cx, cy],
      [cx - quarter, cy - quarter], [cx + quarter, cy - quarter],
      [cx - quarter, cy + quarter], [cx + quarter, cy + quarter],
    ];
    for (const [sx, sy] of samples) {
      if (this.terrainBitmap.isSolid(sx, sy)) solidCount++;
    }

    // Place a body if majority of samples are solid
    if (solidCount >= 3) {
      this.bodies[row][col] = this.scene.matter.add.rectangle(
        cx, cy, CELL_SIZE, CELL_SIZE,
        { isStatic: true, friction: 0.8 }
      );
    }
  }
}
