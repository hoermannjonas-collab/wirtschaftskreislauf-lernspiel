import type { Accounts, AccountsInput, Choice, Flow, Indicators, Rubric } from './types'

export const UNIT = 'Mrd. € je Quartal'

const round1 = (value: number) => Math.round(value * 10) / 10

export function calculateAccounts(input: AccountsInput): Accounts {
  const Y = input.C + input.I + input.G + (input.X - input.M)
  const Yd = Y - input.T + input.TR
  const derivedS = Yd - input.C
  const S = input.S ?? derivedS
  const withdrawals = S + input.T + input.M
  const injections = input.I + input.G + input.X
  return {
    ...input,
    S,
    Y: round1(Y),
    Yd: round1(Yd),
    derivedS: round1(derivedS),
    savingsReconciliation: round1(S - derivedS),
    withdrawals: round1(withdrawals),
    injections: round1(injections),
    planBalance: round1(injections - withdrawals),
  }
}

export function unplannedInventoryChange(planBalance: number): number {
  return round1(-planBalance)
}

export function applyChoice(accounts: AccountsInput, choice: Choice): AccountsInput {
  const next = { ...accounts }
  for (const key of ['C', 'I', 'G', 'X', 'M', 'T', 'TR'] as const) {
    next[key] = round1(next[key] + (choice.effect[key] ?? 0))
  }
  if (accounts.S !== undefined) {
    next.S = round1(accounts.S + (choice.effect.S ?? 0))
  }
  return next
}

export function applyDelayedAdjustment(
  accounts: AccountsInput,
  indicators: Indicators,
  previousBalance: number,
): { accounts: AccountsInput; indicators: Indicators } {
  const productionImpulse = round1(previousBalance * 0.35)
  const employmentImpulse = round1(Math.max(-1.4, Math.min(1.4, previousBalance / 45)))
  return {
    accounts: {
      ...accounts,
      C: round1(Math.max(0, accounts.C + productionImpulse * 0.55)),
      I: round1(Math.max(0, accounts.I + productionImpulse * 0.2)),
    },
    indicators: {
      ...indicators,
      growth: round1(indicators.growth + previousBalance / 55),
      employment: round1(Math.max(0, Math.min(100, indicators.employment + employmentImpulse))),
    },
  }
}

export function updateIndicators(indicators: Indicators, choice: Choice, balance: number, accounts?: Accounts): Indicators {
  const rateChange = choice.effect.interestRate ?? 0
  const demandImpulse = (choice.effect.G ?? 0) + (choice.effect.I ?? 0) + (choice.effect.X ?? 0) - (choice.effect.M ?? 0)
  return {
    ...indicators,
    growth: round1(indicators.growth + demandImpulse / 28 + balance / 100),
    inflation: round1(Math.max(-2, indicators.inflation + demandImpulse / 80)),
    employment: round1(Math.max(0, Math.min(100, indicators.employment + demandImpulse / 42))),
    interestRate: round1(Math.max(0, indicators.interestRate + rateChange)),
    publicDebt: round1(Math.max(0, indicators.publicDebt + (accounts ? accounts.G + accounts.TR - accounts.T : (choice.effect.G ?? 0) + (choice.effect.TR ?? 0) - (choice.effect.T ?? 0)))),
  }
}

export function counterpartIsValid(flow: Flow, counterpartId: string, flows: Flow[]): boolean {
  const counterpart = flows.find((candidate) => candidate.id === counterpartId)
  if (!counterpart) return false
  return counterpart.id === flow.counterpart && counterpart.from === flow.to && counterpart.to === flow.from
}

export function scoreRationale(text: string, predictionCount: number, flowCorrect: number, flowTotal: number): Rubric {
  const normalized = text.toLocaleLowerCase('de-DE')
  const includesAny = (terms: string[]) => terms.some((term) => normalized.includes(term))
  const ratio = flowTotal ? flowCorrect / flowTotal : 0.5
  return {
    accounting: includesAny(['saldo', 'entnahme', 'zuführung', 'lager', 'konto']) ? 2 : 0,
    direction: flowTotal ? (ratio === 1 ? 2 : ratio >= 0.5 ? 1 : 0) : includesAny(['steigt', 'sinkt', 'erhöht', 'verringert', 'von ', ' zu ']) ? 2 : predictionCount ? 1 : 0,
    time: includesAny(['zunächst', 'direkt', 'später', 'folgerunde', 'verzögert']) ? 2 : 0,
    assumptions: includesAny(['annahme', 'wenn', 'unter der bedingung', 'erwartung']) ? 2 : 0,
    distribution: includesAny(['verteilung', 'einkommen', 'haushalt', 'unternehmen', 'betroffen']) ? 2 : 0,
    reasoning: text.trim().length >= 120 && predictionCount >= 2 ? 2 : text.trim().length >= 45 ? 1 : 0,
  }
}

export function assertEconomicSigns(accounts: Accounts): boolean {
  return accounts.withdrawals === round1(accounts.S + accounts.T + accounts.M)
    && accounts.injections === round1(accounts.I + accounts.G + accounts.X)
    && accounts.planBalance === round1(accounts.injections - accounts.withdrawals)
}
