import Phaser from 'phaser';
import { MenueScene } from './MenueScene';
import { SpielScene } from './SpielScene';

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'spiel',
  width: 800,
  height: 640,
  backgroundColor: '#1b1b2b',
  scene: [MenueScene, SpielScene],
});
