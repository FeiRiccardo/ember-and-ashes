import Phaser from 'phaser'
import { GameBoardScene } from './scenes/GameBoardScene'

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'app',
  width: 640,
  height: 792,
  backgroundColor: '#2b2b2b',
  scene: [GameBoardScene],
}

new Phaser.Game(config)

// Register the service worker so the app shell can install ("Add to Home Screen") and
// reload offline. Registered relative to this page's own URL so it keeps working when
// served from a GitHub Pages project subpath (see vite.config.ts's `base: './'`).
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((error) => {
      console.error('Service worker registration failed:', error)
    })
  })
}
