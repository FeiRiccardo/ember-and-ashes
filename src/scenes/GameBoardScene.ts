import Phaser from 'phaser'
import { TurnManager } from '../systems/TurnManager'
import { generateMap } from '../systems/MapGenerator'
import { TERRAIN_COLORS, type TerrainType } from '../data/terrain'
import { ResourceSystem } from '../systems/ResourceSystem'
import { PopulationSystem } from '../systems/PopulationSystem'
import { HazardSystem } from '../systems/HazardSystem'
import { AIOpponent } from '../systems/AIOpponent'
import { ScoreSystem } from '../systems/ScoreSystem'
import { PrestigeSystem } from '../systems/PrestigeSystem'
import { SaveSystem } from '../systems/SaveSystem'
import { computeHints } from '../systems/HintSystem'
import { RESOURCE_ORDER, RESOURCE_LABELS } from '../data/resources'
import { BUILDING_DEFS, BUILDABLE_TYPES, type BuildingType } from '../data/buildings'
import {
  isTerrainSatisfied,
  hasWaterBonus,
  canAfford,
  deductCost,
  formatCost,
  type BuildingGrid,
} from '../systems/BuildingPlacement'

const GRID_SIZE = 8
const TILE_SIZE = 80
const GRID_PIXELS = GRID_SIZE * TILE_SIZE
const RESOURCE_BAR_HEIGHT = 92
const GRID_TOP = RESOURCE_BAR_HEIGHT
// Two 60px rows: primary controls (Turn counter + End Turn), then secondary
// controls (Save & Quit, Reset, Hints) — added when the bottom bar outgrew a
// single row of buttons.
const UI_BAR_HEIGHT = 120
const UI_ROW_HEIGHT = 60

const TOWN_HALL_TILE = { row: 3, col: 3 }

// Flat UI palette (ticket 13): a warm "ash and ember" dark theme instead of a
// generic neutral dark-mode gray, tying the chrome to the game's own title.
// Gold trim nods to the Town Hall/crown motif; parchment text keeps body
// copy warm instead of stark white.
const UI_FONT = 'Georgia, "Times New Roman", serif'
const UI_BG = 0x241f1a
const UI_BORDER = 0xc9a227
const UI_TEXT = '#f0e6d2'
const UI_TEXT_MUTED = '#b8a98c'
const UI_TEXT_DISABLED = '#8a7f6e'
const UI_TEXT_DANGER = '#d1603a'
const BUTTON_PRIMARY = 0x3f6b47
const BUTTON_SECONDARY = 0x3a4a63

// Flat icon accent colors (ticket 13): a dark-ink/parchment-cream pair used
// to draw each building's icon glyph on top of its BUILDING_DEFS color, plus
// one warm highlight for Forge's flame.
const ICON_INK = 0x2b2620
const ICON_CREAM = 0xf2e9d8
const ICON_FLAME = 0xffc93c

export class GameBoardScene extends Phaser.Scene {
  private turnManager = new TurnManager()
  private resourceSystem = new ResourceSystem()
  private turnText!: Phaser.GameObjects.Text
  private resourceText!: Phaser.GameObjects.Text
  private scoreText!: Phaser.GameObjects.Text
  private prestigeText!: Phaser.GameObjects.Text
  private terrainMap: TerrainType[][] = []
  private terrainVisuals: Phaser.GameObjects.Rectangle[][] = []
  private buildings: BuildingGrid = []
  private farmWaterBonus: boolean[][] = []
  private buildingVisuals: Phaser.GameObjects.GameObject[][][] = []
  private populationSystem = new PopulationSystem(this.resourceSystem, () =>
    this.countBuildingsOfType('farm'),
  )
  private prestigeSystem = new PrestigeSystem(this.resourceSystem)
  private scoreSystem = new ScoreSystem(this.resourceSystem, this, () =>
    this.prestigeSystem.onAgeComplete(),
  )
  private saveSystem = new SaveSystem()
  private buildMenu?: Phaser.GameObjects.Container
  // Single shared Graphics layer holding every tile's terrain texture accent
  // (see drawTerrainTexture); recreated each time drawGrid() runs.
  private terrainTextureGraphics?: Phaser.GameObjects.Graphics
  // Raid/hazard messages collected during the turn just ending (via the
  // `notify` callback passed to AIOpponent/HazardSystem), shown as a
  // dismissible report once End Turn finishes.
  private pendingEvents: string[] = []
  private notificationPanel?: Phaser.GameObjects.Container
  private resetConfirmPanel?: Phaser.GameObjects.Container
  private hintsPanel?: Phaser.GameObjects.Container
  private hintsVisible = false

  constructor() {
    super('GameBoard')
  }

