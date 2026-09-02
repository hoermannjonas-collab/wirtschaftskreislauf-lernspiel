export type Level = 'FOS 11' | 'FOS 11/12' | 'FOS 13'
export type ActorId = 'household' | 'firm' | 'state' | 'finance' | 'foreign'
export type Phase = 'observe' | 'act' | 'predict' | 'reveal'

export interface AccountsInput {
  C: number
  I: number
  G: number
  X: number
  M: number
  T: number
  TR: number
  S?: number
}

export interface Accounts extends Required<AccountsInput> {
  Y: number
  Yd: number
  derivedS: number
  savingsReconciliation: number
  withdrawals: number
  injections: number
  planBalance: number
}

export interface Indicators {
  growth: number
  inflation: number
  employment: number
  interestRate: number
  publicDebt: number
}

export interface Flow {
  id: string
  from: ActorId
  to: ActorId
  label: string
  kind: 'goods' | 'money' | 'tax-transfer' | 'credit-interest' | 'import-export'
  amount: number | null
  period: string
  counterpart: string
}

export interface Choice {
  id: string
  label: string
  description: string
  effect: Partial<AccountsInput> & { interestRate?: number }
  direct: string
  delayed: string
  distribution: string
  conflict: string
  assumptions: string[]
}

export interface FlowTask {
  cards: { id: string; label: string; target: string }[]
  zones: { id: string; label: string }[]
}

export interface MissionRound {
  title: string
  situation: string
  learningGoal: string
  event: string
  instruction: string
  tip: string
  checkAfter: string
  choices: Choice[]
  flowTask?: FlowTask
}

export interface Mission {
  id: string
  title: string
  level: Level
  duration: string
  summary: string
  actors: ActorId[]
  initialAccounts: AccountsInput
  initialIndicators: Indicators
  rounds: MissionRound[]
}

export interface Rubric {
  accounting: number
  direction: number
  time: number
  assumptions: number
  distribution: number
  reasoning: number
}

export interface RoundRecord {
  round: number
  choiceId: string
  choiceLabel: string
  rationale: string
  prediction: string[]
  accountsBefore: Accounts
  accountsAfter: Accounts
  inventoryChange: number
  direct: string
  delayed: string
  distribution: string
  conflict: string
  assumptions: string[]
  rubric: Rubric
}

export interface GameState {
  missionId: string
  role: ActorId
  round: number
  phase: Phase
  accounts: AccountsInput
  indicators: Indicators
  inventoryStock: number
  selectedChoiceId: string
  policyIntensity: number
  prediction: string[]
  rationale: string
  reflection: string
  flowAnswers: Record<string, string>
  history: RoundRecord[]
}
