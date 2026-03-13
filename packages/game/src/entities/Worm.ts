import Phaser from 'phaser';
import { TerrainBitmap } from '../terrain/TerrainBitmap.js';

const WALK_SPEED = 80;
const JUMP_VX = 120;
const JUMP_VY = -250;
const GRAVITY = 500;
const BODY_HEIGHT = 14;
const CLIMB_LIMIT = 6; // max pixels the worm can step up per move
const GROUND_PROBE = 4; // pixels below feet to detect ground
const FALL_SEARCH = 200; // max distance to scan for ground when falling

// Worm visual: a chain of segments that follow the head
const SEGMENT_COUNT = 5;
const SEGMENT_RADIUS = 4;
const SEGMENT_SPACING = 5;
const WIGGLE_AMPLITUDE = 1.5;
const WIGGLE_SPEED = 12;

export class Worm {
  x: number;
  y: number; // y = bottom of worm (feet position)
  private vx = 0;
  private vy = 0;
  private grounded = false;
  facingRight = true;

  private scene: Phaser.Scene;
  private terrain: TerrainBitmap;
  private segments: Phaser.GameObjects.Arc[] = [];
  private segmentPositions: { x: number; y: number }[] = [];
  private isMoving = false;
  private wiggleTime = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, terrain: TerrainBitmap, color: number = 0xFF0000) {
    this.scene = scene;
    this.terrain = terrain;
    this.x = x;
    this.y = y;

    // Create visual segments (head + trailing body)
    const headColor = Phaser.Display.Color.IntegerToColor(color).brighten(30).color;
    for (let i = 0; i < SEGMENT_COUNT; i++) {
      const r = i === 0 ? SEGMENT_RADIUS + 1 : SEGMENT_RADIUS - i * 0.3;
      const c = i === 0 ? headColor : color;
      const seg = scene.add.circle(x, y, Math.max(r, 1.5), c);
      seg.setDepth(3);
      this.segments.push(seg);
      this.segmentPositions.push({ x, y: y - BODY_HEIGHT / 2 });
    }
  }

  /**
   * Main update — runs every frame regardless of input.
   * 1. Verify ground state (terrain may have changed under us)
   * 2. Apply physics (gravity for airborne, walking for grounded)
   * 3. Update visuals
   */
  update(dt: number): void {
    // Step 1: Always verify ground state
    this.checkGroundState();

    // Step 2: Apply physics
    if (this.grounded) {
      this.updateGrounded(dt);
    } else {
      this.updateAirborne(dt);
    }

    // Step 3: Visuals
    this.updateVisuals(dt);
    this.isMoving = false;
  }

  /** Check if ground still exists beneath us — terrain can be destroyed at any time */
  private checkGroundState(): void {
    if (!this.grounded) return;

    // Are we still standing on solid ground?
    const feetOnSolid = this.terrain.isSolid(this.x, this.y) ||
                        this.terrain.isSolid(this.x, this.y + 1);
    if (!feetOnSolid) {
      this.grounded = false;
      this.vx = 0;
      this.vy = 0;
    }
  }

  private updateGrounded(dt: number): void {
    if (this.vx === 0) return;

    const moveAmount = this.vx * dt;
    const steps = Math.max(1, Math.ceil(Math.abs(moveAmount)));
    const stepX = moveAmount / steps;

    for (let i = 0; i < steps; i++) {
      const newX = this.x + stepX;

      // Find the terrain surface at the new x position
      let foundY: number | null = null;
      for (let probe = -CLIMB_LIMIT; probe <= GROUND_PROBE; probe++) {
        const testY = this.y + probe;
        if (this.terrain.isSolid(newX, testY) && !this.terrain.isSolid(newX, testY - 1)) {
          foundY = testY;
          break;
        }
      }

      if (foundY !== null) {
        // Check the worm body isn't embedded in terrain
        const headY = foundY - BODY_HEIGHT;
        if (!this.terrain.isSolid(newX, headY)) {
          this.x = newX;
          this.y = foundY;
        }
        // else: blocked by wall, stop
      } else {
        // No surface in climb/probe range — check for a short drop (walking off a small ledge)
        const groundBelow = this.terrain.findGround(newX, this.y, GROUND_PROBE + 1);
        if (groundBelow !== null) {
          this.x = newX;
          this.y = groundBelow;
        } else {
          // Walked off an edge — become airborne
          this.x = newX;
          this.grounded = false;
          this.vy = 0;
          return;
        }
      }
    }

    this.vx = 0;
  }

  private updateAirborne(dt: number): void {
    this.vy += GRAVITY * dt;

    const newX = this.x + this.vx * dt;
    const newY = this.y + this.vy * dt;

    // Bresenham trace from current feet to new feet
    const hit = this.terrain.lineCollision(this.x, this.y, newX, newY);

    if (hit) {
      this.x = hit.x;
      this.y = hit.y;
      // Nudge up to the surface
      while (this.y > 0 && this.terrain.isSolid(this.x, this.y - 1)) {
        this.y--;
      }
      this.vx = 0;
      this.vy = 0;
      this.grounded = true;
    } else {
      this.x = newX;
      this.y = newY;
    }
  }

  private updateVisuals(dt: number): void {
    // Head position is center of worm body, above feet
    const headX = this.x;
    const headY = this.y - BODY_HEIGHT / 2;

    this.segmentPositions[0].x = headX;
    this.segmentPositions[0].y = headY;

    // Trail segments follow the one ahead, then settle onto terrain
    for (let i = 1; i < SEGMENT_COUNT; i++) {
      const prev = this.segmentPositions[i - 1];
      const curr = this.segmentPositions[i];
      const dx = prev.x - curr.x;
      const dy = prev.y - curr.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > SEGMENT_SPACING) {
        const ratio = SEGMENT_SPACING / dist;
        curr.x = prev.x - dx * ratio;
        curr.y = prev.y - dy * ratio;
      }

      // Gravity for segments: settle onto terrain surface
      // Find ground below the segment and clamp it there
      const segGround = this.terrain.findGround(curr.x, curr.y, SEGMENT_SPACING * 2);
      if (segGround !== null) {
        // Segment rests on surface (offset up by its radius so it sits on top)
        const surfaceY = segGround - SEGMENT_RADIUS * 0.5;
        if (curr.y < surfaceY) {
          // Segment is above ground — let it be (chain tension holds it up)
        } else {
          // Segment would be in or below ground — clamp to surface
          curr.y = Math.min(curr.y, surfaceY);
        }
      }
    }

    // Wiggle animation when moving
    if (this.isMoving) {
      this.wiggleTime += dt * WIGGLE_SPEED;
    } else {
      this.wiggleTime *= 0.9;
    }

    // Apply positions + wiggle to sprites
    for (let i = 0; i < SEGMENT_COUNT; i++) {
      const pos = this.segmentPositions[i];
      const wiggle = i > 0 ? Math.sin(this.wiggleTime + i * 1.5) * WIGGLE_AMPLITUDE * (i / SEGMENT_COUNT) : 0;
      this.segments[i].setPosition(pos.x, pos.y + wiggle);
    }
  }

  moveLeft(): void {
    if (!this.grounded) return;
    this.facingRight = false;
    this.isMoving = true;
    this.vx = -WALK_SPEED;
  }

  moveRight(): void {
    if (!this.grounded) return;
    this.facingRight = true;
    this.isMoving = true;
    this.vx = WALK_SPEED;
  }

  jump(): void {
    if (!this.grounded) return;
    const dir = this.facingRight ? 1 : -1;
    this.vx = JUMP_VX * dir;
    this.vy = JUMP_VY;
    this.grounded = false;
    // Nudge above surface so the Bresenham trace doesn't immediately re-collide
    this.y -= 2;
  }

  getPosition(): { x: number; y: number } {
    return { x: this.x, y: this.y - BODY_HEIGHT / 2 };
  }
}
