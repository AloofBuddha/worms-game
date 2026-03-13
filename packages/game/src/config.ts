import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '@worms/shared';
import { BootScene } from './scenes/BootScene.js';
import { GameScene } from './scenes/GameScene.js';

let game: Phaser.Game | null = null;

export function startGame(parent: HTMLElement): void {
  if (game) return;

  game = new Phaser.Game({
    type: Phaser.AUTO,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    parent,
    backgroundColor: '#000000',
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [BootScene, GameScene],
  });
}

export function destroyGame(): void {
  game?.destroy(true);
  game = null;
}
