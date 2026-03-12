import Phaser from 'phaser';
import { GameScene } from './GameScene.js';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  create(): void {
    this.scene.start('GameScene');
  }
}
