import type { GameState } from './types'

const STORAGE_KEY = 'wirtschaftskreislauf-game-v2'

export function loadGame(): GameState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) as GameState : null
  } catch {
    return null
  }
}

export function saveGame(state: GameState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Die Simulation bleibt auch ohne verfügbaren Browserspeicher spielbar.
  }
}

export function clearGame(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Keine Aktion nötig.
  }
}
