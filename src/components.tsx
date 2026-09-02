import { useMemo, useState, type DragEvent, type KeyboardEvent, type ReactNode } from 'react'
import { actors, flows } from './data'
import { UNIT } from './simulation'
import type { Accounts, ActorId, CalculationTask, FlowTask, Indicators, RoundRecord, Rubric, RubricKey } from './types'

export function Icon({ name }: { name: 'play' | 'chart' | 'book' | 'save' | 'arrow' | 'check' | 'warning' | 'idea' }) {
  const glyph = { play: '▶', chart: '▥', book: '▤', save: '●', arrow: '→', check: '✓', warning: '!', idea: '✦' }[name]
  return <span className="icon" aria-hidden="true">{glyph}</span>
}

export function AssignmentBlock({ title = 'Dein Auftrag', instruction, tip, checkAfter, children }: { title?: string; instruction: string; tip: string; checkAfter: string; children?: ReactNode }) {
  return (
    <aside className="assignment" aria-labelledby="assignment-title">
      <div className="assignment-title"><Icon name="idea" /><h2 id="assignment-title">{title}</h2></div>
      <dl>
        <div><dt>So gehst du vor</dt><dd>{instruction}</dd></div>
        <div><dt>Tipp</dt><dd>{tip}</dd></div>
        <div><dt>Prüfe danach</dt><dd>{checkAfter}</dd></div>
      </dl>
      {children}
    </aside>
  )
}

export function MetricGrid({ accounts, indicators, inventoryStock }: { accounts: Accounts; indicators: Indicators; inventoryStock: number }) {
  const governmentBalance = accounts.T - accounts.G - accounts.TR
  return (
    <section className="metric-grid" aria-label="Zentrale Kennzahlen">
      <div className="metric"><span>Produktion Y</span><strong>{accounts.Y.toLocaleString('de-DE')}</strong><small>Mrd. € / Quartal</small></div>
      <div className="metric"><span>Beschäftigung</span><strong>{indicators.employment.toLocaleString('de-DE')} %</strong><small>Anteil Erwerbspersonen</small></div>
      <div className="metric"><span>Inflation</span><strong>{indicators.inflation.toLocaleString('de-DE')} %</strong><small>gegenüber Vorjahr</small></div>
      <div className="metric"><span>Lagerbestand</span><strong>{inventoryStock > 0 ? '+' : ''}{inventoryStock.toLocaleString('de-DE')}</strong><small>Mrd. € · Bestand</small></div>
      <div className="metric"><span>Budgetsaldo</span><strong>{governmentBalance > 0 ? '+' : ''}{governmentBalance.toLocaleString('de-DE')}</strong><small>Mrd. € / Quartal · Strom</small></div>
      <div className="metric"><span>Staatsschulden</span><strong>{indicators.publicDebt.toLocaleString('de-DE')}</strong><small>Mrd. € · Bestand</small></div>
    </section>
  )
}

