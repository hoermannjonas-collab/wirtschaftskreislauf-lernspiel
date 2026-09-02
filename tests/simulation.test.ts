import { describe, expect, it } from 'vitest'
import { flows } from '../src/data'
import { UNIT, applyChoice, applyDelayedAdjustment, assertEconomicSigns, calculateAccounts, counterpartIsValid, unplannedInventoryChange, updateIndicators } from '../src/simulation'
import type { Choice } from '../src/types'

describe('Kreislaufkonten', () => {
  const input = { C: 500, I: 110, G: 130, X: 75, M: 105, T: 120, TR: 32 }

  it('berechnet Y, Yd und S aus den Fachgleichungen', () => {
    const result = calculateAccounts(input)
    expect(result.Y).toBe(710)
    expect(result.Yd).toBe(622)
    expect(result.S).toBe(122)
  })

  it('berechnet Entnahmen, Zuführungen und Plan-Saldo mit korrektem Vorzeichen', () => {
    const result = calculateAccounts(input)
    expect(result.withdrawals).toBe(347)
    expect(result.injections).toBe(315)
    expect(result.planBalance).toBe(-32)
    expect(assertEconomicSigns(result)).toBe(true)
  })

  it('weist eine explizite gerundete Sparangabe transparent aus', () => {
    const result = calculateAccounts({ ...input, S: 125 })
    expect(result.S).toBe(125)
    expect(result.derivedS).toBe(122)
    expect(result.savingsReconciliation).toBe(3)
    expect(result.planBalance).toBe(-35)
  })

  it('verwendet eine eindeutige Strom-Einheit', () => {
    expect(UNIT).toBe('Mrd. € je Quartal')
  })

  it('überführt das staatliche Defizit als Strom in den Schuldenbestand', () => {
    const accounts = calculateAccounts({ C: 400, I: 80, G: 130, X: 50, M: 70, T: 120, TR: 30 })
    const indicators = { growth: 1, inflation: 2, employment: 94, interestRate: 3, publicDebt: 1_000 }
    const neutralChoice: Choice = { id: 'neutral', label: '', description: '', effect: {}, direct: '', delayed: '', distribution: '', conflict: '', assumptions: [] }
    const next = updateIndicators(indicators, neutralChoice, accounts.planBalance, accounts)
    expect(accounts.G + accounts.TR - accounts.T).toBe(40)
    expect(next.publicDebt).toBe(1_040)
  })
})

describe('Transaktionen und Gegenbuchungen', () => {
  it('erkennt echte gegenläufige Gegenbuchungen', () => {
    const consumption = flows.find((flow) => flow.id === 'consumption')!
    expect(counterpartIsValid(consumption, 'goods', flows)).toBe(true)
    expect(counterpartIsValid(consumption, 'income', flows)).toBe(false)
  })

  it('verbucht Maßnahmen in die richtigen Konten', () => {
    const choice: Choice = { id: 'test', label: 'Test', description: '', effect: { G: 10, M: 2, T: -3 }, direct: '', delayed: '', distribution: '', conflict: '', assumptions: [] }
    const result = applyChoice({ C: 100, I: 20, G: 30, X: 10, M: 12, T: 25, TR: 5 }, choice)
    expect(result.G).toBe(40)
    expect(result.M).toBe(14)
    expect(result.T).toBe(22)
  })
})

describe('Dynamische Anpassung', () => {
  it('übersetzt einen negativen Plan-Saldo zunächst in positiven Lageraufbau', () => {
    expect(unplannedInventoryChange(-35)).toBe(35)
    expect(unplannedInventoryChange(12)).toBe(-12)
  })

  it('wendet Produktion und Beschäftigung erst in der Folgerunde an', () => {
    const accounts = { C: 500, I: 100, G: 100, X: 50, M: 80, T: 100, TR: 20 }
    const indicators = { growth: 1, inflation: 2, employment: 94, interestRate: 3, publicDebt: 900 }
    const unchanged = calculateAccounts(accounts)
    const next = applyDelayedAdjustment(accounts, indicators, -30)
    expect(unchanged.C).toBe(500)
    expect(next.accounts.C).toBeLessThan(500)
    expect(next.accounts.I).toBeLessThan(100)
    expect(next.indicators.employment).toBeLessThan(94)
  })
})
