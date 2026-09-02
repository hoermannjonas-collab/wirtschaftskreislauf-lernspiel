import { describe, expect, it } from 'vitest'
import { missions } from '../src/data'
import { applyChoice, applyDelayedAdjustment, assertEconomicSigns, calculateAccounts, unplannedInventoryChange } from '../src/simulation'

describe('Demo-Missionen', () => {
  it('enthält die vier verbindlichen Missionen', () => {
    expect(missions.map((mission) => mission.title)).toEqual([
      'Sparen oder investieren?',
      'Staat und Finanzsektor im Kreislauf',
      'Exportdämpfer und Kreditimpuls',
      'Ölpreisschock und Zielkonflikte',
    ])
  })

  it.each(missions.map((mission) => [mission.title, mission] as const))('%s besitzt einen vollständigen spielbaren Kernablauf', (_title, mission) => {
    expect(mission.rounds.length).toBeGreaterThanOrEqual(3)
    let accounts = { ...mission.initialAccounts }
    let indicators = { ...mission.initialIndicators }
    for (const round of mission.rounds) {
      expect(round.instruction.length).toBeGreaterThan(20)
      expect(round.tip.length).toBeGreaterThan(15)
      expect(round.checkAfter.length).toBeGreaterThan(15)
      expect(round.choices.length).toBeGreaterThanOrEqual(2)
      const choice = round.choices[0]
      const before = calculateAccounts(accounts)
      accounts = applyChoice(accounts, choice)
      const after = calculateAccounts(accounts)
      expect(assertEconomicSigns(after)).toBe(true)
      const inventory = unplannedInventoryChange(after.planBalance)
      expect(inventory).toBe(-after.planBalance)
      const delayed = applyDelayedAdjustment(accounts, indicators, after.planBalance)
      accounts = delayed.accounts
      indicators = delayed.indicators
      expect(before.Y).toBeTypeOf('number')
    }
  })

  it('zeigt beim Exportdämpfer zuerst Lageraufbau statt automatische Stabilität', () => {
    const mission = missions.find((item) => item.id === 'export-kredit')!
    const before = calculateAccounts(mission.initialAccounts)
    const afterShock = calculateAccounts(applyChoice(mission.initialAccounts, mission.rounds[0].choices[0]))
    expect(afterShock.planBalance).toBeLessThan(before.planBalance)
    expect(unplannedInventoryChange(afterShock.planBalance)).toBeGreaterThan(0)
  })
})
