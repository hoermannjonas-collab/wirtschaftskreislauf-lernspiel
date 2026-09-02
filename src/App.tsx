import { useEffect, useMemo, useState } from 'react'
import { actors, missionById, missions } from './data'
import { clearGame, loadGame, saveGame } from './persistence'
import { applyChoice, applyDelayedAdjustment, calculateAccounts, scoreRationale, unplannedInventoryChange, updateIndicators } from './simulation'
import type { ActorId, Choice, GameState, Level, Rubric, RubricKey } from './types'
import { AssignmentBlock, BalanceCard, CalculationTaskCard, FeedbackRubric, FlowMap, Icon, IndicatorHistory, MetricGrid, PolicyIntensity, TouchDropTask } from './components'

type View = 'home' | 'select' | 'game' | 'results' | 'actors'
type GamePanel = 'simulation' | 'task' | 'analysis'

const predictions = [
  'Die Zuführungen steigen.',
  'Die Entnahmen steigen.',
  'Der Lagerbestand steigt zunächst.',
  'Der Lagerbestand sinkt zunächst.',
  'Produktion und Einkommen reagieren erst verzögert.',
  'Die Beschäftigungswirkung hängt von Annahmen ab.',
]

const phaseLabels = { observe: 'Beobachten', act: 'Bearbeiten', predict: 'Prognose', reveal: 'Auswerten' }

function createGame(missionId: string, role: ActorId): GameState {
  const mission = missionById(missionId)
  return {
    missionId,
    role,
    round: 0,
    phase: 'observe',
    accounts: { ...mission.initialAccounts },
    indicators: { ...mission.initialIndicators },
    inventoryStock: 0,
    selectedChoiceId: '',
    policyIntensity: 100,
    prediction: [],
    rationale: '',
    reflection: '',
    flowAnswers: {},
    calculationAnswers: {},
    history: [],
  }
}

function scaledChoice(choice: Choice, intensity: number): Choice {
  const scale = intensity / 100
  const effect = Object.fromEntries(Object.entries(choice.effect).map(([key, value]) => [key, Math.round(Number(value) * scale * 10) / 10])) as Choice['effect']
  return { ...choice, effect }
}

function AppHeader({ view, game, onHome, onActors }: { view: View; game: GameState | null; onHome: () => void; onActors: () => void }) {
  const mission = game ? missionById(game.missionId) : null
  return (
    <header className="app-header">
      <button className="brand" type="button" onClick={onHome} aria-label="Zur Startseite">
        <span className="brand-mark" aria-hidden="true">↻</span>
        <span><b>Wirtschaftskreislauf</b><small>Das Lernspiel</small></span>
      </button>
      <nav aria-label="Hauptnavigation">
        <button type="button" onClick={onActors}><Icon name="book" /> Akteure</button>
        {mission && view === 'game' && <span className="round-badge">{mission.level} · Runde {game!.round + 1}/{mission.rounds.length}</span>}
      </nav>
    </header>
  )
}