export function FlowMap({ actorIds, simple }: { actorIds: ActorId[]; simple: boolean }) {
  const visibleFlows = flows.filter((flow) => actorIds.includes(flow.from) && actorIds.includes(flow.to))
  const [selectedId, setSelectedId] = useState(visibleFlows[0]?.id ?? '')
  const selected = visibleFlows.find((flow) => flow.id === selectedId)
  const [showList, setShowList] = useState(false)
  return (
    <section className="flow-card card" aria-labelledby="flow-heading">
      <div className="section-head">
        <div><p className="eyebrow">KREISLAUFBILD · {simple ? 'EINFACH' : 'ERWEITERT'}</p><h2 id="flow-heading">Akteure und aktive Ströme</h2></div>
        <button className="text-button" type="button" onClick={() => setShowList((value) => !value)} aria-expanded={showList}>{showList ? 'Liste schließen' : 'Screenreader-Liste'}</button>
      </div>
      <div className={`flow-map ${simple ? 'simple' : 'extended'}`} aria-hidden="true">
        <div className="actor-ring">
          {actorIds.map((actorId, index) => (
            <div className={`actor-node actor-${index}`} key={actorId}><span>{actors[actorId].symbol}</span><b>{actors[actorId].label}</b></div>
          ))}
          <div className="flow-center"><b>{simple ? 'Güter ↔ Geld' : 'S + T + M ↔ I + G + X'}</b><span>Tippe unten auf einen Strom.</span></div>
        </div>
        <div className="flow-chips">
          {visibleFlows.slice(0, simple ? 4 : 8).map((flow) => (
            <button key={flow.id} className={`flow-chip kind-${flow.kind} ${selectedId === flow.id ? 'active' : ''}`} type="button" onClick={() => setSelectedId(flow.id)}>
              {actors[flow.from].symbol} <Icon name="arrow" /> {actors[flow.to].symbol}<span>{flow.label}</span>
            </button>
          ))}
        </div>
      </div>
      {selected && <div className="flow-detail" aria-live="polite"><b>{actors[selected.from].label} → {actors[selected.to].label}: {selected.label}</b><span>{selected.kind === 'goods' ? 'Realstrom' : 'Geld-/Finanzstrom'} · {selected.amount === null ? 'ohne Geldbetrag' : `${selected.amount} Mrd. €`} · {selected.period}</span><span>Gegenbuchung: {flows.find((flow) => flow.id === selected.counterpart)?.label ?? 'separat prüfen'}</span></div>}
      {showList && (
        <ul className="accessible-flow-list">
          {visibleFlows.map((flow) => <li key={flow.id}><b>{actors[flow.from].label} → {actors[flow.to].label}</b> — {flow.label} — {flow.amount === null ? 'ohne Geldbetrag' : `${flow.amount} Mrd. €`} — {flow.kind === 'goods' ? 'Realstrom' : 'Geld-/Finanzstrom'} — {flow.period}</li>)}
        </ul>
      )}
      <div className="legend" aria-label="Legende"><span><i className="line real" /> Realstrom</span><span><i className="line money" /> Geld-/Finanzstrom</span><span><i className="line active-line" /> ausgewählt</span></div>
    </section>
  )
}

export function BalanceCard({ accounts }: { accounts: Accounts }) {
  const inventory = -accounts.planBalance
  const balanceLabel = accounts.planBalance === 0 ? 'ausgeglichen' : accounts.planBalance < 0 ? 'Entnahmen überwiegen' : 'Zuführungen überwiegen'
  return (
    <section className="balance-card card" aria-labelledby="balance-heading">
      <div className="section-head"><div><p className="eyebrow">PLANUNG DIESER RUNDE</p><h2 id="balance-heading">Kreislaufbilanz</h2></div><span className={`status-badge ${accounts.planBalance === 0 ? 'good' : 'attention'}`}>{balanceLabel}</span></div>
      <div className="equation-grid">
        <div><span>Entnahmen</span><strong>S + T + M = {accounts.withdrawals.toLocaleString('de-DE')}</strong></div>
        <div><span>Zuführungen</span><strong>I + G + X = {accounts.injections.toLocaleString('de-DE')}</strong></div>
        <div className="saldo"><span>Plan-Saldo</span><strong>{accounts.planBalance > 0 ? '+' : ''}{accounts.planBalance.toLocaleString('de-DE')}</strong></div>
      </div>
      <p className="inventory-note"><Icon name="warning" /><span><b>Zunächst:</b> ungeplante Lagerveränderung {inventory > 0 ? '+' : ''}{inventory.toLocaleString('de-DE')} Mrd. €. Erst in der Folgerunde können Produktion, Einkommen und Beschäftigung reagieren.</span></p>
      <details><summary>Formeln und Einheiten</summary><p>Y = C + I + G + (X − M) · Yd = Y − T + TR · S = Yd − C. Alle Ströme: {UNIT}. Lagerbestand: Mrd. € zu einem Zeitpunkt.</p>{accounts.savingsReconciliation !== 0 && <p>Die Mission nutzt vorgegebene, gerundete S-Daten. Statistische Abstimmung zu Yd − C: {accounts.savingsReconciliation > 0 ? '+' : ''}{accounts.savingsReconciliation} Mrd. €.</p>}</details>
    </section>
  )
}

