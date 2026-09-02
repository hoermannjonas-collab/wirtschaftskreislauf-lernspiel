# Wirtschaftskreislauf – Das Lernspiel

Tablet- und mobilfreundliche Lernsimulation für Schüler:innen der Fachoberschule. Die App beginnt bewusst niedrigschwellig mit Erkennen, Zuordnen und einfachem Rechnen. Erst nach dieser Basis folgen Prognosen, Rundenfortschritt, ungeplante Lagerveränderungen und die Beurteilung wirtschaftspolitischer Maßnahmen.

## Direkt öffnen

**[Wirtschaftskreislauf – Das Lernspiel starten](https://hoermannjonas-collab.github.io/wirtschaftskreislauf-lernspiel/)**

## Was enthalten ist

- React 19, TypeScript und Vite
- vier vollständig spielbare Demo-Missionen
- sichtbare Progression **Grundlage → Anwendung → Analyse → Beurteilung**
- Einstiegsrunden ohne Prognose, Zeitbegründung oder Reflexionspflicht
- Bewertung nur der Kompetenzen, die in der jeweiligen Runde tatsächlich verlangt werden
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

Die ersten Runden folgen dem kurzen Ablauf **Ansehen → Lösen → Prüfen**. Sie verlangen nur Begriffs-, Richtungs-, Konten- oder Rechenwissen. Simulationsrunden erweitern den Ablauf auf **Beobachten → Bearbeiten → Prognose → Auswerten → Reflektieren**. Ein Zeitsprung und zeitliche Begründungen erscheinen damit erst, wenn die fachliche Basis gelegt ist.

### Didaktische Niveaustufung

Die Progression orientiert sich am bayerischen LehrplanPLUS:

- Jahrgangsstufe 11 legt im Profilfach VWL den Schwerpunkt auf mikroökonomische bzw. einzelwirtschaftliche Grundlagen.
- Jahrgangsstufe 12 wechselt zu makroökonomischen Vorgängen, Modellen, Kennzahlen und Ursache-Wirkungs-Zusammenhängen.
- Jahrgangsstufe 13 fordert vertiefte Analyse, begründete Standpunkte und die Beurteilung fiskalpolitischer Maßnahmen einschließlich Wirkungen und Folgen.
- Die App nutzt entsprechend vier Aufgabentiefen: **Grundlage** (identifizieren/zuordnen), **Anwendung** (einsetzen/berechnen), **Analyse** (Zusammenhänge und Zeitbezug), **Beurteilung** (Annahmen, Verteilung und Zielkonflikte).

Offizielle Grundlagen: [Fachprofil Volkswirtschaftslehre FOS](https://www.lehrplanplus.bayern.de/fachprofil/fos/volkswirtschaftslehre/12), [VWL 12](https://www.lehrplanplus.bayern.de/fachlehrplan/fos/12/volkswirtschaftslehre), [VWL 13](https://www.lehrplanplus.bayern.de/fachlehrplan/fos/13/volkswirtschaftslehre) und [ISB-Leitfaden zu kompetenzorientierten Leistungsaufgaben](https://www.isb.bayern.de/fileadmin/user_upload/Grundsatzabteilung/Kompetenzorientierung/Leitfaden_kompetenzorientierte_leistungsaufgaben_2019.pdf).

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

## GitHub Pages

Die App ist unter <https://hoermannjonas-collab.github.io/wirtschaftskreislauf-lernspiel/> veröffentlicht. Jeder Push auf `main` startet automatisch Tests, Build und Deployment.

Für eine Kopie in einem anderen Repository:

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