function Home({ saved, onSelect, onResume }: { saved: GameState | null; onSelect: (level: Level) => void; onResume: () => void }) {
  return (
    <main id="main-content" className="home-page">
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow light">LERNEN DURCH STEUERN UND DEUTEN</p>
          <h1>Wirtschaftskreislauf<br /><span>Das Lernspiel</span></h1>
          <p>Beginne mit Erkennen, Zuordnen und Rechnen. Erst danach untersuchst du Entscheidungen, Annahmen und zeitlich verzögerte Folgen.</p>
          {saved && <button className="button primary inverse" type="button" onClick={onResume}><Icon name="play" /> Gespeichertes Spiel fortsetzen</button>}
        </div>
        <div className="hero-orbit" aria-hidden="true">
          <span className="orbit-node n1">⌂</span><span className="orbit-node n2">⌘</span><span className="orbit-node n3">⚑</span><span className="orbit-node n4">▦</span><span className="orbit-node n5">◎</span><b>S + T + M<br />↕<br />I + G + X</b>
        </div>
      </section>
      <div className="page-shell start-shell">
        <AssignmentBlock instruction="Wähle eine Stufe. Danach entscheidest du dich für eine Mission und eine Perspektive." tip="Die einfache Stufe konzentriert sich auf Haushalte und Unternehmen; die erweiterte ergänzt Staat, Banken und Ausland." checkAfter="Du kannst jede Mission jederzeit neu starten; der Spielstand bleibt nur auf diesem Gerät.">
          <p className="assignment-note"><Icon name="save" /> Kein Login nötig · lokale Speicherung</p>
        </AssignmentBlock>
        <section className="level-grid" aria-labelledby="level-heading">
          <h2 id="level-heading" className="sr-only">Stufe wählen</h2>
          <article className="level-card simple-level">
            <div className="level-icon" aria-hidden="true">⌂ ↔ ⌘</div><span className="pill green">EINSTIEG · FOS 11/12</span><h2>Schrittweise einsteigen</h2><p>Vom einfachen Akteurs- und Stromverständnis über S und I bis zur ersten dynamischen Kreislaufanalyse.</p><ul><li>ohne Begründungsdruck starten</li><li>einfache Salden rechnen</li><li>erst später Folgen erklären</li></ul><button className="button primary" type="button" onClick={() => onSelect('FOS 11')}>Einstieg starten <Icon name="arrow" /></button>
          </article>
          <article className="level-card advanced-level">
            <div className="level-icon" aria-hidden="true">⚑ ▦ ◎</div><span className="pill blue">ERWEITERTE STUFE · FOS 13</span><h2>Zusammenhänge vertiefen</h2><p>Staat, Finanzsektor, Ausland, Konjunktur, Inflation, Arbeitslosigkeit und Zielkonflikte.</p><ul><li>Ereignisse bewerten</li><li>Instrumente steuern</li><li>Verteilung reflektieren</li></ul><button className="button secondary blue-button" type="button" onClick={() => onSelect('FOS 13')}>Erweiterte Stufe starten <Icon name="arrow" /></button>
          </article>
        </section>
        <section className="how-it-works"><p className="eyebrow">DIE ANFORDERUNG WÄCHST MIT</p><ol><li><span>1</span>Grundlage erkennen</li><li><span>2</span>einfach anwenden</li><li><span>3</span>Zusammenhänge analysieren</li><li><span>4</span>Maßnahmen beurteilen</li></ol></section>
      </div>
    </main>
  )
}

function MissionSelect({ initialLevel, onStart }: { initialLevel: Level; onStart: (missionId: string, role: ActorId) => void }) {
  const [level, setLevel] = useState<Level>(initialLevel)
  const available = missions.filter((mission) => level === 'FOS 13' ? mission.level === 'FOS 13' : mission.level !== 'FOS 13')
  const [missionId, setMissionId] = useState(available[0]?.id ?? missions[0].id)
  const selectedMission = missionById(missionId)
  const [role, setRole] = useState<ActorId>(selectedMission.actors[0])

  useEffect(() => {
    const next = missions.find((mission) => level === 'FOS 13' ? mission.level === 'FOS 13' : mission.level !== 'FOS 13')!
    setMissionId(next.id)
    setRole(next.actors[0])
  }, [level])

  useEffect(() => {
    if (!selectedMission.actors.includes(role)) setRole(selectedMission.actors[0])
  }, [selectedMission, role])

  return (
    <main id="main-content" className="page-shell select-page">
      <div className="page-title"><p className="eyebrow">01 · MODUS, MISSION UND PERSPEKTIVE</p><h1>Welche Volkswirtschaft untersuchst du?</h1><p>Rollen verändern sichtbare Hinweise, nie die Fachlogik oder die Daten. Die Missionen steigen von Grundlagen zu Analyse und Beurteilung.</p></div>
      <AssignmentBlock instruction="Wähle Fachstufe, Mission und Perspektive. Öffne dann die Ausgangslage." tip="Beginne mit ‚Sparen oder investieren?‘, wenn du den Kreislauf zum ersten Mal spielst." checkAfter="Prüfe Lernziel, Rundenzahl und beteiligte Akteure." />
      <section className="selector-card card" aria-labelledby="level-select-heading"><h2 id="level-select-heading">1. Fachliche Stufe</h2><div className="segmented"><button className={level !== 'FOS 13' ? 'active' : ''} type="button" onClick={() => setLevel('FOS 11')} aria-pressed={level !== 'FOS 13'}>Einfach · FOS 11/12</button><button className={level === 'FOS 13' ? 'active' : ''} type="button" onClick={() => setLevel('FOS 13')} aria-pressed={level === 'FOS 13'}>Erweitert · FOS 13</button></div></section>
      <section className="mission-grid" aria-labelledby="mission-heading"><h2 id="mission-heading" className="section-title">2. Mission</h2>{available.map((mission) => <button key={mission.id} type="button" className={`mission-card ${missionId === mission.id ? 'selected' : ''}`} onClick={() => setMissionId(mission.id)} aria-pressed={missionId === mission.id}><span className="mission-number">{String(missions.indexOf(mission) + 1).padStart(2, '0')}</span><span className="pill blue">{mission.level}</span><strong>{mission.title}</strong><p>{mission.summary}</p><small>{mission.duration} · {mission.rounds.map((round) => round.demandLevel).filter((item, index, all) => all.indexOf(item) === index).join(' → ')}</small></button>)}</section>
      <section className="role-section card" aria-labelledby="role-heading"><div><p className="eyebrow">3 · PERSPEKTIVE</p><h2 id="role-heading">Welche Informationen siehst du zuerst?</h2><p>Die Berechnungen bleiben in allen Rollen identisch.</p></div><div className="role-grid">{selectedMission.actors.map((actorId) => <button type="button" key={actorId} className={role === actorId ? 'selected' : ''} onClick={() => setRole(actorId)} aria-pressed={role === actorId}><span>{actors[actorId].symbol}</span><b>{actors[actorId].label}</b><small>{actors[actorId].accounts}</small></button>)}</div></section>
      <section className="mission-brief card"><div><p className="eyebrow">AUSGANGSLAGE</p><h2>{selectedMission.title}</h2><p>{selectedMission.summary}</p><div className="brief-facts"><span><b>Lernziel</b>{selectedMission.rounds[0].learningGoal}</span><span><b>Runden</b>{selectedMission.rounds.length}</span><span><b>Perspektive</b>{actors[role].label}</span></div></div><button className="button primary big" type="button" onClick={() => onStart(missionId, role)}>Mission laden <Icon name="arrow" /></button></section>
    </main>
  )
}

