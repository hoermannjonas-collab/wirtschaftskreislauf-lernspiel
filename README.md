# Wirtschaftskreislauf – Das Lernspiel

Tablet- und mobilfreundliche Lernsimulation für Schüler:innen der Fachoberschule. Die App verbindet das einfache und erweiterte Kreislaufmodell mit Entscheidungen, verpflichtenden Prognosen, Rundenfortschritt, ungeplanten Lagerveränderungen und erklärendem Teilfeedback.

## Was enthalten ist

- React 19, TypeScript und Vite
- vier vollständig spielbare Demo-Missionen
- einfacher Kreislauf (FOS 11) sowie erweiterter Kreislauf (FOS 13)
- Drag-and-Drop und mobile Alternative „Karte antippen → Ziel antippen“
- wirtschaftspolitische Entscheidungen mit zugänglichem Regler und Plus-/Minus-Tasten
- lokale Speicherung ohne Login
- Screenreader-Stromliste und Datentabellen als Alternativen zu Visualisierungen
- vollständige Tastaturbedienung, sichtbarer Fokus, mindestens 44 × 44 px große Ziele und `prefers-reduced-motion`
- automatisierte Fachmodelltests und GitHub-Pages-Workflow

## Lokaler Start

Voraussetzung: Node.js 22 oder neuer.

```bash
corepack enable
pnpm install
pnpm dev
```

Danach die angezeigte lokale Adresse öffnen. Alternativ funktionieren `npm install` und `npm run dev`.

## Tests und Produktionsbuild

```bash
pnpm test
pnpm build
pnpm preview
```

Der fertige statische Build liegt in `dist/`. Vite verwendet `base: './'`; dadurch bleiben JavaScript, CSS und weitere Assets auch unter einem GitHub-Pages-Unterpfad erreichbar. Die App nutzt bewusst kein serverseitiges Routing.

## Demo-Missionen

1. **Sparen oder investieren?** – FOS 11, 3 Runden
2. **Staat und Finanzsektor im Kreislauf** – FOS 11/12, 3 Runden
3. **Exportdämpfer und Kreditimpuls** – FOS 13, 4 Runden
4. **Ölpreisschock und Zielkonflikte** – FOS 13, 4 Runden

Jede Runde folgt dem Ablauf **Beobachten → Entscheiden → Prognose begründen → Folgen auswerten → reflektieren**. Der Zeitsprung bleibt gesperrt, bis eine Prognose und Begründung vorliegen.

## Fachmodell

Die zentrale Berechnung liegt in `src/simulation.ts`:

```text
Y = C + I + G + (X − M)
Yd = Y − T + TR
S = Yd − C
Entnahmen = S + T + M
Zuführungen = I + G + X
Plan-Saldo = Zuführungen − Entnahmen
```

Ein Plan-Saldo ungleich null wird nicht als automatische Stabilität dargestellt. Zuerst entsteht eine ungeplante Lagerveränderung. Erst beim Übergang in die nächste Runde werden Produktion, Einkommen und Beschäftigung angepasst. Wirkungsketten nennen immer Annahmen und trennen direkten Effekt, Verzögerung, Verteilung und Zielkonflikt.

Die bereitgestellten Demo-Daten enthalten bei der Mission „Exportdämpfer und Kreditimpuls“ eine gerundete Sparangabe `S = 125`, während `Yd − C = 122` ergibt. Die App übernimmt beide verbindlichen Angaben und weist die statistische Abstimmung von `+3 Mrd. €` transparent aus.

## GitHub Pages veröffentlichen

1. Diesen Ordner als öffentliches GitHub-Repository anlegen und auf den Branch `main` pushen.
2. Im Repository **Settings → Pages** öffnen.
3. Unter **Build and deployment** als Source **GitHub Actions** wählen.
4. Den Workflow **Deploy to GitHub Pages** starten oder einen Commit auf `main` pushen.
5. Nach erfolgreichem Lauf steht die URL im Deployment und unter **Settings → Pages**.

Der Workflow `.github/workflows/deploy-pages.yml` installiert reproduzierbar aus `pnpm-lock.yaml`, führt zuerst die Tests aus, baut anschließend `dist/` und veröffentlicht genau dieses Verzeichnis.

## Projektstruktur

```text
src/
  App.tsx           Ansichten und vollständiger Spielablauf
  components.tsx    Kreislauf, Aufgaben, Diagramme, Feedback
  data.ts           Akteure, Ströme und vier Missionen
  simulation.ts     Fachmodell und Rundenlogik
  persistence.ts    lokaler Spielstand
  styles.css        Design-Tokens, Tablet- und Phone-Regeln
tests/              Fachmodell- und Missionsablauftests
.github/workflows/  GitHub-Pages-Deployment
```

## Optionale Erweiterungen

- Lehrkraftmodus für eigene Missionen und Bewertungsraster
- Export der Auswertung als PDF oder Lernplattform-Datei
- weitere Ereignisbibliothek, etwa Wechselkurs- oder Lieferkettenschock
- Mehrsprachigkeit und leichter verständliche Sprachstufe
- gemeinsamer Teammodus mit Rollenwechsel (benötigt dann eine Backend-Synchronisierung)