  create() {
    this.buildingVisuals = Array.from({ length: GRID_SIZE }, () =>
      Array.from({ length: GRID_SIZE }, () => []),
    )

    const saved = this.saveSystem.load()
    if (saved) {
      this.terrainMap = saved.terrainMap
      this.buildings = saved.buildings
      this.farmWaterBonus = saved.farmWaterBonus
      this.resourceSystem.setAll(saved.resources)
      this.turnManager.setTurnNumber(saved.turnNumber)
      this.scoreSystem.setAge(saved.age)
      this.prestigeSystem.setAgesCompleted(saved.agesCompleted)
    } else {
      this.terrainMap = generateMap(Date.now())
      this.buildings = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null))
      this.farmWaterBonus = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(false))
      this.buildings[TOWN_HALL_TILE.row][TOWN_HALL_TILE.col] = 'townHall'
    }

    this.resourceSystem.registerWithTurnManager(this.turnManager, () => this.scoreSystem.getAge())
    this.populationSystem.registerWithTurnManager(this.turnManager)
    this.scoreSystem.registerWithTurnManager(this.turnManager)
    this.registerFarmProduction()
    this.registerHazardSystem()
    this.registerAutoSave()
    this.drawGrid()
    this.createResourceBar()
    this.createTurnUI()

    // AI TURN HOOK: ticket 07 (AI Opponent) registers its aiTurn-phase handler here.
    new AIOpponent(
      this.resourceSystem,
      this,
      () => this.scoreSystem.getAge(),
      (message) => this.pendingEvents.push(message),
    ).registerWithTurnManager(this.turnManager)
  }

  // HAZARD HOOK: ticket 08 (Hazard Events) registers its hazardRoll-phase handler here.
  private registerHazardSystem() {
    new HazardSystem(
      this,
      () => this.turnManager.getTurnNumber(),
      () => this.scoreSystem.getAge(),
      (message) => this.pendingEvents.push(message),
    ).registerWithTurnManager(this.turnManager)
  }

  private registerAutoSave() {
    this.turnManager.onPhase('autoSave', () => this.performSave())
  }

  private performSave(): void {
    this.saveSystem.save({
      terrainMap: this.terrainMap,
      buildings: this.buildings,
      farmWaterBonus: this.farmWaterBonus,
      resources: this.resourceSystem.getAll(),
      turnNumber: this.turnManager.getTurnNumber(),
      age: this.scoreSystem.getAge(),
      agesCompleted: this.prestigeSystem.getAgesCompleted(),
    })
  }

  private registerFarmProduction() {
    this.turnManager.onPhase('production', () => {
      for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
          if (this.buildings[row][col] !== 'farm') continue
          const def = BUILDING_DEFS.farm
          let output = def.foodOutput ?? 0
          if (this.farmWaterBonus[row][col]) {
            output += def.foodWaterBonus ?? 0
          }
          this.resourceSystem.add('food', output)
        }
      }
    })
  }

  private countBuildingsOfType(type: BuildingType): number {
    let count = 0
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        if (this.buildings[row][col] === type) count += 1
      }
    }
    return count
  }

  // Shared primitives for systems that need to read/remove placed buildings
  // (e.g. ticket 07 AI raids, ticket 08 Hazard Events) without duplicating
  // the building-grid/visual bookkeeping GameBoardScene already owns.

  getAllBuildingTiles(): { row: number; col: number; type: BuildingType }[] {
    const tiles: { row: number; col: number; type: BuildingType }[] = []
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const type = this.buildings[row][col]
        if (type) tiles.push({ row, col, type })
      }
    }
    return tiles
  }

  isTileDefendedByWatchtower(row: number, col: number): boolean {
    const deltas = [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ]
    return deltas.some(([dr, dc]) => {
      const r = row + dr
      const c = col + dc
      if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) return false
      return this.buildings[r][c] === 'watchtower'
    })
  }

  destroyBuildingAt(row: number, col: number): void {
    if (!this.buildings[row][col]) return
    this.buildings[row][col] = null
    this.farmWaterBonus[row][col] = false
    for (const visual of this.buildingVisuals[row][col]) {
      visual.destroy()
    }
    this.buildingVisuals[row][col] = []
  }

  placeBuildingFree(row: number, col: number, type: BuildingType): void {
    if (this.buildings[row][col]) return
    this.buildings[row][col] = type
    if (type === 'farm') {
      this.farmWaterBonus[row][col] = hasWaterBonus(row, col, this.terrainMap)
    }
    this.drawBuildingOverlay(row, col, type)
  }

  getTerrainAt(row: number, col: number): TerrainType {
    return this.terrainMap[row][col]
  }

  getBuildingAt(row: number, col: number): BuildingType | null {
    return this.buildings[row][col]
  }

  hasFarmWaterBonus(row: number, col: number): boolean {
    return this.farmWaterBonus[row][col]
  }

  private drawGrid() {
    this.terrainVisuals = Array.from({ length: GRID_SIZE }, () => [])

    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const tile = this.add.rectangle(
          col * TILE_SIZE,
          GRID_TOP + row * TILE_SIZE,
          TILE_SIZE,
          TILE_SIZE,
          TERRAIN_COLORS[this.terrainMap[row][col]],
        )
        tile.setOrigin(0, 0)
        tile.setStrokeStyle(1, 0x2a2420)
        tile.setInteractive({ useHandCursor: true })
        tile.on('pointerdown', () => this.handleTileClick(row, col))
        this.terrainVisuals[row][col] = tile
      }
    }

    // A single shared Graphics layer draws every tile's texture accent on top
    // of all 64 terrain rectangles (so it isn't hidden underneath any of
    // them), but underneath the building overlays drawn just below. Destroyed
    // and recreated here each time drawGrid() runs (including from
    // resetForNewAge(), which just calls back into this method) so it never
    // accumulates stale layers across Age resets.
    this.terrainTextureGraphics?.destroy()
    const texture = this.add.graphics()
    this.terrainTextureGraphics = texture
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        this.drawTerrainTexture(
          texture,
          this.terrainMap[row][col],
          col * TILE_SIZE,
          GRID_TOP + row * TILE_SIZE,
        )
      }
    }

    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const building = this.buildings[row][col]
        if (building) {
          this.drawBuildingOverlay(row, col, building)
        }
      }
    }
  }

  // Draws a small flat texture motif for one tile onto the shared terrain
  // Graphics layer, using its top-left pixel corner (x, y). Kept to a handful
  // of cheap primitive calls per tile (dots/lines/short arcs) so 64 tiles
  // remain fast to render (ticket 13).
  private drawTerrainTexture(g: Phaser.GameObjects.Graphics, type: TerrainType, x: number, y: number) {
    switch (type) {
      case 'plains': {
        // A few short grass-blade ticks.
        g.lineStyle(2, 0x8fa354, 0.8)
        const tufts: [number, number][] = [
          [x + 18, y + 52],
          [x + 46, y + 24],
          [x + 58, y + 60],
        ]
        for (const [tx, ty] of tufts) {
          g.lineBetween(tx - 4, ty + 5, tx, ty - 5)
          g.lineBetween(tx + 4, ty + 5, tx, ty - 5)
        }
        break
      }
      case 'forest': {
        // Small dot cluster suggesting tree canopy.
        g.fillStyle(0x1f3d28, 0.85)
        const dots: [number, number, number][] = [
          [x + 30, y + 28, 7],
          [x + 46, y + 22, 6],
          [x + 40, y + 42, 8],
          [x + 56, y + 40, 5],
          [x + 24, y + 48, 5],
        ]
        for (const [dx, dy, r] of dots) {
          g.fillCircle(dx, dy, r)
        }
        break
      }
      case 'hills': {
        // Overlapping mound caps (rolling-hill silhouette). Each is the
        // upper half of a circle whose center sits near the tile's bottom
        // edge, so the drawn cap stays inside the tile.
        g.fillStyle(0x8b6f47, 0.55)
        const mounds: [number, number, number][] = [
          [x + 26, y + 78, 30],
          [x + 56, y + 79, 22],
        ]
        for (const [mx, my, r] of mounds) {
          g.beginPath()
          g.arc(mx, my, r, Math.PI, Math.PI * 2, false)
          g.closePath()
          g.fillPath()
        }
        break
      }
      case 'water': {
        // Two wavy lines, each a short zig-zag polyline.
        g.lineStyle(2, 0x6fb0dd, 0.85)
        for (const wy of [y + 30, y + 54]) {
          g.beginPath()
          g.moveTo(x + 12, wy)
          g.lineTo(x + 24, wy - 6)
          g.lineTo(x + 36, wy)
          g.lineTo(x + 48, wy - 6)
          g.lineTo(x + 60, wy)
          g.lineTo(x + 68, wy - 6)
          g.strokePath()
        }
        break
      }
      case 'volcanic': {
        // Jagged crack accent plus a couple of ember sparks.
        g.lineStyle(3, 0xe8623d, 0.9)
        g.beginPath()
        g.moveTo(x + 34, y + 10)
        g.lineTo(x + 44, y + 28)
        g.lineTo(x + 30, y + 40)
        g.lineTo(x + 42, y + 58)
        g.lineTo(x + 32, y + 72)
        g.strokePath()
        g.fillStyle(0xf2924a, 0.9)
        g.fillCircle(x + 56, y + 22, 3)
        g.fillCircle(x + 20, y + 60, 2.5)
        break
      }
    }
  }

  // Shared by the cataclysm reset (keeps turn/Age/prestige) and the manual
  // Reset Game action (wipes everything): destroys the current terrain and
  // building visuals, regenerates a fresh map, and re-places Town Hall.
  private regenerateBoard(): void {
    this.buildMenu?.destroy()

    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        this.terrainVisuals[row][col]?.destroy()
        for (const visual of this.buildingVisuals[row][col]) {
          visual.destroy()
        }
      }
    }

    this.terrainMap = generateMap(Date.now())
    this.buildings = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null))
    this.farmWaterBonus = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(false))
    this.buildingVisuals = Array.from({ length: GRID_SIZE }, () =>
      Array.from({ length: GRID_SIZE }, () => []),
    )
    this.buildings[TOWN_HALL_TILE.row][TOWN_HALL_TILE.col] = 'townHall'

    this.drawGrid()
  }

  // Cataclysm (ticket 09): called by ScoreSystem once the score reaches the
  // current Age's Destruction Threshold. Clears the board and regenerates it
  // for the next Age; ScoreSystem has already reset banked resources.
  resetForNewAge(): void {
    this.regenerateBoard()
    this.resourceText.setText(this.formatResources())
    this.scoreText.setText(this.formatScore())
    this.prestigeText.setText(this.formatPrestige())
  }

  // Reset Game: a full restart, distinct from resetForNewAge() above — this
  // also wipes the turn count, Age, prestige progress, and the save itself,
  // rather than carrying anything forward.
  private performFullReset(): void {
    this.saveSystem.clear()
    this.notificationPanel?.destroy()
    this.hintsPanel?.destroy()
    this.hintsVisible = false
    this.pendingEvents = []

    this.regenerateBoard()
    this.resourceSystem.reset()
    this.turnManager.setTurnNumber(1)
    this.scoreSystem.setAge(1)
    this.prestigeSystem.setAgesCompleted(0)

    this.turnText.setText('Turn: 1')
    this.resourceText.setText(this.formatResources())
    this.scoreText.setText(this.formatScore())
    this.prestigeText.setText(this.formatPrestige())
  }

  private drawBuildingOverlay(row: number, col: number, type: BuildingType) {
    const def = BUILDING_DEFS[type]
    const centerX = col * TILE_SIZE + TILE_SIZE / 2
    const centerY = GRID_TOP + row * TILE_SIZE + TILE_SIZE / 2
    const size = TILE_SIZE * 0.6

    const visuals: Phaser.GameObjects.GameObject[] = []

    // Flat rounded-square backing in the building's own color (ticket 13:
    // replaces the old plain square + single-letter label).
    const backdrop = this.add.graphics()
    backdrop.fillStyle(def.color, 1)
    backdrop.lineStyle(2, 0x1a1512, 1)
    backdrop.fillRoundedRect(centerX - size / 2, centerY - size / 2, size, size, size * 0.16)
    backdrop.strokeRoundedRect(centerX - size / 2, centerY - size / 2, size, size, size * 0.16)
    visuals.push(backdrop)

    // Distinct flat icon glyph per building type, drawn with shape
    // primitives only (see drawBuildingIcon).
    const icon = this.add.graphics()
    this.drawBuildingIcon(icon, type, centerX, centerY, size, def.color)
    visuals.push(icon)

    if (type === 'farm' && this.farmWaterBonus[row][col]) {
      // Small blue dot marks a Farm's Water-adjacency bonus (GDD §5).
      visuals.push(
        this.add.circle(centerX + size / 2 - 4, centerY - size / 2 + 4, 5, TERRAIN_COLORS.water),
      )
    }

    this.buildingVisuals[row][col] = visuals
  }

  // Draws one building's flat icon glyph, centered at (cx, cy) inside a
  // `size`x`size` box, using only Phaser shape primitives (ticket 13 —
  // vector icons in place of the old single-letter label). `bgColor` is the
  // building's own backing color, reused for a couple of small cutout
  // details (e.g. the Town Hall door, Watchtower window).
  private drawBuildingIcon(
    g: Phaser.GameObjects.Graphics,
    type: BuildingType,
    cx: number,
    cy: number,
    size: number,
    bgColor: number,
  ) {
    switch (type) {
      case 'townHall': {
        // Flat-roofed building silhouette with a small pediment and door.
        g.fillStyle(ICON_INK, 1)
        g.fillTriangle(
          cx,
          cy - size * 0.5,
          cx - size * 0.22,
          cy - size * 0.32,
          cx + size * 0.22,
          cy - size * 0.32,
        )
        g.fillRect(cx - size * 0.35, cy - size * 0.34, size * 0.7, size * 0.12)
        g.fillRect(cx - size * 0.26, cy - size * 0.22, size * 0.52, size * 0.48)
        g.fillStyle(bgColor, 1)
        g.fillRect(cx - size * 0.07, cy + size * 0.02, size * 0.14, size * 0.24)
        break
      }
      case 'farm': {
        // Crop-row pattern: furrow lines with small sprout ticks above each.
        g.fillStyle(ICON_INK, 1)
        const rowYs = [cy - size * 0.22, cy, cy + size * 0.22]
        for (const ry of rowYs) {
          g.fillRect(cx - size * 0.32, ry - size * 0.03, size * 0.64, size * 0.06)
          for (const tx of [cx - size * 0.2, cx, cx + size * 0.2]) {
            g.fillTriangle(
              tx,
              ry - size * 0.22,
              tx - size * 0.05,
              ry - size * 0.05,
              tx + size * 0.05,
              ry - size * 0.05,
            )
          }
        }
        break
      }
      case 'sawmill': {
        // Two stacked log/plank shapes with a log-end cross-section.
        g.fillStyle(ICON_CREAM, 1)
        g.fillRoundedRect(cx - size * 0.32, cy - size * 0.05, size * 0.64, size * 0.22, size * 0.11)
        g.fillRoundedRect(cx - size * 0.28, cy + size * 0.2, size * 0.6, size * 0.2, size * 0.1)
        g.fillStyle(ICON_INK, 1)
        g.fillCircle(cx - size * 0.32, cy + size * 0.06, size * 0.1)
        g.fillStyle(ICON_CREAM, 1)
        g.fillCircle(cx - size * 0.32, cy + size * 0.06, size * 0.06)
        g.fillStyle(ICON_INK, 1)
        g.fillCircle(cx - size * 0.32, cy + size * 0.06, size * 0.02)
        break
      }
      case 'quarry': {
        // Three overlapping stacked-rock polygons.
        g.fillStyle(ICON_INK, 1)
        const rockAt = (ox: number, oy: number, r: number) => {
          g.fillPoints(
            [
              { x: cx + ox - r, y: cy + oy },
              { x: cx + ox - r * 0.5, y: cy + oy - r * 0.9 },
              { x: cx + ox + r * 0.5, y: cy + oy - r * 0.9 },
              { x: cx + ox + r, y: cy + oy },
              { x: cx + ox, y: cy + oy + r * 0.5 },
            ],
            true,
          )
        }
        rockAt(-size * 0.18, size * 0.18, size * 0.22)
        rockAt(size * 0.18, size * 0.2, size * 0.2)
        rockAt(0, -size * 0.06, size * 0.24)
        break
      }
      case 'forge': {
        // Anvil silhouette with a small flame above it.
        g.fillStyle(ICON_INK, 1)
        g.fillPoints(
          [
            { x: cx - size * 0.34, y: cy + size * 0.02 },
            { x: cx + size * 0.34, y: cy + size * 0.02 },
            { x: cx + size * 0.2, y: cy + size * 0.16 },
            { x: cx - size * 0.2, y: cy + size * 0.16 },
          ],
          true,
        )
        g.fillTriangle(
          cx - size * 0.34,
          cy + size * 0.02,
          cx - size * 0.5,
          cy + size * 0.06,
          cx - size * 0.34,
          cy + size * 0.1,
        )
        g.fillRect(cx - size * 0.12, cy + size * 0.16, size * 0.24, size * 0.18)
        g.fillStyle(ICON_FLAME, 1)
        g.fillTriangle(
          cx,
          cy - size * 0.4,
          cx - size * 0.14,
          cy - size * 0.06,
          cx + size * 0.14,
          cy - size * 0.06,
        )
        break
      }
      case 'market': {
        // Striped stall awning over a counter, with two poles.
        g.fillStyle(ICON_CREAM, 1)
        g.fillTriangle(
          cx,
          cy - size * 0.42,
          cx - size * 0.4,
          cy - size * 0.08,
          cx + size * 0.4,
          cy - size * 0.08,
        )
        g.fillStyle(ICON_INK, 1)
        g.fillTriangle(
          cx - size * 0.16,
          cy - size * 0.24,
          cx - size * 0.4,
          cy - size * 0.08,
          cx - size * 0.08,
          cy - size * 0.08,
        )
        g.fillTriangle(
          cx + size * 0.16,
          cy - size * 0.24,
          cx + size * 0.08,
          cy - size * 0.08,
          cx + size * 0.4,
          cy - size * 0.08,
        )
        g.fillRect(cx - size * 0.32, cy - size * 0.04, size * 0.64, size * 0.14)
        g.fillRect(cx - size * 0.3, cy + size * 0.1, size * 0.05, size * 0.24)
        g.fillRect(cx + size * 0.25, cy + size * 0.1, size * 0.05, size * 0.24)
        break
      }
      case 'watchtower': {
        // Tall tower silhouette with crenellations and a window.
        g.fillStyle(ICON_CREAM, 1)
        g.fillRect(cx - size * 0.16, cy - size * 0.3, size * 0.32, size * 0.62)
        const merlonWidth = size * 0.09
        const merlonXs = [
          cx - size * 0.16,
          cx - size * 0.16 + merlonWidth * 1.6,
          cx + size * 0.16 - merlonWidth,
        ]
        for (const mx of merlonXs) {
          g.fillRect(mx, cy - size * 0.42, merlonWidth, size * 0.12)
        }
        g.fillStyle(bgColor, 1)
        g.fillRect(cx - size * 0.05, cy - size * 0.08, size * 0.1, size * 0.16)
        break
      }
    }
  }

  private handleTileClick(row: number, col: number) {
    if (this.buildings[row][col] !== null) {
      return
    }
    this.openBuildMenu(row, col)
  }

  private openBuildMenu(row: number, col: number) {
    this.buildMenu?.destroy()

    const panelWidth = 360
    const rowHeight = 30
    const panelHeight = rowHeight * (BUILDABLE_TYPES.length + 1) + 20
    const panelX = (GRID_PIXELS - panelWidth) / 2
    const panelY = GRID_TOP + (GRID_PIXELS - panelHeight) / 2

    const container = this.add.container(panelX, panelY)
    this.buildMenu = container

    const background = this.add
      .rectangle(0, 0, panelWidth, panelHeight, UI_BG, 0.97)
      .setOrigin(0, 0)
      .setStrokeStyle(2, UI_BORDER)
    // Absorb clicks anywhere on the panel (including disabled rows) so they can't
    // fall through to the grid tile underneath the menu.
    background.setInteractive()
    container.add(background)

    BUILDABLE_TYPES.forEach((type, index) => {
      const def = BUILDING_DEFS[type]
      const terrainOk = isTerrainSatisfied(type, row, col, this.terrainMap)
      const affordable = canAfford(type, this.resourceSystem)
      const valid = terrainOk && affordable

      const rowY = 10 + index * rowHeight
      const label = `${def.label} — ${formatCost(type)}${terrainOk ? '' : ' (wrong terrain)'}`
      const text = this.add.text(10, rowY, label, {
        fontFamily: UI_FONT,
        fontSize: '14px',
        color: valid ? UI_TEXT : UI_TEXT_DISABLED,
      })
      container.add(text)

      if (valid) {
        text.setInteractive({ useHandCursor: true })
        text.on('pointerdown', () => this.placeBuilding(row, col, type))
      }
    })

    const cancelY = 10 + BUILDABLE_TYPES.length * rowHeight
    const cancelText = this.add.text(10, cancelY, 'Cancel', {
      fontFamily: UI_FONT,
      fontSize: '14px',
      color: UI_TEXT_DANGER,
    })
    cancelText.setInteractive({ useHandCursor: true })
    cancelText.on('pointerdown', () => this.buildMenu?.destroy())
    container.add(cancelText)
  }

  private placeBuilding(row: number, col: number, type: BuildingType) {
    if (this.buildings[row][col] !== null) {
      this.buildMenu?.destroy()
      return
    }
    if (!isTerrainSatisfied(type, row, col, this.terrainMap) || !canAfford(type, this.resourceSystem)) {
      return
    }

    deductCost(type, this.resourceSystem)
    this.buildings[row][col] = type
    if (type === 'farm') {
      this.farmWaterBonus[row][col] = hasWaterBonus(row, col, this.terrainMap)
    }
    this.drawBuildingOverlay(row, col, type)
    this.resourceText.setText(this.formatResources())
    this.scoreText.setText(this.formatScore())
    this.buildMenu?.destroy()
  }

  private createResourceBar() {
    this.add.rectangle(0, 0, GRID_PIXELS, RESOURCE_BAR_HEIGHT, UI_BG).setOrigin(0, 0)

    this.resourceText = this.add.text(16, 18, this.formatResources(), {
      fontFamily: UI_FONT,
      fontSize: '14px',
      color: UI_TEXT,
    })
    this.resourceText.setOrigin(0, 0.5)

    this.scoreText = this.add.text(16, 46, this.formatScore(), {
      fontFamily: UI_FONT,
      fontSize: '13px',
      color: UI_TEXT_MUTED,
    })
    this.scoreText.setOrigin(0, 0.5)

    // Third line (ticket 10's Age-completion counter): styled to match the
    // rest of the bar, content/logic left untouched.
    this.prestigeText = this.add.text(16, 74, this.formatPrestige(), {
      fontFamily: UI_FONT,
      fontSize: '13px',
      color: '#e0c068',
    })
    this.prestigeText.setOrigin(0, 0.5)
  }

  private formatResources(): string {
    return RESOURCE_ORDER.map(
      (resource) => `${RESOURCE_LABELS[resource]} ${this.resourceSystem.get(resource)}`,
    ).join('   ')
  }

  private formatScore(): string {
    const score = this.scoreSystem.computeScore()
    const threshold = this.scoreSystem.getThreshold()
    const age = this.scoreSystem.getAge()
    return `Age ${age}   Score ${score} / ${threshold}`
  }

  private formatPrestige(): string {
    return `Ages Completed: ${this.prestigeSystem.getAgesCompleted()}`
  }

  private createTurnUI() {
    const barY = GRID_TOP + GRID_PIXELS
    const buttonHeight = 40

    this.add.rectangle(0, barY, GRID_PIXELS, UI_BAR_HEIGHT, UI_BG).setOrigin(0, 0)

    // Row A: turn counter + End Turn (primary controls).
    const rowAY = barY

    this.turnText = this.add.text(16, rowAY + UI_ROW_HEIGHT / 2, `Turn: ${this.turnManager.getTurnNumber()}`, {
      fontFamily: UI_FONT,
      fontSize: '20px',
      color: UI_TEXT,
    })
    this.turnText.setOrigin(0, 0.5)

    const endTurnWidth = 140
    const endTurnX = GRID_PIXELS - endTurnWidth - 16
    const endTurnY = rowAY + (UI_ROW_HEIGHT - buttonHeight) / 2

    const endTurnButton = this.add.rectangle(endTurnX, endTurnY, endTurnWidth, buttonHeight, BUTTON_PRIMARY)
    endTurnButton.setOrigin(0, 0)
    endTurnButton.setStrokeStyle(2, UI_BORDER)
    endTurnButton.setInteractive({ useHandCursor: true })

    const endTurnLabel = this.add.text(
      endTurnX + endTurnWidth / 2,
      endTurnY + buttonHeight / 2,
      'End Turn',
      { fontFamily: UI_FONT, fontSize: '18px', color: UI_TEXT },
    )
    endTurnLabel.setOrigin(0.5)
    endTurnButton.on('pointerdown', () => this.handleEndTurn())

    // Row B: secondary controls (Save & Quit, Reset, Hints), evenly spaced.
    const rowBY = barY + UI_ROW_HEIGHT
    const margin = 16
    const gap = 12
    const smallButtonWidth = (GRID_PIXELS - margin * 2 - gap * 2) / 3
    const smallButtonY = rowBY + (UI_ROW_HEIGHT - buttonHeight) / 2

    const makeSmallButton = (
      index: number,
      label: string,
      color: number,
      onClick: (setLabel: (text: string) => void) => void,
    ) => {
      const x = margin + index * (smallButtonWidth + gap)
      const rect = this.add.rectangle(x, smallButtonY, smallButtonWidth, buttonHeight, color)
      rect.setOrigin(0, 0)
      rect.setStrokeStyle(2, UI_BORDER)
      rect.setInteractive({ useHandCursor: true })

      const text = this.add.text(x + smallButtonWidth / 2, smallButtonY + buttonHeight / 2, label, {
        fontFamily: UI_FONT,
        fontSize: '15px',
        color: UI_TEXT,
      })
      text.setOrigin(0.5)

      rect.on('pointerdown', () => onClick((newLabel) => text.setText(newLabel)))
    }

    makeSmallButton(0, 'Save & Quit', BUTTON_SECONDARY, (setLabel) => {
      this.performSave()
      setLabel('Saved!')
      this.time.delayedCall(1000, () => setLabel('Save & Quit'))
    })

    makeSmallButton(1, 'Reset', BUTTON_SECONDARY, () => this.openResetConfirm())

    makeSmallButton(2, 'Hints', BUTTON_SECONDARY, () => this.toggleHints())
  }

  private handleEndTurn() {
    this.pendingEvents = []
    const newTurnNumber = this.turnManager.endTurn()
    this.turnText.setText(`Turn: ${newTurnNumber}`)
    this.resourceText.setText(this.formatResources())
    this.scoreText.setText(this.formatScore())
    this.prestigeText.setText(this.formatPrestige())
    this.showNotifications(this.pendingEvents)
    if (this.hintsVisible) {
      this.renderHints()
    }
  }

  // Shows (or clears) a dismissible report of what happened to the player's
  // kingdom this turn (raids, hazards) — one line per event, most recent
  // turn's events only.
  private showNotifications(messages: string[]) {
    this.notificationPanel?.destroy()
    if (messages.length === 0) return

    const panelWidth = 420
    const lineHeight = 22
    const panelHeight = messages.length * lineHeight + 56
    const panelX = (GRID_PIXELS - panelWidth) / 2
    const panelY = GRID_TOP + 16

    const container = this.add.container(panelX, panelY)
    this.notificationPanel = container

    const background = this.add
      .rectangle(0, 0, panelWidth, panelHeight, UI_BG, 0.97)
      .setOrigin(0, 0)
      .setStrokeStyle(2, UI_TEXT_DANGER)
    background.setInteractive()
    container.add(background)

    const title = this.add.text(14, 12, 'Kingdom Report', {
      fontFamily: UI_FONT,
      fontSize: '15px',
      color: UI_TEXT_DANGER,
    })
    container.add(title)

    messages.forEach((message, index) => {
      const line = this.add.text(14, 38 + index * lineHeight, message, {
        fontFamily: UI_FONT,
        fontSize: '13px',
        color: UI_TEXT,
        wordWrap: { width: panelWidth - 28 },
      })
      container.add(line)
    })

    const dismiss = this.add.text(panelWidth - 78, panelHeight - 26, 'Dismiss', {
      fontFamily: UI_FONT,
      fontSize: '13px',
      color: UI_TEXT_MUTED,
    })
    dismiss.setInteractive({ useHandCursor: true })
    dismiss.on('pointerdown', () => this.notificationPanel?.destroy())
    container.add(dismiss)
  }

  private openResetConfirm() {
    this.resetConfirmPanel?.destroy()

    const panelWidth = 340
    const panelHeight = 130
    const panelX = (GRID_PIXELS - panelWidth) / 2
    const panelY = GRID_TOP + (GRID_PIXELS - panelHeight) / 2

    const container = this.add.container(panelX, panelY)
    this.resetConfirmPanel = container

    const background = this.add
      .rectangle(0, 0, panelWidth, panelHeight, UI_BG, 0.97)
      .setOrigin(0, 0)
      .setStrokeStyle(2, UI_TEXT_DANGER)
    background.setInteractive()
    container.add(background)

    const message = this.add.text(panelWidth / 2, 20, 'Reset the game and lose all progress?', {
      fontFamily: UI_FONT,
      fontSize: '14px',
      color: UI_TEXT,
      align: 'center',
      wordWrap: { width: panelWidth - 32 },
    })
    message.setOrigin(0.5, 0)
    container.add(message)

    const confirm = this.add.text(40, panelHeight - 32, 'Yes, Reset', {
      fontFamily: UI_FONT,
      fontSize: '14px',
      color: UI_TEXT_DANGER,
    })
    confirm.setInteractive({ useHandCursor: true })
    confirm.on('pointerdown', () => {
      this.resetConfirmPanel?.destroy()
      this.performFullReset()
    })
    container.add(confirm)

    const cancel = this.add.text(panelWidth - 100, panelHeight - 32, 'Cancel', {
      fontFamily: UI_FONT,
      fontSize: '14px',
      color: UI_TEXT_MUTED,
    })
    cancel.setInteractive({ useHandCursor: true })
    cancel.on('pointerdown', () => this.resetConfirmPanel?.destroy())
    container.add(cancel)
  }

  private toggleHints() {
    this.hintsVisible = !this.hintsVisible
    if (this.hintsVisible) {
      this.renderHints()
    } else {
      this.hintsPanel?.destroy()
    }
  }

  // Renders (or re-renders, if already open) the Hints panel with tips
  // computed from the current game state. Anchored to the bottom of the grid
  // so it doesn't collide with the Kingdom Report banner at the top.
  private renderHints() {
    this.hintsPanel?.destroy()

    const hints = computeHints({
      gold: this.resourceSystem.get('gold'),
      food: this.resourceSystem.get('food'),
      population: this.resourceSystem.get('population'),
      turnNumber: this.turnManager.getTurnNumber(),
      farmCount: this.countBuildingsOfType('farm'),
      watchtowerCount: this.countBuildingsOfType('watchtower'),
      totalBuildings: this.getAllBuildingTiles().length,
      score: this.scoreSystem.computeScore(),
      threshold: this.scoreSystem.getThreshold(),
    })

    const panelWidth = 460
    const lineHeight = 34
    const panelHeight = hints.length * lineHeight + 46
    const panelX = (GRID_PIXELS - panelWidth) / 2
    const panelY = GRID_TOP + GRID_PIXELS - panelHeight - 16

    const container = this.add.container(panelX, panelY)
    this.hintsPanel = container

    const background = this.add
      .rectangle(0, 0, panelWidth, panelHeight, UI_BG, 0.97)
      .setOrigin(0, 0)
      .setStrokeStyle(2, UI_BORDER)
    background.setInteractive()
    container.add(background)

    const title = this.add.text(14, 10, 'Hints', {
      fontFamily: UI_FONT,
      fontSize: '15px',
      color: UI_BORDER,
    })
    container.add(title)

    hints.forEach((hint, index) => {
      const line = this.add.text(14, 34 + index * lineHeight, `• ${hint}`, {
        fontFamily: UI_FONT,
        fontSize: '12px',
        color: UI_TEXT,
        wordWrap: { width: panelWidth - 28 },
      })
      container.add(line)
    })
  }
}