function ContextStrip({ situation, goal, event }: { situation: string; goal: string; event: string }) {
  return <section className="context-strip"><div><span>Was ist zu sehen?</span><p>{situation}</p></div><div><span>Warum ist es relevant?</span><p>{goal}</p></div><div><span>Was passiert jetzt?</span><p>{event}</p></div></section>
}

function Game({ state, setState, onFinish }: { state: GameState; setState: (state: GameState) => void; onFinish: () => void }) {
  const mission = missionById(state.missionId)
  const currentRound = mission.rounds[state.round]
  const accounts = calculateAccounts(state.accounts)
  const [panel, setPanel] = useState<GamePanel>('simulation')
  const choice = currentRound.choices.find((item) => item.id === state.selectedChoiceId)
  const role = actors[state.role]
  const roundPhases: GameState['phase'][] = currentRound.requiresPrediction ? ['observe', 'act', 'predict', 'reveal'] : ['observe', 'act', 'reveal']
  const flowComplete = !currentRound.flowTask || currentRound.flowTask.cards.every((card) => Boolean(state.flowAnswers[card.id]))
  const calculationComplete = !currentRound.calculationTask || currentRound.calculationTask.fields.every((field) => state.calculationAnswers[field.id] !== undefined && state.calculationAnswers[field.id] !== '')
  const taskComplete = Boolean(choice) && flowComplete && calculationComplete

  const setPhase = (phase: GameState['phase']) => {
    setState({ ...state, phase })
    setPanel(phase === 'act' || phase === 'predict' ? 'task' : 'simulation')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const togglePrediction = (prediction: string) => setState({ ...state, prediction: state.prediction.includes(prediction) ? state.prediction.filter((item) => item !== prediction) : [...state.prediction, prediction] })

  const simulate = () => {
    if (!choice) return
    const adjustedChoice = scaledChoice(choice, mission.level === 'FOS 13' ? state.policyIntensity : 100)
    const before = calculateAccounts(state.accounts)
    const nextInput = currentRound.simulationRound ? applyChoice(state.accounts, adjustedChoice) : { ...state.accounts }
    const after = calculateAccounts(nextInput)
    const inventoryChange = currentRound.simulationRound ? unplannedInventoryChange(after.planBalance) : 0
    const task = currentRound.flowTask
    const flowCorrect = task ? task.cards.filter((card) => state.flowAnswers[card.id] === card.target).length : 0
    const calculation = currentRound.calculationTask
    const calculationCorrect = calculation ? calculation.fields.filter((field) => Number(state.calculationAnswers[field.id]) === field.answer).length : 0
    const choiceTotal = choice.correct === undefined ? 0 : 1
    const choiceCorrect = choice.correct === true ? 1 : 0
    const taskCorrect = flowCorrect + calculationCorrect + choiceCorrect
    const taskTotal = (task?.cards.length ?? 0) + (calculation?.fields.length ?? 0) + choiceTotal
    const accountingCorrect = calculationCorrect + choiceCorrect
    const accountingTotal = (calculation?.fields.length ?? 0) + choiceTotal
    const rubric = scoreRationale(state.rationale, state.prediction.length, flowCorrect, task?.cards.length ?? 0)
    if (task && currentRound.assessedCriteria.includes('direction')) rubric.direction = flowCorrect === task.cards.length ? 2 : flowCorrect >= task.cards.length / 2 ? 1 : 0
    if (accountingTotal && currentRound.assessedCriteria.includes('accounting')) rubric.accounting = Math.round(accountingCorrect / accountingTotal * 2)
    const record = { round: state.round + 1, choiceId: choice.id, choiceLabel: choice.label, rationale: state.rationale, prediction: state.prediction, accountsBefore: before, accountsAfter: after, inventoryChange, direct: choice.direct, delayed: choice.delayed, distribution: choice.distribution, conflict: choice.conflict, assumptions: choice.assumptions, rubric, assessedCriteria: currentRound.assessedCriteria, demandLevel: currentRound.demandLevel, simulationRound: currentRound.simulationRound, taskCorrect, taskTotal }
    setState({ ...state, accounts: nextInput, indicators: currentRound.simulationRound ? updateIndicators(state.indicators, adjustedChoice, after.planBalance, after) : state.indicators, inventoryStock: currentRound.simulationRound ? Math.round((state.inventoryStock + inventoryChange) * 10) / 10 : state.inventoryStock, history: [...state.history, record], phase: 'reveal' })
    setPanel('simulation')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const finishRound = () => {
    if (state.round >= mission.rounds.length - 1) {
      onFinish()
      return
    }
    const last = state.history[state.history.length - 1]
    const delayed = last.simulationRound ? applyDelayedAdjustment(state.accounts, state.indicators, last.accountsAfter.planBalance) : { accounts: state.accounts, indicators: state.indicators }
    setState({ ...state, accounts: delayed.accounts, indicators: delayed.indicators, round: state.round + 1, phase: 'observe', selectedChoiceId: '', policyIntensity: 100, prediction: [], rationale: '', reflection: '', flowAnswers: {}, calculationAnswers: {} })
    setPanel('simulation')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <main id="main-content" className="game-page">
      <section className="game-hero"><div className="page-shell"><div><p className="eyebrow light">MISSION {state.round + 1}/{mission.rounds.length} · {mission.level}</p><h1>{mission.title}</h1><p>{currentRound.title}</p></div><div className="perspective"><span>{role.symbol}</span><div><small>Deine Perspektive</small><b>{role.label}</b></div></div></div></section>
      <div className="page-shell game-shell">
        <nav className="phase-progress" aria-label="Rundenfortschritt">{roundPhases.map((phase, index) => <span key={phase} className={`${state.phase === phase ? 'current' : ''} ${roundPhases.indexOf(state.phase) > index ? 'done' : ''}`}><i>{roundPhases.indexOf(state.phase) > index ? '✓' : index + 1}</i>{phaseLabels[phase]}</span>)}</nav>
        <div className={`demand-banner demand-${currentRound.demandLevel.toLocaleLowerCase('de-DE')}`}><b>Anforderungsstufe: {currentRound.demandLevel}</b><span>{currentRound.requiresPrediction ? 'Prognose und Begründung sind Teil dieser Runde.' : 'Noch keine Prognose und keine zeitliche Begründung.'}</span></div>
        <ContextStrip situation={currentRound.situation} goal={currentRound.learningGoal} event={currentRound.event} />
        <AssignmentBlock instruction={currentRound.instruction} tip={currentRound.tip} checkAfter={currentRound.checkAfter} />
        <div className="game-tabs" role="tablist" aria-label="Ansicht wählen"><button role="tab" aria-selected={panel === 'simulation'} className={panel === 'simulation' ? 'active' : ''} type="button" onClick={() => setPanel('simulation')}><Icon name="play" /> {currentRound.simulationRound ? 'Simulation' : 'Übersicht'}</button><button role="tab" aria-selected={panel === 'task'} className={panel === 'task' ? 'active' : ''} type="button" onClick={() => setPanel('task')}><Icon name="book" /> Aufgabe</button>{currentRound.simulationRound && <button role="tab" aria-selected={panel === 'analysis'} className={panel === 'analysis' ? 'active' : ''} type="button" onClick={() => setPanel('analysis')}><Icon name="chart" /> Analyse</button>}</div>
        {panel === 'analysis' ? (
          <><MetricGrid accounts={accounts} indicators={state.indicators} inventoryStock={state.inventoryStock} />{state.history.length ? <IndicatorHistory history={state.history} /> : <section className="empty-state card"><Icon name="chart" /><h2>Noch keine Rundendaten</h2><p>Nach deinem ersten Zeitsprung erscheint hier die Datenanalyse samt Tabelle.</p></section>}</>
        ) : state.phase === 'observe' && panel === 'simulation' ? (
          <>{currentRound.simulationRound && <MetricGrid accounts={accounts} indicators={state.indicators} inventoryStock={state.inventoryStock} />}<div className={currentRound.simulationRound ? 'two-column' : ''}><FlowMap actorIds={mission.actors} simple={mission.level !== 'FOS 13'} />{currentRound.simulationRound && <BalanceCard accounts={accounts} />}</div><section className="role-insight card"><span>{role.symbol}</span><div><p className="eyebrow">PERSPEKTIV-HINWEIS</p><h2>{role.label}</h2><p>{currentRound.simulationRound ? role.blindSpot : 'Konzentriere dich in dieser Grundlagenrunde nur auf Begriffe, Richtung und Kontenfunktion.'}</p></div></section><div className="action-bar"><span>Übersicht angesehen?</span><button className="button primary" type="button" onClick={() => setPhase('act')}>Zur Aufgabe <Icon name="arrow" /></button></div></>
        ) : state.phase === 'act' ? (
          <div className="task-layout">
            {currentRound.flowTask && <TouchDropTask task={currentRound.flowTask} answers={state.flowAnswers} onChange={(flowAnswers) => setState({ ...state, flowAnswers })} />}
            {currentRound.calculationTask && <CalculationTaskCard task={currentRound.calculationTask} answers={state.calculationAnswers} onChange={(calculationAnswers) => setState({ ...state, calculationAnswers })} />}
            <section className="decision-card card" aria-labelledby="decision-heading"><div className="section-head"><div><p className="eyebrow">{currentRound.simulationRound ? 'ENTSCHEIDUNG' : 'VERSTÄNDNISCHECK'}</p><h2 id="decision-heading">{currentRound.simulationRound ? 'Wie reagierst du?' : 'Welche Aussage passt?'}</h2></div><span className="status-badge">{currentRound.choices.length} Optionen</span></div><p>{currentRound.requiresRationale ? 'Mehrere Wirkungen sind plausibel. Entscheidend ist deine fachliche Begründung.' : 'Wähle eine Antwort. Du musst sie in dieser Runde noch nicht schriftlich begründen.'}</p><div className="choice-grid">{currentRound.choices.map((item) => <button key={item.id} className={`choice-card ${state.selectedChoiceId === item.id ? 'selected' : ''}`} type="button" onClick={() => setState({ ...state, selectedChoiceId: item.id })} aria-pressed={state.selectedChoiceId === item.id}><span className="choice-check">{state.selectedChoiceId === item.id ? '✓' : '○'}</span><b>{item.label}</b><p>{item.description}</p><small>{currentRound.simulationRound ? 'Wirkungspfad wählen' : 'Antwort auswählen'}</small></button>)}</div>{mission.level === 'FOS 13' && state.selectedChoiceId && currentRound.simulationRound && <PolicyIntensity value={state.policyIntensity} onChange={(policyIntensity) => setState({ ...state, policyIntensity })} />}<div className="action-bar"><button className="button ghost" type="button" onClick={() => setPhase('observe')}>Zurück</button><button className="button primary" type="button" disabled={!taskComplete} onClick={() => currentRound.requiresPrediction ? setPhase('predict') : simulate()}>{currentRound.requiresPrediction ? 'Prognose formulieren' : 'Antwort prüfen'} <Icon name="arrow" /></button></div></section>
          </div>
        ) : state.phase === 'predict' && choice ? (
          <section className="prediction-card card"><div className="section-head"><div><p className="eyebrow">VOR DEM ZEITSPRUNG</p><h2>Was erwartest du nach „{choice.label}“?</h2></div><span className="status-badge attention">{currentRound.demandLevel}</span></div><div className="prediction-layout"><fieldset><legend>Wähle plausible Wirkungen</legend><div className="claim-grid">{predictions.map((item) => <label key={item} className={state.prediction.includes(item) ? 'selected' : ''}><input type="checkbox" checked={state.prediction.includes(item)} onChange={() => togglePrediction(item)} /><span>{item}</span></label>)}</div></fieldset><div className="rationale"><label htmlFor="rationale"><b>Deine fachliche Begründung</b><span>Nenne Richtung, direkten oder verzögerten Zeitpunkt und mindestens eine Annahme{currentRound.assessedCriteria.includes('distribution') ? ' sowie eine Verteilungswirkung' : ''}.</span></label><textarea id="rationale" value={state.rationale} onChange={(event) => setState({ ...state, rationale: event.target.value })} placeholder={currentRound.assessedCriteria.includes('distribution') ? 'Unter der Annahme, dass …, steigt/sinkt zunächst … In der Folgerunde … Betroffen sind besonders …' : 'Unter der Annahme, dass …, steigt/sinkt zunächst … In der Folgerunde …'} /><small>{state.rationale.length} Zeichen · empfohlen: mindestens {currentRound.demandLevel === 'Beurteilung' ? '120' : '80'}</small></div></div><div className="assumption-preview"><Icon name="idea" /><span><b>Modellhinweis:</b> Der Zeitsprung wird erst aktiv, wenn du mindestens eine Wirkung und eine kurze Begründung eingetragen hast.</span></div><div className="action-bar"><button className="button ghost" type="button" onClick={() => setPhase('act')}>Entscheidung ändern</button><button className="button primary" type="button" disabled={!state.prediction.length || state.rationale.trim().length < 30} onClick={simulate}>Zeit fortschreiten lassen <Icon name="arrow" /></button></div></section>
        ) : state.phase === 'reveal' ? (
          <Reveal state={state} onReflection={(reflection) => setState({ ...state, reflection })} onContinue={finishRound} isLast={state.round === mission.rounds.length - 1} />
        ) : panel === 'task' ? (
          <section className="empty-state card"><Icon name="book" /><h2>Beobachte zuerst die Ausgangslage</h2><p>Danach wird die Entscheidung freigeschaltet.</p><button className="button primary" type="button" onClick={() => setPanel('simulation')}>Zur Simulation</button></section>
        ) : null}
      </div>
    </main>
  )
}

function Reveal({ state, onReflection, onContinue, isLast }: { state: GameState; onReflection: (value: string) => void; onContinue: () => void; isLast: boolean }) {
  const record = state.history[state.history.length - 1]
  if (!record) return null
  const balance = record.accountsAfter.planBalance
  if (!record.simulationRound) {
    const allCorrect = record.taskTotal > 0 && record.taskCorrect === record.taskTotal
    return (
      <section className="reveal-grid foundation-reveal">
        <article className="consequence-card card"><div className="section-head"><div><p className="eyebrow">{record.demandLevel.toLocaleUpperCase('de-DE')} GEPRÜFT</p><h2>{allCorrect ? 'Die Grundlage sitzt.' : 'Fast – sieh dir die Rückmeldung an.'}</h2></div><span className={`status-badge ${allCorrect ? 'good' : 'attention'}`}>{record.taskCorrect}/{record.taskTotal} richtig</span></div><div className="foundation-result"><Icon name={allCorrect ? 'check' : 'idea'} /><div><b>Auflösung</b><p>{record.direct}</p></div></div><p className="foundation-boundary"><b>Bewusst noch nicht verlangt:</b> Prognose, zeitliche Wirkungskette, Annahmen und Verteilungsanalyse. Diese Kompetenzen werden in späteren Runden aufgebaut.</p></article>
        <article className="feedback-card card"><p className="eyebrow">PASSEND ZUR STUFE</p><h2>Dein Teilfeedback</h2><FeedbackRubric rubric={record.rubric} assessed={record.assessedCriteria} /><div className="feedback-copy"><p><b>{allCorrect ? 'Weiter so:' : 'Nächster Versuch:'}</b> {allCorrect ? 'Du kannst die Begriffe jetzt in einer einfachen Rechnung anwenden.' : 'Vergleiche noch einmal Richtung, Gegenstrom und Kontenfunktion.'}</p></div><button className="button primary full" type="button" onClick={onContinue}>{isLast ? 'Mission auswerten' : 'Nächste Runde'} <Icon name="arrow" /></button></article>
      </section>
    )
  }
  return (
    <section className="reveal-grid">
      <article className="consequence-card card"><div className="section-head"><div><p className="eyebrow">RUNDE AUSGEWERTET</p><h2>Was ist nach deiner Entscheidung passiert?</h2></div><span className="status-badge good"><Icon name="check" /> verbucht</span></div><div className="effect-chain"><div><i>1</i><span><b>Direkter Effekt</b>{record.direct}</span></div><div><i>2</i><span><b>Ungeplantes Lager</b>{record.inventoryChange > 0 ? `Aufbau um ${record.inventoryChange}` : record.inventoryChange < 0 ? `Abbau um ${Math.abs(record.inventoryChange)}` : 'Keine ungeplante Änderung'} Mrd. € in dieser Runde.</span></div><div><i>3</i><span><b>Verzögerter Effekt</b>{record.delayed}</span></div>{record.assessedCriteria.includes('distribution') && <><div><i>4</i><span><b>Verteilung</b>{record.distribution}</span></div><div><i>5</i><span><b>Zielkonflikt</b>{record.conflict}</span></div></>}</div><div className="model-result"><span>Plan-Saldo</span><strong>{balance > 0 ? '+' : ''}{balance.toLocaleString('de-DE')} Mrd. €</strong><p>{balance < 0 ? 'Geplante Entnahmen überwiegen: Der Ex-post-Ausgleich erscheint zunächst als ungeplanter Lageraufbau.' : balance > 0 ? 'Geplante Zuführungen überwiegen: Lager werden zunächst ungeplant abgebaut.' : 'Die Pläne sind in dieser Modellrunde ausgeglichen.'}</p></div><details open><summary>Sichtbare Annahmen</summary><ul>{record.assumptions.map((assumption) => <li key={assumption}>{assumption}</li>)}</ul><p>Die angezeigte Kausalkette ist deshalb modellabhängig, nicht zwangsläufig.</p></details></article>
      <article className="feedback-card card"><p className="eyebrow">INDIVIDUELLES FEEDBACK</p><h2>Deine Begründung im Profil</h2><FeedbackRubric rubric={record.rubric} assessed={record.assessedCriteria} /><div className="feedback-copy"><p><b>Stark:</b> {record.rubric.time === 2 ? 'Du trennst direkte und verzögerte Wirkungen.' : 'Du hast eine überprüfbare Prognose formuliert.'}</p><p><b>Noch schärfer:</b> {record.rubric.assumptions < 2 ? 'Formuliere eine Bedingung mit „unter der Annahme, dass …“.' : record.assessedCriteria.includes('distribution') && record.rubric.distribution < 2 ? 'Benenne eine konkret stärker betroffene Gruppe.' : 'Verknüpfe Saldo, Lager und Folgerunde noch expliziter.'}</p></div><label className="reflection-label" htmlFor="reflection"><b>Rückblick: Was würdest du mit neuen Daten prüfen?</b><textarea id="reflection" value={state.reflection} onChange={(event) => onReflection(event.target.value)} placeholder="Ich würde prüfen, ob …" /></label><button className="button primary full" type="button" disabled={state.reflection.trim().length < 15} onClick={onContinue}>{isLast ? 'Mission auswerten' : 'Nächste Runde'} <Icon name="arrow" /></button></article>
    </section>
  )
}

function Results({ state, onRestart, onMenu }: { state: GameState; onRestart: () => void; onMenu: () => void }) {
  const mission = missionById(state.missionId)
  const rubricKeys = ['accounting', 'direction', 'time', 'assumptions', 'distribution', 'reasoning'] as RubricKey[]
  const assessed = rubricKeys.filter((key) => state.history.some((record) => record.assessedCriteria.includes(key)))
  const totals = state.history.reduce<Rubric>((sum, record) => {
    for (const key of record.assessedCriteria) sum[key] += record.rubric[key]
    return sum
  }, { accounting: 0, direction: 0, time: 0, assumptions: 0, distribution: 0, reasoning: 0 })
  const max = state.history.reduce((sum, record) => sum + record.assessedCriteria.length * 2, 0)
  const score = assessed.reduce((sum, key) => sum + totals[key], 0)
  const percent = Math.round(score / max * 100)
  const stars = Math.max(1, Math.min(5, Math.round(percent / 20)))
  const average = Object.fromEntries(rubricKeys.map((key) => {
    const count = state.history.filter((record) => record.assessedCriteria.includes(key)).length
    return [key, count ? Math.round(totals[key] / count) : 0]
  })) as unknown as Rubric
  return (
    <main id="main-content" className="page-shell results-page">
      <AssignmentBlock instruction="Lies zuerst das Teilfeedback und vergleiche danach die Rundendaten." tip="Eine fachlich gute Lösung nennt Bedingungen – sie behauptet keine sichere Wirkung." checkAfter="Notiere eine Erweiterung, die du in einer neuen Mission testen möchtest." />
      <section className="result-hero card"><p className="eyebrow">MISSION ABGESCHLOSSEN</p><h1>{mission.title}</h1><div className="stars" aria-label={`${stars} von 5 Sternen`}>{[1, 2, 3, 4, 5].map((star) => <span key={star} className={star <= stars ? 'filled' : ''}>★</span>)}</div><strong className="result-score">{percent} %</strong><p>Bewertet wurden nur die Kompetenzen, die in der jeweiligen Runde ausdrücklich verlangt waren. Nicht eingeführte Bereiche zählen nicht als Fehler.</p></section>
      <section className="result-summary"><article className="card"><p className="eyebrow">TEILFEEDBACK</p><h2>Dein Kompetenzprofil</h2><FeedbackRubric rubric={average} assessed={assessed} /></article><article className="card"><p className="eyebrow">SCHLUSSBILANZ</p><h2>Was die Simulation zeigt</h2><p><b>Lagerbestand:</b> {state.inventoryStock > 0 ? '+' : ''}{state.inventoryStock} Mrd. €</p><p><b>Beschäftigung:</b> {state.indicators.employment} %</p><p><b>Inflation:</b> {state.indicators.inflation} %</p><p><b>Staatsschulden:</b> {state.indicators.publicDebt} Mrd. € (Bestand)</p><p className="result-note">Identität bedeutet nicht automatisch Stabilität. In Simulationsrunden wurden Planabweichungen zuerst über Lager, anschließend über Folgerunden verarbeitet.</p></article></section>
      <IndicatorHistory history={state.history} />
      <div className="result-actions"><button className="button primary" type="button" onClick={onRestart}>Mission noch einmal</button><button className="button secondary" type="button" onClick={onMenu}>Andere Mission wählen</button></div>
    </main>
  )
}

function ActorLexicon() {
  return (
    <main id="main-content" className="page-shell actor-page"><div className="page-title"><p className="eyebrow">KARTENLEXIKON</p><h1>Wer bewegt welche Ströme?</h1><p>Fachliche Perspektiven, keine bloßen Avatare.</p></div><AssignmentBlock instruction="Öffne die Akteurskarten und vergleiche Entscheidungen, Konten und typische Denkfehler." tip="Eine Perspektive verändert, welche Informationen zuerst erscheinen – nicht die Modellregeln." checkAfter="Kannst du zu jedem Geldstrom einen Leistungs- oder Finanzzusammenhang nennen?" /><section className="actor-card-grid">{Object.entries(actors).map(([id, actor]) => <article className={`actor-card card actor-card-${id}`} key={id}><div className="actor-portrait" aria-hidden="true">{actor.symbol}</div><h2>{actor.label}</h2><p><b>Entscheidungen</b><br />{actor.decisions}</p><p><b>Konten</b><br />{actor.accounts}</p><div className="blind-spot"><Icon name="idea" /><span><b>Achtung:</b> {actor.blindSpot}</span></div></article>)}</section></main>
  )
}

export default function App() {
  const [savedAtStart] = useState<GameState | null>(() => loadGame())
  const [state, setState] = useState<GameState | null>(savedAtStart)
  const [view, setView] = useState<View>('home')
  const [level, setLevel] = useState<Level>('FOS 11')

  useEffect(() => { if (state) saveGame(state) }, [state])
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'auto' }) }, [view])
  const activeMission = useMemo(() => state ? missionById(state.missionId) : null, [state])

  const goHome = () => setView('home')
  const chooseLevel = (chosen: Level) => { setLevel(chosen); setView('select') }
  const start = (missionId: string, role: ActorId) => { const next = createGame(missionId, role); setState(next); setView('game') }
  const restart = () => { if (!state) return; const next = createGame(state.missionId, state.role); setState(next); setView('game') }
  const menu = () => { clearGame(); setState(null); setLevel(activeMission?.level === 'FOS 13' ? 'FOS 13' : 'FOS 11'); setView('select') }

  return (
    <div className="app-frame">
      <AppHeader view={view} game={state} onHome={goHome} onActors={() => setView('actors')} />
      {view === 'home' && <Home saved={state} onSelect={chooseLevel} onResume={() => setView('game')} />}
      {view === 'select' && <MissionSelect initialLevel={level} onStart={start} />}
      {view === 'game' && state && <Game state={state} setState={setState} onFinish={() => setView('results')} />}
      {view === 'results' && state && <Results state={state} onRestart={restart} onMenu={menu} />}
      {view === 'actors' && <ActorLexicon />}
      <footer className="site-footer"><span>Wirtschaftskreislauf – Das Lernspiel</span><span>Fachoberschule · lokal gespeichert · ohne Login</span></footer>
    </div>
  )
}