export function TouchDropTask({ task, answers, onChange }: { task: FlowTask; answers: Record<string, string>; onChange: (answers: Record<string, string>) => void }) {
  const [selected, setSelected] = useState('')
  const setAnswer = (cardId: string, zoneId: string) => {
    onChange({ ...answers, [cardId]: zoneId })
    setSelected('')
  }
  const onDragStart = (event: DragEvent<HTMLButtonElement>, cardId: string) => event.dataTransfer.setData('text/plain', cardId)
  const onCardKey = (event: KeyboardEvent<HTMLButtonElement>, cardId: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      setSelected(cardId)
    }
  }
  return (
    <section className="drop-task card" aria-labelledby="drop-heading">
      <div className="section-head"><div><p className="eyebrow">DRAG · TAP · TASTATUR</p><h2 id="drop-heading">Ströme zuordnen</h2></div><span className="status-badge">{Object.keys(answers).length}/{task.cards.length}</span></div>
      <p>Wähle eine Karte und danach ein Ziel. Auf großen Bildschirmen kannst du auch ziehen.</p>
      <div className="task-cards" role="list" aria-label="Transaktionskarten">
        {task.cards.map((card) => <button key={card.id} draggable className={`task-card ${selected === card.id ? 'selected' : ''}`} type="button" onClick={() => setSelected(card.id)} onKeyDown={(event) => onCardKey(event, card.id)} onDragStart={(event) => onDragStart(event, card.id)} aria-pressed={selected === card.id}>{card.label}<small>{answers[card.id] ? `Zugeordnet: ${task.zones.find((zone) => zone.id === answers[card.id])?.label}` : 'Noch nicht zugeordnet'}</small></button>)}
      </div>
      <div className="drop-zones">
        {task.zones.map((zone) => <button key={zone.id} className="drop-zone" type="button" onClick={() => selected && setAnswer(selected, zone.id)} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); const cardId = event.dataTransfer.getData('text/plain'); if (cardId) setAnswer(cardId, zone.id) }}><Icon name="arrow" /><b>{zone.label}</b><span>{selected ? 'Hier ablegen' : 'Erst Karte wählen'}</span></button>)}
      </div>
      <p className="sr-status" aria-live="polite">{selected ? `${task.cards.find((card) => card.id === selected)?.label} gewählt. Jetzt Ziel wählen.` : `${Object.keys(answers).length} von ${task.cards.length} Karten zugeordnet.`}</p>
    </section>
  )
}

export function CalculationTaskCard({ task, answers, onChange }: { task: CalculationTask; answers: Record<string, string>; onChange: (answers: Record<string, string>) => void }) {
  return (
    <section className="calculation-task card" aria-labelledby="calculation-heading">
      <div className="section-head"><div><p className="eyebrow">EINFACH RECHNEN</p><h2 id="calculation-heading">Kennzahlen bestimmen</h2></div><span className="status-badge">{Object.keys(answers).length}/{task.fields.length}</span></div>
      <p>{task.introduction}</p>
      <div className="calculation-fields">
        {task.fields.map((field) => (
          <label key={field.id} htmlFor={`calculation-${field.id}`}>
            <span><b>{field.label}</b><small>{field.formula}</small></span>
            <span className="number-entry"><input id={`calculation-${field.id}`} inputMode="decimal" type="number" step="any" value={answers[field.id] ?? ''} onChange={(event) => onChange({ ...answers, [field.id]: event.target.value })} /><small>{field.unit}</small></span>
          </label>
        ))}
      </div>
      <p className="calculation-note"><Icon name="idea" /> Trage nur die Zahl ein. Eine schriftliche Begründung ist hier noch nicht nötig.</p>
    </section>
  )
}

