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
      expect(['Grundlage', 'Anwendung', 'Analyse', 'Beurteilung']).toContain(round.demandLevel)
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

  it('führt in der Einstiegsmission ohne Prognose- und Begründungsdruck ein', () => {
    const mission = missions.find((item) => item.id === 'sparen-investieren')!
    expect(mission.rounds[0]).toMatchObject({ demandLevel: 'Grundlage', simulationRound: false, requiresPrediction: false, requiresRationale: false })
    expect(mission.rounds[1]).toMatchObject({ demandLevel: 'Anwendung', simulationRound: false, requiresPrediction: false, requiresRationale: false })
    expect(mission.rounds[0].assessedCriteria).not.toContain('time')
    expect(mission.rounds[0].assessedCriteria).not.toContain('assumptions')
    expect(mission.rounds[1].calculationTask?.fields.map((field) => field.answer)).toEqual([80, 0])
    expect(mission.rounds[2]).toMatchObject({ demandLevel: 'Analyse', simulationRound: true, requiresPrediction: true, requiresRationale: true })
  })

  it('beginnt auch die Mission mit Staat und Finanzsektor mit einer reinen Zuordnung', () => {
    const mission = missions.find((item) => item.id === 'staat-finanzsektor')!
    expect(mission.rounds[0].flowTask?.cards.map((card) => card.label)).toEqual(['Steuern T', 'Staatsausgaben G', 'Transfers TR'])
    expect(mission.rounds[0].simulationRound).toBe(false)
    expect(mission.rounds[0].requiresPrediction).toBe(false)
  })

  it('zeigt beim Exportdämpfer zuerst Lageraufbau statt automatische Stabilität', () => {
    const mission = missions.find((item) => item.id === 'export-kredit')!
    const before = calculateAccounts(mission.initialAccounts)
    const afterShock = calculateAccounts(applyChoice(mission.initialAccounts, mission.rounds[0].choices[0]))
    expect(afterShock.planBalance).toBeLessThan(before.planBalance)
    expect(unplannedInventoryChange(afterShock.planBalance)).toBeGreaterThan(0)
  })
})