export function PolicyIntensity({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const change = (next: number) => onChange(Math.max(50, Math.min(150, next)))
  return (
    <section className="policy-scale" aria-labelledby="scale-heading">
      <div className="scale-label"><h3 id="scale-heading">Instrumentstärke</h3><output htmlFor="policy-intensity">{value} % des vorgeschlagenen Impulses</output></div>
      <div className="range-row"><button type="button" onClick={() => change(value - 10)} aria-label="Instrument um 10 Prozentpunkte verringern">−</button><input id="policy-intensity" aria-label="Instrumentstärke" type="range" min="50" max="150" step="10" value={value} onChange={(event) => onChange(Number(event.target.value))} /><button type="button" onClick={() => change(value + 10)} aria-label="Instrument um 10 Prozentpunkte erhöhen">+</button></div>
      <p>Die Richtung bleibt gleich. Höhere Intensität verstärkt Chancen und Zielkonflikte; die tatsächliche Wirkung bleibt modellabhängig.</p>
    </section>
  )
}

const rubricLabels: Record<keyof Rubric, string> = { accounting: 'Kontenlogik', direction: 'Stromrichtung', time: 'Zeitbezug', assumptions: 'Annahmen', distribution: 'Verteilung', reasoning: 'Begründung' }

export function FeedbackRubric({ rubric, assessed = Object.keys(rubric) as RubricKey[] }: { rubric: Rubric; assessed?: RubricKey[] }) {
  return <div className="rubric" aria-label="Teilfeedback">{(Object.keys(rubric) as RubricKey[]).map((key) => {
    const isAssessed = assessed.includes(key)
    return <div key={key} className={!isAssessed ? 'not-assessed' : ''}><span>{rubricLabels[key]}</span><strong>{isAssessed ? `${rubric[key]} / 2` : 'später'}</strong><small>{!isAssessed ? 'in dieser Stufe noch nicht bewertet' : rubric[key] === 2 ? 'sicher gelöst' : rubric[key] === 1 ? 'teilweise gelöst' : 'noch üben'}</small></div>
  })}</div>
}

export function IndicatorHistory({ history }: { history: RoundRecord[] }) {
  const rows = useMemo(() => history.map((record) => ({ round: record.round, y: record.accountsAfter.Y, balance: record.accountsAfter.planBalance, inventory: record.inventoryChange })), [history])
  const max = Math.max(1, ...rows.map((row) => Math.abs(row.balance)), ...rows.map((row) => Math.abs(row.inventory)))
  return (
    <section className="history-chart card" aria-labelledby="chart-heading">
      <div className="section-head"><div><p className="eyebrow">DATEN ANALYSIEREN</p><h2 id="chart-heading">Saldo und ungeplante Lageränderung</h2></div></div>
      <div className="bar-chart" aria-hidden="true">{rows.map((row) => <div className="bar-group" key={row.round}><div className="bars"><i className={`bar balance ${row.balance < 0 ? 'negative' : ''}`} style={{ height: `${18 + Math.abs(row.balance) / max * 80}px` }} /><i className={`bar inventory ${row.inventory < 0 ? 'negative' : ''}`} style={{ height: `${18 + Math.abs(row.inventory) / max * 80}px` }} /></div><b>R{row.round}</b></div>)}</div>
      <p className="trend-text">Plan-Saldo und Lageränderung haben entgegengesetzte Vorzeichen: Ein negativer Nachfrage-Saldo führt zunächst zu einem positiven Lageraufbau.</p>
      <details open><summary>Datentabelle</summary><div className="table-wrap"><table><caption>Rundendaten, Beträge in Mrd. € je Quartal</caption><thead><tr><th>Runde</th><th scope="col">Y</th><th scope="col">Plan-Saldo</th><th scope="col">Lageränderung</th></tr></thead><tbody>{rows.map((row) => <tr key={row.round}><th scope="row">{row.round}</th><td>{row.y}</td><td>{row.balance > 0 ? '+' : ''}{row.balance}</td><td>{row.inventory > 0 ? '+' : ''}{row.inventory}</td></tr>)}</tbody></table></div></details>
    </section>
  )
}
