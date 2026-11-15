# Rekenhulp — Design Spec

- Started: 2026-10-05
- Status: living spec, the source of truth for behaviour. Decision history is in git.

## 1. Goal

A phone-first PWA for practising arithmetic without a calculator, growing into a practice
platform for the arithmetic of PABO students. Purpose: improve general mental-arithmetic skill
and prepare for the PABO rekentoetsen (RWT and LKT). The user picks a themed practice set,
works through a generated session of exercises, gets immediate feedback per exercise and an
overview at the end.

The app started as short practice on the go, and that stays the default level, **Opfrisser**:
short sessions (~3 minutes) of quick exercises, as all sets have now. v3 adds a second level,
**Verdieping** (§12.2): exercises at the level of the PABO tests (Cito), with more steps and
more time per exercise, plus a 20% share of Opfrisser exercises as retrieval of the basics. The
user chooses the level per session; Tafels has only one level.

A set can also have short study material (**lesstof**): a cheat sheet
to refresh the method before practising. It is developed separately from the practice sets and
has its own spec, `2026-10-25-lesstof-design.md`; this spec only covers its entry points (§3,
§3.1).

### Non-goals

- No accounts, database, statistics, streaks or history
- No persistence at all, including localStorage. Every app start uses defaults.
- No network traffic after the initial load. The app works fully offline.
- No adaptive difficulty: the level is the user's choice per session (§12.2), never adjusted by
  the app.
- No problems that need a calculator, at either level, until v9 (§12.8, §12.11). Verdieping is harder through
  more steps and combined skills, not through numbers that need a calculator; the kladblok
  (§3.6) is the tool for the longer exercises.
- "Platform" means a wider scope of content, not infrastructure: the non-goals above still hold.
- v1 to v3 are done: all sets in §4 are implemented, with their Verdieping. v4 to v12 are on the
  roadmap (§12), and the architecture must make adding them cheap.

## 2. Platform & stack

| Concern    | Choice                                                                 |
|------------|------------------------------------------------------------------------|
| UI         | Svelte 5 (runes), TypeScript strict, no SvelteKit                      |
| Build      | Vite, static output in `dist/`                                         |
| PWA        | `vite-plugin-pwa`, `generateSW`, precache all assets, `prompt` update  |
| Tests      | Vitest (unit), `@testing-library/svelte` for a few component tests     |
| Quality    | `svelte-check`, Prettier                                               |
| Hosting    | Vercel, static files; a push to `main` deploys after tests and checks  |
| Node       | 26 (latest LTS), pinned in `package.json` `engines` and `.nvmrc`       |

Rationale for not using SvelteKit: the app has four screens driven by a state machine and
needs no routing, SSR or server endpoints. Plain Vite + Svelte keeps the surface minimal.

### PWA requirements

- Manifest: name `Rekenhulp`, `display: standalone`, `orientation: any` (tablets are used in
  both orientations; a phone on its side gets a notice, v4 spec §3.3), `theme_color`
  `#5B3FD1`, `background_color` `#F5F6F8`, icons 192/512 px plus a maskable icon, and an
  `apple-touch-icon` for iOS. The icon is the Design V1 logo (violet gradient square with
  + − × ÷ and two yellow dots). The source is full-bleed (no rounded corners) with the symbols
  inside the 80 % safe zone, so the maskable icon fills a round Android mask without a visible
  inner square. The in-app logo keeps its rounded corners.
- An SVG source icon is checked in. PNGs are generated as part of the build.
- Service worker precaches everything, so the app works in airplane mode after the first visit.
- When a new version is deployed, the app asks before updating (see "Update prompt" below).

### Update prompt

- Service worker registration uses `registerType: 'prompt'`: a new version waits until the user
  confirms. The app checks for one on start and on every resume (`visibilitychange` to visible).
- A modal dialog (Dutch: "Er is een nieuwe versie beschikbaar. Nu installeren?", buttons
  Installeren and Later) is shown only on the set overview (`sets`), the set setup (`setup`) and
  the test setup (`testSetup`, oefentoets spec §4.2). Never on `lessonTopics`, `lesson`,
  `playing`, `testing` or `results`.
- An update that arrives on another screen is not lost: the dialog appears as soon as the user is
  back on an allowed screen.
- Later closes the dialog until the next resume or start; if the update is still waiting it is
  offered again then. Installeren activates the new version and reloads.
- After Installeren the dialog shows a busy state ("Installeren…" with a spinner, both buttons
  disabled) until the reload, so the press is visibly acknowledged.
- Escape closes the dialog like Later, except while installing. A system back is not handled by the dialog: it navigates as
  on the screen underneath (spec §3), and the dialog follows the allowed-screen rule above.

### Mobile UX requirements

- The phone layout is portrait, for 360–430 px wide screens, and is what this spec describes.
  Tablets have their own layouts, in portrait and landscape, from 600 px wide: the breakpoints,
  sizes and screens are in the v4 spec (`2026-11-14-tablet-design.md`). A landscape viewport too
  low for any layout shows a notice instead. Respects `env(safe-area-inset-*)` on all four edges.
- `touch-action: manipulation` disables double-tap zoom.
- The page never scrolls while playing: the play screen is exactly one screen high. When the
  content does not fit, the question view lets only the prompt shrink and scroll (the kladblok
  and the keypad keep their size), and the feedback scrolls its prompt, answers, tip and
  explanation while **Verder** stays fixed below them. The other screens scroll as usual.
- Tap targets are ≥ 44 px, except the small **Alle**/**Geen** buttons (36 px, §3.2) and the
  fraction slots in the answer field (compact, so the keypad fits; the breuk key selects slots
  too). Feedback is announced via `aria-live`.
- Light theme only (`color-scheme: light`, Design V1). All colours come from one set of design
  tokens in `app.css`; components use no raw colour values. Colour is never the only signal:
  correct shows a ✓, wrong a ✕ and the words "Niet goed". Supports `prefers-reduced-motion`.
- Font: Inter, bundled with the app so it works offline, with `system-ui` as fallback. Numbers
  use tabular figures.
- The system keyboard is never used for answers; the app has its own keypad (§6). A physical
  keyboard (a tablet cover) types on that keypad: the mapping is in v4 spec §6.
- The screen stays on during a session (Screen Wake Lock API). The lock is requested again when
  the app becomes visible after being hidden, and released when the session ends. Where the API
  is missing or the request is refused, nothing is shown and the session works as usual.

## 3. Session flow

The app is a state machine in `App.svelte` with four states:
`sets → setup → playing → results`, plus two for the lesstof: `lessonTopics` and `lesson`
(lesstof spec §3), two for the practice test: `testSetup → testing → results`
(`2026-11-14-oefentoets-design.md` §4–§6), and `error` (below).

- "Terug" moves from `setup` and `testSetup` back to `sets`.
- "Opnieuw" moves from `results` back to `playing`, with the same set, count, level and table
  choice (Gemengd: set choice, §3.2); after a test, or Fouten oefenen after a test, it starts a
  new test with the same length and topics.
- "Menu" moves from `results` to `sets`.
- The system back action (Android back button or gesture, iOS swipe back) never closes the app
  from another screen. On `setup`, `testSetup` and `results` it moves to `sets`, like Terug and
  Menu. On `lessonTopics` and `lesson` it does what Terug does (lesstof spec §3). During
  `playing` and `testing` it is ignored; only Stop ends a session or a test. On `sets` it behaves as the system default.
  Implementation: one history entry is kept above the start screen while the app is not on
  `sets`; a `popstate` that consumes it is handled as back.
- An unexpected error never leaves a dead screen. When a session cannot be built (a generator
  throws) or a screen fails while rendering, the app shows the error screen (`error`): the heading
  "Er ging iets mis", the text "Dit scherm kon niet worden getoond. Ga terug naar het begin en
  probeer het opnieuw." and one button **Naar het begin**, which moves to `sets`. The system back
  does the same. The error is logged to the console; nothing is sent anywhere. The update dialog
  (§2) is not shown on it. Errors inside an event handler (such as an answer check) are not
  caught this way.

### 3.1 Set overview (start screen)

- The app always opens on this screen, with no set preselected and the tab **Oefenen** active.
- Under the title sits a segmented control with two tabs, **Oefenen** (the list below) and
  **Lesstof** (lesstof spec §3–§4). The active tab is kept in memory only.
- It shows the logo, the title "Rekenhulp" and "Wat wil je oefenen?", then a list of rows, one
  per available set (§4). Each row shows a tile with a multicolour glyph (violet, amber and
  blue; a new set needs a glyph in the same style), the set's name and a
  one-line description of its topics. The list scrolls when the screen is short.
- Tapping a card opens the setup screen for that set.
- Sets whose topics are not implemented yet (v2/v3) are not shown.
- **Oefentoets** (§12.6): the last row, after Gemengd; its row, glyph and setup are in the
  oefentoets spec §4. Like Gemengd it is not a set and has no row on the **Lesstof** tab.
- **Gemengd** (§12.5): the row after the sets, mixes exercises from several sets in one
  session. Its description is "Opgaven uit meerdere sets door elkaar", and its glyph is a 2 × 2
  grid of small rounded tiles in violet, amber, blue and violet. Tapping it opens its setup
  (§3.2). It is not a set of its own: it has no topics, and the **Lesstof** tab has no row for
  it.

### 3.2 Setup screen

- The header shows a back button (aria-label **Terug**), the set's glyph in a small tile and the
  set name.
- Order (v4 spec §9): the count, the level, then "Wat zit erin", so the settings are reachable
  without scrolling. Tafels and Gemengd start with their selection instead, and have no list.
- The section "Wat zit erin" is a list of the set's topics, display-only. Each row has
  the topic name on the left and its detail on the right, both taken from `TOPIC_LABELS`: a
  label is a `name` with an optional `detail`.
  For every set except Tafels, the list includes "15% tafels", except when the selected session
  size is below 10 (§4.2). It shows the topics of the selected level; Verdieping has no tables
  row but ends with one row "20% opfrisser" (no detail) for its Opfrisser share, except when the
  selected session size is below 10 (§4.2, §12.2).
- **Table choice (Tafels only):** instead of the topic list, Tafels shows the heading "Kies
  tafels" with two small buttons **Alle** and **Geen**, and a grid of 13 toggles, one per table
  (2–9, 11–15, §5.1), five per row. By default all tables are selected. Alle selects all,
  Geen clears all. With no table selected, **Start** is disabled. The choice applies only to
  the Tafels set; the 15% tables in the other sets always use all tables. The heading reads
  "Welke tafels?" (no count), and the toggles are pills with `aria-pressed`.
- **Set choice (Gemengd only, §12.5):** instead of the topic list, Gemengd shows the heading
  "Welke sets?" with the small buttons **Alle** and **Geen**, and one pill per set (`aria-pressed`)
  with the set's name, in the order of the overview (Tafels first). The pills wrap to as many
  per row as fit, because the names differ in length. By default all sets are selected. At level
  Verdieping the Tafels pill is greyed out and `disabled` (Tafels has no Verdieping): it keeps
  its pressed state, which counts again at Opfrisser, but it does not count at Verdieping; Alle
  and Geen still set it. **Start** is disabled when no counting set is selected: none at all, or
  only Tafels at Verdieping. The Tafels pill practises all tables; the table choice applies to
  the Tafels set only. Gemengd has no "Wat zit erin" list and no "20% opfrisser" row.
- **Count:** 5, 10, 15, 25 or 50 exercises, shown as one segmented control (a radio group of 5
  equal segments). The default is 15, at both levels: the user picks a smaller count for
  Verdieping when they want.
- **Level (not for Tafels):** below the count, the heading **Niveau** and a segmented control
  in the same style (a radio group of 2 equal segments, **Opfrisser** and **Verdieping**).
  Every time a set's setup opens from the overview, the level is Opfrisser: unlike the count,
  the choice is not carried over to another set. While a set has no Verdieping (§12.2), its
  segment is greyed out and `disabled`, with no hint text; the arrow keys skip it. The level is
  shown only here, not on the play screen (§3.3) or the results (§3.5). Gemengd has both levels
  and resets to Opfrisser like a set.
- A **Start** button, pinned to the bottom, labelled "Start · n opgaven" with the live count
  (the number in a lighter yellow). There is no caption above it. When the options do not fit on
  the screen they scroll above the button; a fade from transparent to the background colour above
  the button hints that more content (e.g. the topic list) is hidden below.
- The chosen count, table choice and set choice are kept in memory only while the app stays
  open; nothing is persisted. **Opnieuw** reuses them and the level.

Note: the 3-minute target of Opfrisser corresponds to roughly 15 exercises (~12 s each).
Larger counts are deliberate longer sessions.

### 3.3 Playing

- The header shows the set name (for Gemengd "Gemengd"), progress (`7 / 15`, or **Herhaling**
  while a repeated exercise is shown, §3.4), the elapsed time (`mm:ss`, counting up, no time limit) and a **Stop**
  button, a ✕ at the top left (aria-label "Stoppen"). Under the set name and the counter sits a
  progress bar over the first attempts. A repeat shows a yellow "Herhaling" label instead of
  the number; the counter text keeps the original total.
- Stop ends the session immediately and goes to results. Results then cover only the answered
  exercises; the current, unanswered exercise is not counted. A two-step exercise counts as
  answered only after its last step, so Stop after step 1 drops it. Repeats still waiting in the
  queue are dropped as well.
- The time spent on each exercise is recorded, measured from when it is shown until the final
  submission.
- Most exercises show a kladblok (scratchpad) above the prompt (§3.6).
- A prompt with a slot (§8) is a sum. Its font size depends on its length as displayed (a
  stacked fraction counts as its widest line): up to 18 characters large (38 px), up to 40
  medium (28 px), longer small (22 px). Short sums stay large; long sums no longer push the
  keypad down. The thresholds were checked on a phone (2026-10-22).
- A prompt without a slot (word problems, "Vereenvoudig in één stap: …", "Ontbind … in
  priemfactoren") is question text: always 22/30 px bold, centred, wrapping, never truncated.
  A Ja/Nee question is 34/42 px. A multiple-choice prompt (§6) follows the same two rules: a
  sum with a slot, or question text.
- When a long question meets a short screen, the prompt area shrinks (minimum 96 px) and
  scrolls; the keypad and the feedback panel stay whole.

### 3.4 Feedback per exercise

- **Correct:** the answer field turns green with a ✓ and shows the entered answer with its unit
  (`402 cm²`; screen readers hear "Goed: jouw antwoord is 402 cm²"); the keypad is dimmed and
  disabled. When the prompt has a slot (§8), the entered answer, as shown in the field, replaces
  it in the correct colour. A bar under the field runs for 600 ms, then the app goes on to the
  next exercise automatically. With reduced motion, the bar is static. A choice step (Ja/Nee,
  multiple choice) has no answer field: the chosen button turns green and the others are
  dimmed, with the bar under the buttons. A slot in the prompt shows the chosen option.
- **Wrong:** the keypad is replaced by a panel with ✕ and "Niet goed", two tiles "Jouw antwoord"
  and "Goed antwoord" (both with the unit; the given answer is not struck through), an optional
  tip (§3.4.1) and an optional explanation (e.g. `91 = 7 × 13`), each in its own block with the
  label "Tip" or "Uitleg" (only the explanation scrolls, after 220 px), and a **Verder** button.
  When the prompt has a slot, it is shown as `?` in the wrong colour. When the exercise's topic
  has lesson topics, one or more **Les:** buttons open them in a sheet over the session (lesstof
  spec §3.1).
- A prompt without a slot never changes colour: correct and wrong show only in the answer field
  and the panel. For a prompt with a slot the colour is an extra, never the only signal.
- Each time an exercise is shown, it allows exactly one attempt (one per step for property
  exercises, §5.11).
- The feedback shows a sum with the size steps of §3.3; the steps are 44, 32 and 24 px
  (question: 38, 28 and 22 px, §3.3). Question text stays 22/30 px. To be checked on a phone.
- **Repeat until correct:** an exercise answered wrong (any step wrong) comes back later in the
  same session, unchanged, with all its steps and an empty kladblok. It is inserted at a random
  place among the remaining exercises, but never directly next unless nothing else remains. A
  repeat answered wrong comes back again, until it is answered correctly. The progress count
  keeps the original total; a repeat shows **Herhaling** instead of a number.

#### 3.4.1 Tips (mistake diagnosis)

A wrong answer can get a **tip**: one Dutch sentence that names the likely mistake, e.g.
"Dat is de korting zelf; trek die nog af van de prijs." It is shown as "Tip: …" between the
answers and the explanation, in the feedback and on the results screen. Rules:

- Only for a wrong answer that parses; at most one tip. Scoring and repeats are unchanged.
- `CheckResult.tip` carries it. Order: first the form tips of simplest-fraction and scientific
  steps (the right value written in the wrong form), then the topic's own diagnosis, then the
  approximation tip of simplest-fraction steps; for number, fraction and scientific steps the
  last fallback is the **factor-of-ten tip**: when the answer is exactly 10ᵏ
  times the correct one (k ≠ 0): "Je antwoord is 100 keer te groot. Let op de komma en het
  aantal nullen." Questions whose answer is an exponent (`1 biljard = 10ⁿ`) skip this fallback.
- A tip may only claim what is certain from the input: it names a mistake only when the answer
  equals exactly what that mistake produces. The one exception is money (§5.23, §5.25): when the
  mistaken value has more than 2 decimals, the answer must equal it rounded half up to cents,
  because a price is typed with 2 decimals.

| Topic | Answer equals | Tip |
|---|---|---|
| Meten, grote getallen name → name (`3,5 L = ? cm³`, `250 miljoen = ? miljard`) | value with × and : swapped | "Naar een kleinere eenheid wordt het getal groter: vermenigvuldig met 1000." (or: grotere eenheid, deel) |
| `area` | conversion with the length factor (10ᵏ instead of 10²ᵏ) | "Bij oppervlakte is elke stap ×100 (10 × 10), niet ×10." |
| `volume`, both units cubic | conversion with the length factor | "Bij kubieke eenheden is elke stap ×1000 (10 × 10 × 10), niet ×10." |
| `time` (min↔s, uur↔min, uur↔s) | conversion with 100 per 60 | "1 uur = 60 min, niet 100 min." |
| `time`, larger → smaller, factor 60 | decimals read as minutes: 2,5 uur → 170 or 125 | "0,5 uur is 30 min, niet 50 min." |
| `time`, smaller → larger, factor 60 | remainder written as decimals: 150 min → 2,3 | "30 min is 0,5 uur, niet 0,3 uur." |
| `speed`, speed, time in min | the distance divided by the minutes (`6 : 20 = 0,3`) | "km/u is per uur: reken eerst uit hoeveel km je in 60 min aflegt." |
| `speed`, distance, time in min | speed × minutes (`80 × 45 = 3600`) | "45 min is 3/4 uur, niet 45 uur." (the minutes as a fraction of an hour in simplest form) |
| `speed`, time asked in min | the time in hours (`0,4`) | "Dat is in uren; gevraagd zijn minuten: 0,4 × 60 = 24." |
| `speed`, time asked in uur | the time in minutes (`150`) | "Dat is in minuten; gevraagd zijn uren: 150 : 60 = 2,5." |
| `speed`, time | the `time` mistakes above (100 per 60, decimals as minutes, remainder as decimals) | as for `time` |
| `speed`, conversion to m/s | km/u × 3,6 instead of : 3,6 (`72 × 3,6`) | "Naar m/s wordt het getal kleiner: deel door 3,6." (the reverse mistake, m/s : 3,6, is never a finite decimal for the m/s values of §5.26) |
| `numberUnits`, name → power | English short scale (biljoen → 10⁹) | "Een biljoen is 10¹²; 10⁹ is een miljard (Engels: billion)." |
| `numberUnits`, name → power | shift of the coefficient forgotten | "250 = 2,5 × 10²: tel 2 op bij 6." |
| `percentages`, part of whole | the rest (100% − p%) | "Dat is wat er overblijft; gevraagd is 25% zelf." |
| `percentages`, what percentage | the ratio part : whole (0,25 or 1/4) | "Dat is deel : geheel, nog geen percentage; × 100 geeft het percentage." |
| `percentages`, what percentage | whole : part (or × 100) | "Je hebt het geheel door het deel gedeeld; reken deel : geheel." |
| `percentages`, price change | the change itself | "Dat is de korting zelf; trek die nog af van de prijs." (verhoging: tel op) |
| `percentages`, price change | change in the wrong direction | "Bij korting wordt de prijs lager: trek de korting af." (verhoging: hoger, tel op) |
| `percentages`, back to 100% | p% of the given part | "Je hebt 20% van 14 berekend, maar 14 is zelf al 20%. Reken terug naar 100%." |
| `percentChange`, percentage change | the change itself (`12`) | "Dat is de stijging zelf; reken uit hoeveel procent van 80 dat is." (daling) |
| `percentChange`, percentage change | the new value as a percentage of the old (`115`, `85`) | "Dat is 92 als percentage van 80; de stijging is 115% − 100% = 15%." (daling: 100% − 85%) |
| `percentChange`, percentage change | the change as a percentage of the new value | "Reken met de oude waarde: de stijging is een percentage van 80, niet van 92." |
| `percentChange`, VAT added | the VAT itself | "Dat is de btw zelf; tel die nog op bij de prijs." |
| `percentChange`, VAT removed | the price minus 21% of it, rounded to cents | "De btw is 21% van de prijs zonder btw. € 96,80 is 121%: reken terug naar 1%." |
| `percentChange`, VAT removed | the VAT itself | "Dat is de btw; gevraagd is de prijs zonder btw." |
| `percentChange`, original value | the new price plus (minus) p% of the new price, rounded to cents | "De korting is 25% van de oude prijs, niet van € 60. € 60 is 75% van de oude prijs." (verhoging: 115%) |
| `percentChange`, original value | the new price changed once more the same way (`60 − 15`) | "Na korting is de prijs lager, dus de oude prijs is hoger dan € 60." (verhoging: lager) |
| `scale`, map ↔ real | 10ᵏ × the answer, k ≠ 0 | "Reken in dezelfde eenheid: 1 cm op de kaart is 25 000 cm = 250 m = 0,25 km in het echt." (the chain of the explanation; op de tekening; replaces the factor-of-ten tip) |
| `scale`, find the scale | 10ᵏ × the answer, k ≠ 0 | "Reken eerst beide afstanden om naar cm: 2 km = 200 000 cm." (replaces the factor-of-ten tip) |
| `ratioProblems`, part of the whole | the ratio of the two groups (`2/3`, or `66 2/3` for a percentage) | "2 : 3 is jongens tegenover meisjes. Het geheel is 2 + 3 = 5 delen, dus 2/5." (percentage: "… dus 2/5 = 40%.") |
| `ratioProblems`, part of the whole | the part of the other group | "Dat is het deel meisjes; gevraagd is het deel jongens." |
| `ratioProblems`, mixing from the total | the total divided by one term | "Deel eerst door het totaal aantal delen: 1 + 6 = 7." |
| `ratioProblems`, mixing from the total | the other ingredient | "Dat is de hoeveelheid water; gevraagd is de siroop." |
| `ratioProblems`, mixing from one part | the total | "Dat is de hele hoeveelheid limonade; gevraagd is alleen het water." |
| `ratioProblems`, per unit | inverse scaling (amount × q₁ : q₂, in the same unit) | "Je hebt omgekeerd gerekend: 400 g is minder dan 1,5 kg, dus het kost minder dan € 12." |
| `ratios`, missing term | the additive answer (equal difference) | "Bij een verhouding vermenigvuldig of deel je beide getallen met hetzelfde getal; het verschil blijft niet gelijk." |
| `ratios`, scaling | inverse scaling (amount × a : b) | "Je hebt omgekeerd geschaald: 6 is meer dan 4, dus het antwoord is meer dan 300." |
| `ratios`, scaling | amount + (b − a) | "Je hebt het verschil in aantal opgeteld; bij een verhouding vermenigvuldig je." |
| `ratios`, divide | the other part | "Dat is het kleinste deel; gevraagd is het grootste." |
| `ratios`, divide | one part (asked > 1) | "Dat is 1 deel; het grootste deel is 3 delen." |
| `ratios`, divide | total divided by one term | "Deel eerst door het totaal aantal delen: 2 + 3 = 5." |
| `lcm` | the GCD | "Dat is de GGD. De KGV is het kleinste getal dat door allebei deelbaar is." |
| `lcm` | a larger common multiple | "72 is een gemeenschappelijk veelvoud, maar niet het kleinste." |
| `lcm` | not a multiple of a or b | "50 is geen veelvoud van 12." |
| `gcd` | the LCM | "Dat is de KGV. De GGD is het grootste getal waar allebei door deelbaar zijn." |
| `gcd` | a smaller common divisor | "6 is een gemeenschappelijke deler, maar niet de grootste." |
| `gcd` | not a divisor of a or b | "84 is niet deelbaar door 8." |
| `factorization` | a factor 1 | "1 is geen priemgetal: laat het weg." |
| `factorization` | a composite factor | "9 is geen priemgetal: ontbind het verder." |
| `factorization` | primes with another product | "Het product van je factoren is 90, niet 84." Above one million: "… is groter dan 84." |
| `squares`, n² | n × 2 | "17² is 17 × 17, niet 17 × 2." |
| `squares`, √ | half the square | "√196 is het getal dat keer zichzelf 196 geeft, niet de helft." |
| `squares`, √ | another positive integer, not 10ᵏ × the root (that gets the factor-of-ten tip) | "15 × 15 = 225, niet 196." (only for answers up to 10 000) |
| `orderOfOperations` | a power as base × exponent | "Een macht is herhaald vermenigvuldigen: 3² = 3 × 3, niet 3 × 2." |
| `orderOfOperations` | strictly left to right | "Je hebt van links naar rechts gerekend. Eerst machten, dan × en :, daarna pas + en −." |
| `orderOfOperations` | × before : | "× en : zijn even sterk: reken die van links naar rechts." |
| `smartCalculation`, compensation | compensation the wrong way | "398 = 400 − 2, dus compenseer met − 2, niet met + 2." |
| `smartCalculation`, complement | another positive integer, not 10ᵏ × the answer | "463 + 547 = 1010, niet 1000." |
| `tables`, product | a neighbouring row | "63 = 7 × 9: je zit één rij ernaast." |
| `tables`, division or missing factor | another positive integer, not 10ᵏ × the answer | "9 × 7 = 63, niet 56." |
| `mentalOperations`, remainder (up) | the quotient without the remainder | "Er blijven 6 leerlingen over; daarvoor is nog een busje nodig." (tafels: gasten, tafel) |
| `mentalOperations`, remainder (down) | the quotient plus 1 | "De laatste doos is niet vol: rond naar beneden af." (kaartjes: "Voor nog een kaartje is het geld niet genoeg: rond naar beneden af.") |
| `mentalOperations`, remainder (up or down) | the exact quotient, not whole (`28,75`) | "Je kunt geen 28,75 busjes nemen: het antwoord is een heel aantal." (tafels nemen, dozen vullen, kaartjes kopen) |
| `mentalOperations`, remainder (rest) | the quotient | "Dat is het aantal dozen; gevraagd is wat je overhoudt." (kaartjes: kaartjes) |
| `negativeNumbers`, `a − (−b)` | `a − b` | "Min een negatief getal is plus: −4 − (−6) = −4 + 6." |
| `negativeNumbers`, × or : | the answer with the other sign | "Twee negatieve getallen geven een positieve uitkomst, één negatief getal een negatieve." |
| `negativeNumbers`, + or −, temperature change | the answer with the other sign | "Let op het teken van de uitkomst." |
| `negativeNumbers`, temperature difference | the difference of the absolute values, one below zero (`7 − 4`) | "Van −7 naar 0 is 7 graden, van 0 naar 4 nog 4: samen 11." |
| `negativeNumbers`, temperature difference | the sum of the absolute values, both below zero (`12 + 3`) | "Allebei onder nul: het verschil is 12 − 3 = 9." |
| `rounding` | rounded down instead of up | "Het eerste cijfer dat wegvalt is 8 (5 of meer): rond naar boven af." |
| `rounding` | rounded up instead of down | "Het eerste cijfer dat wegvalt is 3 (minder dan 5): rond naar beneden af." |
| `rounding`, tens, hundreds or thousands; whole, 1 or 2 decimals | rounded to the neighbouring place in the same group | "Dat is afgerond op tientallen; gevraagd is honderdtallen." |
| `powersRoots`, whole-number power | base × exponent | "Een macht is herhaald vermenigvuldigen: 2⁵ = 2 × 2 × 2 × 2 × 2, niet 2 × 5." |
| `powersRoots`, exponent 0 | 0 | "Elk getal (behalve 0) tot de macht 0 is 1." |
| `powersRoots`, negative base | the answer with the other sign | "(−3)³ = (−3) × (−3) × (−3): een oneven aantal mintekens geeft min." (even: plus) |
| `powersRoots`, decimal power | 10ᵏ × the answer, k > 0 (too few decimals) | "0,3 × 0,3 = 0,09: de uitkomst heeft evenveel decimalen als beide getallen samen." (exponent 3: "alle getallen") |
| `powersRoots`, `10⁻ⁿ = ?` | −10ⁿ | "Een negatieve exponent maakt geen negatief getal: 10⁻³ = 1 : 1000." |
| `powersRoots`, `0,001 = 10ⁿ` | n (positive) | "Een getal kleiner dan 1 heeft een negatieve exponent." |
| `powersRoots`, `0,001 = 10ⁿ` | the number of zeros after the comma (−2) | "Tel de plaatsen waarover de komma schuift: 0,001 = 1 : 1000 = 10⁻³." |
| `powersRoots`, cube root | n³ : 3 | "∛27 is het getal dat 3 keer met zichzelf vermenigvuldigd 27 geeft, niet 27 : 3." |
| `scientificNotation`, scientific step | the same value, `c` not in `[1, 10)` | "De waarde klopt, maar het getal vóór × 10 moet minstens 1 en kleiner dan 10 zijn." |
| `scientificNotation`, scientific step | the same value as a plain number | "Schrijf het als een getal van 1 tot 10 keer een macht van 10." |
| `scientificNotation`, scientific step | the right `c`, the exponent with the other sign | "Een getal kleiner dan 1 heeft een negatieve exponent." (larger than 10: positive) |
| `scientificNotation`, to notation | the right `c`, the exponent counts the zeros | "Tel de plaatsen waarover de komma schuift, niet de nullen." |
| `scientificNotation`, normalise | the right `c`, the exponent shifted the wrong way (`k − s`) | "Het getal vóór × 10 wordt 100 keer kleiner, dus de exponent wordt 2 groter." (the other way: "… keer groter, dus de exponent wordt … kleiner") |
| fraction step in simplest form (§6) | the same value, not in simplest form | "De waarde klopt, maar vereenvoudig nog: 9/12 = 3/4." |
| fraction step in simplest form, no decimal allowed | the same value as a decimal | "Schrijf het antwoord als breuk, niet als kommagetal." |
| fraction step in simplest form | a decimal that is the non-terminating answer rounded or cut off (`0,67`, `0,66` for 2/3) | "2/3 is geen eindig kommagetal: schrijf het antwoord als breuk." |
| `fractionConversion`, fraction → decimal | numerator and denominator side by side (`3/8` → `3,8`) | "3/8 betekent 3 : 8, niet 3,8." |
| `fractionConversion`, → percentage | the decimal value itself (`0,375`) | "Procent betekent honderdste: vermenigvuldig met 100." |
| `fractionConversion`, percentage → decimal | the percentage itself (`37,5`) | "Procent betekent honderdste: deel door 100." |
| `fractionArithmetic`, equivalent | the additive answer (equal difference, `3/4 = 11/12`) | "Vermenigvuldig of deel teller en noemer met hetzelfde getal; het verschil blijft niet gelijk." |
| `fractionArithmetic`, add / subtract, no mixed numbers | numerators and denominators added (subtracted) separately (`3/7`) | "Maak eerst de noemers gelijk; tel daarna alleen de tellers op." (aftrekken: "trek … af") |
| `fractionArithmetic`, subtract mixed numbers | the fraction parts subtracted the wrong way round (`3 1/2 − 1 3/4` → `2 1/4`) | "Je kunt 3/4 niet van 1/2 aftrekken: wissel eerst 1 geheel om, 3 1/2 = 2 6/4." |
| `fractionArithmetic`, whole × fraction | the fraction itself (numerator and denominator both × n) | "Alleen de teller gaat keer 6: 6 × 2/3 = 12/3." |
| `fractionArithmetic`, divide | the product instead of the quotient | "Delen door 4/9 is keer het omgekeerde: × 9/4." (by a whole number: "Delen door 3 is keer 1/3.") |
| `fractionArithmetic`, fraction : fraction | the inverse of the answer | "Draai de breuk om waardoor je deelt, niet de eerste." |
| `fractionArithmetic`, part of a number | one part (`24 : 4`, numerator > 1) | "Dat is 1/4 van 24; 3/4 is 3 keer zoveel." |
| `fractionArithmetic`, part of a number | the number divided by the fraction (`24 × 4 : 3`) | "Je hebt gedeeld; 3/4 van 24 is 24 : 4 × 3." |
| `fractionArithmetic`, back to the whole | the fraction of the given part (`3/4 × 18`) | "Je hebt 3/4 van 18 berekend, maar 18 is zelf al 3/4. Reken terug naar het geheel." |
| `fractionArithmetic`, back to the whole | one part (`18 : 3`, numerator > 1) | "Dat is 1/4; het geheel is 4/4." |
| `decimalArithmetic`, add / subtract | the numbers added (subtracted) as if aligned on the right (`4,7 + 0,35` → `0,82`) | "Zet de komma's onder elkaar: 4,70 + 0,35." |
| `decimalArithmetic`, multiply | 10ᵏ × the answer, k > 0 (too few decimals) | "De uitkomst heeft evenveel decimalen als beide getallen samen: 1 + 1 = 2." |
| `decimalArithmetic`, divide by a decimal | 10ᵏ × the answer, k ≠ 0 | "Maak eerst van de deler een heel getal: 2,5 : 0,05 = 250 : 5." |
| `perimeterArea`, `solids` | the other quantity of the same figure: the perimeter for the area, the volume for the surface area, and the other way round | "Dat is de omtrek; gevraagd is de oppervlakte." (oppervlakte, inhoud) |
| `perimeterArea`, triangle area | base × height, not halved | "Een driehoek is de helft van een rechthoek: deel nog door 2." |
| `perimeterArea`, parallelogram area | base × slanted side | "Reken met de hoogte, niet met de schuine zijde: 8 × 4." |
| `perimeterArea`, `solids`, circle area or cylinder volume, diameter given | the formula with the diameter as the radius | "De straal is de helft van de diameter: 10 : 2 = 5." |
| `perimeterArea`, circle perimeter, radius given | `3,14 × r` | "De omtrek is π × diameter, en de diameter is 2 × 5 = 10." |
| `pythagoras` | the sum of the legs (hypotenuse asked) or the difference (leg asked) | "Tel de kwadraten op: 6² + 8² = 100, en neem daarvan de wortel." (leg: "Trek de kwadraten af: 13² − 5² = 144, …") |
| `angles`, angle sum | `n × 180` | "Een zeshoek kun je verdelen in 6 − 2 = 4 driehoeken: 4 × 180°." |
| `angles`, regular polygon | the exterior angle `360 : n` | "Dat is de buitenhoek; één hoek binnenin is 180° − 45° = 135°." |
| `angles`, clock at half past | the angle with the hour hand on either whole hour | "Om half 4 staat de kleine wijzer halverwege de 3 en de 4." |
| `statistics`, mean | the sum of the list | "Deel de som nog door het aantal getallen: 35 : 5." |
| `statistics`, median | the middle of the list as shown (the mean of the two middle values for an even length) | "Zet de getallen eerst op volgorde; de mediaan is het middelste getal." |
| `percentagePoints`, difference in procentpunten | the change in procent (`25`) | "Procentpunten is het verschil tussen de percentages: 5 − 4 = 1." |
| `percentagePoints`, difference in procent | the change in procentpunten (`1`) | "Dat is het verschil in procentpunten; 1 van 4 is 1/4 = 25%." |
| `percentagePoints`, new value, change in procent | the change added as procentpunten (`4 + 25`; decrease: `−`) | "25% van 4% is 1 procentpunt: 4% + 1% = 5%." |
| `sequences`, n-th term | start + n × difference (`3 + 20 × 4`) | "Van het 1e naar het 20e getal zijn 19 stappen, geen 20." |
| `formulas`, hellingsgetal, x-step 2 | the y-difference (`6`) | "y wordt 6 groter als x 2 groter wordt; per 1 is dat 6 : 2 = 3." |
| `formulas`, startgetal | the first y of the table | "Het startgetal is y bij x = 0, niet bij x = 2." |
| `equations` | the solution with the sign of the moved term flipped (`(20 + 5) : 3`, whole) | "Haal 5 aan beide kanten weg: 3x = 20 − 5." (for `− 5`: "Tel 5 aan beide kanten op: 3x = 20 + 5."; brackets: "… x = 3 + 2.") |
| `probability`, marbles | the colour divided by the other marbles (`5/5`) | "Deel door het totaal aantal knikkers: 3 + 5 + 2 = 10." |
| `romanNumerals`, from decimal | the value written without subtractive pairs (`MDCCCCLXXXXIIII`) | "De waarde klopt, maar gebruik de aftrekregel: 900 = CM, 90 = XC en 4 = IV." (every subtractive pair of the answer) |
| `romanNumerals`, to decimal | the sum of all symbols (`XIV` → 16) | "Een kleiner teken vóór een groter teken trek je af: IV = 4, niet 6." (the first subtractive pair of the numeral) |
| `systematicCounting`, combinations | the counts added (`3 + 4`) | "Bij elke broek passen 4 truien: vermenigvuldig, 3 × 4." (menu: "Elk voorgerecht past bij elk hoofdgerecht en elk nagerecht: vermenigvuldig, 3 × 4 × 2.") |
| `systematicCounting`, handshakes | `n × (n − 1)`, not halved | "Zo tel je elke handdruk twee keer: deel nog door 2." (competitie: wedstrijd) |
| `guessAndCheck`, two kinds | the count of the other kind | "Dat is het aantal kippen; gevraagd is het aantal konijnen." (fietsen, driewielers) |
| `guessAndCheck`, sum and difference | the other number | "Dat is het kleinste getal; gevraagd is het grootste." (or the other way round) |
| `simplifyProblem`, Gauss sum | `n × (n + 1)`, not halved | "40 getallen maken 20 paren, geen 40: 20 × 41." |
| `simplifyProblem`, tot en met | `b − a` | "Tel 37 en 82 allebei mee: 82 − 37 + 1 = 46." |
| `simplifyProblem`, paaltjes | the number of pieces `k` | "Er staat ook een paaltje aan het begin: 8 stukken hebben 9 paaltjes." |
| `simplifyProblem`, figure value | `first + n × step` (`4 + 20 × 3`) | "Van figuur 1 naar figuur 20 zijn 19 stappen, geen 20." (tafels: "Van 1 naar 15 tafels zijn 14 stappen, geen 15.") |

Ja/Nee steps (prime, divisibility, symmetry, shapeProperties), multiple-choice steps (§6) and
property rewrites get no tips: their explanation (§5.4, §5.6) or rewrite message (§5.11)
already names the mistake.

### 3.5 Results

After a practice test the screen adds a verdict and scores over every exercise of the test; the
differences are in the oefentoets spec §6. The rules below are those of a session.

- The screen is one screen high: the content scrolls and the buttons are pinned below it.
- Each error card shows the prompt (a slot as a plain `?`, not coloured) and two tiles: "Jouw
  antwoord" (red, ✕) and "Goed antwoord" (green, ✓), both with the unit, then the tip and
  explanation. The given answer is not struck through.
- Score `x / n` and percentage, over first attempts only: repeats (§3.4) do not count. `n` is
  the number of answered exercises (after Stop, fewer than the count). With none answered the
  screen shows "Geen opgaven beantwoord."
- Total time (wall clock, repeats included), and average time per exercise (first attempts)
- A card "Per onderwerp" between the score card and "Fouten" (§12.4): one text row per topic
  with its short name and `x / n`, over the same first attempts as the score. The short name is
  the `name` of the topic label (§3.2), so "Procenten", "Schaal", "KGV". Topics with the
  same short name in one session (e.g. `probability` and `twoDice`, both "Kans", in a Verdieping
  session with its Opfrisser share) share one row. Sorted weakest first: lowest percentage, then
  the larger `n`, then the order of first appearance in the session. The card is shown only with
  at least two rows; with one row it would repeat the score. It lists only topics with an
  answered exercise. The card is collapsible and starts collapsed (a native `<details>`; open on a
  tablet in landscape, where it has its own column, v4 spec §8): its
  header, 56 px high with the heading "Per onderwerp" and a chevron that points down, toggles the
  rows inside the same card; open, the chevron points up (v4 spec §9).
- A list "Fouten" with one entry per wrong step, each showing the prompt, the user's answer, the
  correct answer and the tip and explanation; a correct step of a two-step exercise is left
  out. These are the first-attempt mistakes, also when a repeat was correct. Without mistakes:
  "Alles goed!"
- Buttons **Menu** (neutral grey) and **Opnieuw** (primary, right; new session with the same
  set, count, level and table choice, or for Gemengd the same set choice). Opnieuw is always the
  primary button.
- With at least one first-attempt mistake, a full-width button **Fouten oefenen · n** above
  them (§12.4), tonal (violet tint, violet text): between Opnieuw and Menu in weight. It starts a session with three new exercises
  per wrong question, of that question's topic, so `n` is three times the number of wrong
  questions (a two-step question counts once), without a maximum. "New" means freshly
  generated and de-duplicated as in §4.2, with the wrong questions themselves counted as
  used, so none of them comes back as is. The topics come from the mistakes, so the level stays
  the same (incl. Opfrisser-share topics of a Verdieping session); Tafels keeps the table choice.
  The session runs as any other (repeats, tips, kladblok). Its results screen works the same:
  Fouten oefenen uses the mistakes of that session, Opnieuw starts a normal session of the set.

### 3.6 Kladblok (scratchpad)

A small scratchpad for remembering intermediate results while playing. It holds short sums and
numbers, separated by spaces (`12×7=84 3,5`), and uses the expression keypad (§6) with `^`
and the breuk key in the place of the parentheses, extended with `,`, `=` and a **spatie** key
in the place of OK.

- **Layout:** 6 cells in a grid of 2 columns and 3 rows, each 48 px high, between the header
  and the prompt. The size is fixed: cells never grow, wrap to more lines or scroll.
- **Short screens:** rows are dropped from the bottom so the keypad does not end up below the
  screen edge: 3 rows from 816 px viewport height, 2 rows (4 cells) from 760 px, and only the
  top row (2 cells) below that. This is the phone layout; a tablet has a fixed count per layout
  (v4 spec §5.2), and `visibleCells` in `lib/scratchpad.ts` is the one source for both.
  A hidden cell is not rendered and keeps its note. When the viewport height changes while a cell is active (for
  example in split screen) and that cell gets hidden, the answer field becomes active again, so
  keys never go to a hidden cell; a cell that stays visible stays active. The thresholds
  come from a height estimate (56 px per row) and were checked on a phone (2026-10-22).
- **When shown:** for every step that is not Ja/Nee or multiple choice, unless the question is a table exercise
  (topic `tables`, including the tables mixed into other sets). Tables are practised from
  memory.
- **Reserved space (v4 spec §5.1):** in a session where at least one step shows the kladblok,
  every step keeps its area at the same height, so the prompt does not jump between exercises.
  On a step without a kladblok the area is empty, invisible, `inert` and hidden from assistive
  technology. A session that never shows it (Tafels) reserves nothing.
- **Focus:** tapping a cell makes it active; tapping the answer field, or a fraction slot in
  it, makes the answer field active again. Tapping is the only way to switch. The active
  cell has a sky-blue border and fill, and its label row turns primary. While a cell is
  active, the answer field is replaced by a full-width outlined button "Tik hier voor je
  antwoord" that makes the answer field active again. Every new step starts with the answer
  field active.
- **While a cell is active**, the keypad is the kladblok keypad, whatever the answer kind: the
  expression keys with `^` and the breuk key instead of `(` and `)`, plus `,`, `=` and the
  spatie, in 4 columns and 5 rows (the same height as every other keypad, §6). The tray
  keys are 48 px high with 6 px gaps; a 19 px margin above the tray makes the total as tall as
  the other keypads, so the prompt does not move when switching. The spatie takes one column
  like every key, but its icon is a long open box (`␣`, drawn). It has the normal key colour,
  acts on press like the other keys and is always enabled. The kladblok has no parentheses.

  ```
  7  8  9  +
  4  5  6  −
  1  2  3  ×
  ,  0  ^  :
  ⌫  ␣  /  =
  ```

  `/` is the breuk key, drawn as a small stacked fraction (two outlined boxes) as on the fraction
  keypad. `^` is drawn as x with a raised n, on every keypad that has it. In a kladblok cell the
  caret is replaced inside a fraction by a small caret (1.5 px, 0.85 em; sky in the kladblok,
  primary in the answer field) behind the digits of the slot being filled in, alone in an empty
  slot, so there are no placeholder dots and an empty slot is as narrow as a filled one. The big
  caret returns when the breuk key is
  pressed once more in a denominator with digits (that leaves the fraction: stored as an
  invisible end marker after `_3/4`; backspace removes it first), or when a space or operator
  follows. After a finished fraction only an operator, `=`, `-` or a spatie are accepted. The
  spatie icon is a long open box, only a little longer than the glyph it replaces. The label row turns sky blue (not primary) while a
  cell is active, like the cell.
  The answer field is 56 px high, as high as the "Tik hier voor je antwoord" button, also while
  a fraction template is open (the template is drawn smaller in the field), so nothing moves.

- **Typing in a cell.** A cell is a list of items separated by single spaces; an item is a
  number or a short sum such as `12×7=84`, `2^3=8`, `−¾+1` or `7/4=1¾`. A number is digits with
  at most one comma (at most 12 characters, as in the answer field); the sign is not counted.
  The breuk key opens an empty fraction with the cursor in the numerator, and a second press,
  after a numerator digit, moves the cursor to the denominator. Unlike the answer field (§6),
  where breuk in the denominator moves back to the numerator, breuk in the denominator does
  nothing here; only `⌫` goes back (one breuk press at a time). Digits typed
  before the breuk key are the whole part of a mixed number, so `1`, breuk, `2`, breuk, `3`
  is `1⅔` and breuk, `3`, breuk, `4` is `¾`. A number directly after `^` is an exponent;
  numerators and denominators are the fraction's slots. Per key, for the last item:
  - a digit: always, up to the 12 characters
  - `,`: only when the current number has no comma yet and is not an exponent or a slot;
    also at the start of a number (`,5`)
  - `^`: only after a digit of a number that is not an exponent or a slot (`2^3`, `0,5^2`;
    never `2^3^4` or `¾^2`)
  - breuk, outside a fraction: opens one, at the start of an item, after `−`, `=` or an
    operator, or after a digit of a number without a comma that is not an exponent or a slot
    (`¾`, `−¾`, `1+¾`, `1⅔`; never `0,5` followed by a fraction, and never right after a
    complete fraction)
  - breuk, in the numerator: moves to the denominator, only after a numerator digit; in the
    denominator it is ignored (no way back but `⌫`, never `¾/5`)
  - `+`, `×`, `:`: only after a digit, and not in the numerator
  - `−`: after a digit outside the numerator it is the operator; at the start of an item, after
    `=` or after an operator it is the minus sign of the next number (`−5`, `3−8=−5`,
    `19×−12`, `5−−3`); elsewhere ignored, so never two minus signs in a row and no sign after
    `^` or in a slot
  - `=`: only after a digit, not in the numerator, as often as needed (`3+4=7=7,0`)
  - spatie: only after a digit, not in the numerator: never a leading space, never two in a
    row
  - `⌫` deletes the last thing typed, a space included: a digit, the step from numerator to
    denominator (back to the numerator), or an empty fraction (gone)
  - a cell holds at most 40 characters, the breuk key presses included; extra keys are ignored
- A cell is never validated. It is shown as typed, compact: no spaces around operators, so a
  space always separates items. `-` is shown as `−` (`12×7=84`, `−5 0,25`, `3−8=−5`), an
  exponent in superscript (`2^3` as `2³`; a `^` without exponent stays visible) and a
  fraction as a stacked fraction in a smaller font (0.8 em, as everywhere), which fits a 48 px
  cell. A mixed number sits directly against its whole part (`1⅔`). An unfinished fraction
  shows a `…` in the slot where the next digit goes, if that slot is still empty; the other
  empty slot stays blank (an empty fraction is `…` over blank, a numerator `3` is `3` over
  blank, and after the second breuk it is `3` over `…`). A fraction after a space is its own
  item: `12 ¾` is the items `12` and `¾`. A trailing space stays visible. There is no button to
  clear the scratchpad.
- **Lifetime:** the notes belong to one question. They stay across the steps of a two-step
  question, including the feedback in between, and are empty again at the next question. The
  feedback screen and the results do not show the scratchpad. Nothing is stored.
- **Accessibility:** cells are buttons labelled `Kladblok vak 1: 900` (or `leeg`), with
  `aria-pressed` for the active cell. A fraction in the label reads `3/4`, a mixed number
  `1 en 2/3`, as elsewhere (§8). The spatie key shows `␣` and is labelled `spatie`; `=` is
  labelled `is`.
- To make room, keypad keys are 3 rem (48 px) high instead of 3.5 rem.

## 4. Practice sets & session composition

### 4.1 Sets

A set is pure configuration (`lib/sets.ts`). Every set except **Tafels** mixes in 15% table
exercises, from a session size of 10 (§4.2).

| Set                         | Topics (weight 1 unless stated)                                                   | Tables | Version |
|-----------------------------|-----------------------------------------------------------------------------------|--------|---------|
| **Tafels**                  | `tables`                                                                          | 100%   | v1      |
| **Getallen & delers**       | `lcm`, `gcd`, `prime`, `factorization`, `divisibility`, `squares`                 | 15%    | v1      |
| **Bewerkingen**             | `orderOfOperations` (2), `properties` (1), `smartCalculation` (2)                 | 15%    | v1      |
| **Meten**                   | `volume`, `area`, `length`, `mass`, `time`, `numberUnits` (v1); `speed` (v2); `calendar`, `dataSize`, `clock`, `measureSense` (v3) | 15% | v1–v3 |
| **Verhoudingen**            | `percentages`, `ratios` (v1); `percentChange`, `scale`, `ratioProblems` (v2); `permille`, `proportionConcepts` (v3) | 15% | v1–v3 |
| **Getalbegrip**             | `mentalOperations`, `negativeNumbers`, `rounding`, `powersRoots`, `scientificNotation` (v2); `numberOrder`, `arithmeticWords` (v3) | 15% | v2–v3 |
| **Breuken & kommagetallen** | `fractionConversion`, `fractionArithmetic`, `decimalArithmetic` (v2); `decimalNames`, `compareFractions`, `fractionConcepts` (v3) | 15% | v2–v3 |
| **Meetkunde**               | `perimeterArea`, `solids`, `pythagoras`, `angles`, `symmetry`, `shapeProperties` (v2); `solidNames` (v3) | 15% | v2–v3 |
| **Verbanden & statistiek**  | `statistics`, `percentagePoints`, `sequences`, `formulas`, `equations`, `probability` | 15% | v2      |
| **Talstelsels**             | `numberSystems`, `romanNumerals`                                                  | 15%    | v2      |
| **Heuristieken**            | `systematicCounting`, `workingBackwards`, `guessAndCheck`, `simplifyProblem`      | 15%    | v2      |

The v2 sets follow the PABO tests: the RWT (year 1) and the LKT (kennisbasistoets, year 3).
v2 covers mental arithmetic and basic knowledge only; see §12 for the order, the scope and what
moves to v3.

`properties` has half the weight of the other Bewerkingen topics because it is a two-step
exercise and takes about 2–3× as long as the others. Weights are positive integers, so the
quota arithmetic (§4.2) stays exact.

With v2, the description of Verhoudingen on its card (§3.1) becomes "Procenten, verhoudingen en
schaal".

The table lists the Opfrisser topics. A set's Verdieping (§12.2) has its own topics, all weight
1 and without tables, plus a 20% share of the set's Opfrisser topics (§4.2):

| Set       | Verdieping topics                                                  |
|-----------|--------------------------------------------------------------------|
| **Meten** | `compoundUnits`, `measureProblems`, `timeCalc`, `estimating`       |
| **Verhoudingen** | `percentProblems`, `enlargement`, `compareRatios`, `ratioReasoning` |
| **Getallen & delers** | `lcmGcdProblems`, `divisors`, `missingDigit`, `remainders` |
| **Bewerkingen** | `bracketPlacement`, `derivedFacts`, `multiStepProblems`, `smartCalculationDeep` |
| **Getalbegrip** | `negativeContexts`, `roundingReasoning`, `estimateCalc`, `powerCalc` |
| **Breuken & kommagetallen** | `mixedNotation`, `fractionProblems`, `decimalProblems`, `betweenNumbers` |
| **Meetkunde** | `scalingSolids`, `surfaceArea`, `compositeShapes`, `angleReasoning` |
| **Verbanden & statistiek** | `twoDice`, `statisticsReasoning`, `statisticsProblems`, `formulaProblems` |
| **Talstelsels** | `baseArithmetic`, `baseReasoning`, `hexBinary`, `romanCalc` |
| **Heuristieken** | `countingCases`, `backwardsProblems`, `twoUnknowns`, `simplifyDeep` |

The set overview (§3.1) shows the implemented sets in the build order of §12.1 (Tafels, Meten,
Verhoudingen, Getallen & delers, Bewerkingen, Getalbegrip, Breuken & kommagetallen, …), not in
the order of this table.

**Gemengd** (§12.5) is not a set in this table: it combines the sets the user selects (§3.2),
each with its own topics and weights from the tables above. It has no tables share of its own;
the tables come in only through the Tafels set, as one of the selected sets (§4.2).

### 4.2 Quota algorithm

Given a set and a session size `n`:

1. `tablesCount = Math.round(tablesPercent × n / 100)`. The share is stored as an integer
   percentage to avoid float artefacts: `0.15 × 50` must give exactly 7.5, so it rounds to 8.
   For the Tafels set, `tablesPercent = 100` and `topics` is empty. A mixed share (below 100%)
   only applies from `n = 10`: with `n = 5`, `tablesCount = 0`. Verdieping has
   `tablesPercent = 0` but an Opfrisser share instead (below the steps).
2. The remaining `r = n − tablesCount` exercises are distributed over the set's topics in
   proportion to their weights, using the **largest remainder method**:
   - Each topic first gets `floor(r × wᵢ / Σw)`.
   - The leftover exercises go one at a time to the topics with the largest fractional parts.
   - Ties are broken by the session RNG.
3. If `r` is at least the number of topics, every topic gets at least 1 exercise. If a topic
   ended up with 0, it takes 1 from the topic with the largest quota (on a tie, the first in
   the set's order).
4. Questions are generated per quota, then the whole list is shuffled (Fisher–Yates with the
   session RNG).
5. **De-duplication:** each question has a canonical `key`. A question is a duplicate when its
   key or its first prompt was already used, because two topics can ask the same thing under
   different keys (`10⁻³ = ?` from §5.18 and §5.19). The builder calls a generator at most 20
   times to obtain a question that is not a duplicate. After that, a duplicate is accepted.

**Opfrisser share (Verdieping only).** `quickCount = Math.round(20 × n / 100)`, only from
`n = 10`: with `n = 5`, `quickCount = 0`. These exercises are distributed over the set's
Opfrisser topics with steps 2–3 (their weights, without the tables share); the remaining
`n − quickCount` go over the Verdieping topics. Step 3 applies to each group separately: with 3
exercises over 11 Opfrisser topics, 3 random topics get 1 and the rest 0. Steps 4–5 run over the
whole list, so the Opfrisser exercises are shuffled in, not a warm-up block at the start. The
share retrieves the quick basics the multi-step exercises build on.

Table share and Opfrisser share for each count:

| `n`                       | 5 | 10 | 15 | 25 | 50 |
|---------------------------|---|----|----|----|----|
| tables                    | 0 | 2  | 2  | 4  | 8  |
| Opfrisser (Verdieping)    | 0 | 2  | 3  | 5  | 10 |

Examples with `n = 15`:

- **Bewerkingen:** `r = 13`, weights 2 / 1 / 2, so the shares are 5,2 / 2,6 / 5,2. That gives
  orderOfOperations 5, properties 3 and smartCalculation 5.
- **Getallen & delers:** `r = 13` over 6 topics, so 3 + 2 + 2 + 2 + 2 + 2. The topic with 3 is
  chosen at random.
- **Verhoudingen:** `r = 13` over 7 topics, so 2 + 2 + 2 + 2 + 2 + 2 + 1. The topic with 1 is
  chosen at random. Verdieping: 3 Opfrisser exercises over 7 topics and `r = 12` over 4 topics,
  so 3 + 3 + 3 + 3. Getallen & delers and Bewerkingen have the same Verdieping split (their
  Opfrisser share follows their own weights).
- **Meten:** `r = 13` over 11 topics, so 2 + 2 + 1 × 9. The topics with 2 are chosen at random.
  Verdieping has no tables: 3 Opfrisser exercises (1 each for 3 random Opfrisser topics) and
  `r = 12` over 4 topics, so 3 + 3 + 3 + 3.
- **Getalbegrip:** `r = 13` over 7 topics, so 2 + 2 + 2 + 2 + 2 + 2 + 1. The topic with 1 is
  chosen at random.
- **Breuken & kommagetallen:** `r = 13` over 6 topics, so 3 + 2 + 2 + 2 + 2 + 2. The topic with 3
  is chosen at random.
- **Meetkunde:** `r = 13` over 7 topics, so 2 + 2 + 2 + 2 + 2 + 2 + 1. The topic with 1 is chosen
  at random.
- Verdieping of these three: 3 Opfrisser exercises (1 each for 3 random Opfrisser topics) and
  `r = 12` over 4 topics, so 3 + 3 + 3 + 3.
- **Verbanden & statistiek:** `r = 13` over 6 topics, so 3 + 2 + 2 + 2 + 2 + 2. The topic with 3
  is chosen at random. Verdieping: 3 Opfrisser exercises (1 each for 3 random Opfrisser topics)
  and `r = 12` over 4 topics, so 3 + 3 + 3 + 3.
- **Talstelsels:** `r = 13` over 2 topics, so 7 + 6. The topic with 7 is chosen at random.
  Verdieping: 3 Opfrisser exercises over 2 topics (2 + 1, the topic with 2 chosen at random) and
  `r = 12` over 4 topics, so 3 + 3 + 3 + 3.
- **Heuristieken:** `r = 13` over 4 topics, so 4 + 3 + 3 + 3. The topic with 4 is chosen at
  random. Verdieping: 3 Opfrisser exercises over 4 topics (3 random topics get 1, the fourth 0)
  and `r = 12` over 4 topics, so 3 + 3 + 3 + 3.

**Gemengd (§12.5).** The counting sets are the selected sets, without Tafels at Verdieping
(§3.2). Every counting set weighs the same, however many topics it has: first the sets get
their counts, then each set spreads its count over its own topics.

1. **Opfrisser:** the `n` exercises are distributed over the counting sets, all weight 1, with
   the largest remainder method of step 2 (ties broken by the session RNG). With `n` at least
   the number of sets, every set gets at least 1; with fewer, random sets get 1 and the rest 0.
2. Each set spreads its count over its Opfrisser topics with steps 2–3 (its weights), without
   its tables share. The count of Tafels is all table exercises, from all tables (§5.1).
3. **Verdieping:** `quickCount = Math.round(20 × n / 100)`, only from `n = 10`, as for a set.
   The `n − quickCount` exercises are distributed over the counting sets as in step 1 and each
   set spreads them over its Verdieping topics. The `quickCount` exercises are distributed over
   the same sets as in step 1, independently, and each set spreads them over its Opfrisser
   topics (its weights, without the tables share).
4. Steps 4–5 (shuffle, de-duplication) run over the whole list, as for a set.

Examples:

- **Opfrisser, `n = 15`, all 11 sets:** 15 over 11 sets, so 4 random sets get 2 and the other 7
  get 1. Meten with 2 gives 1 each to 2 random topics of its 11; Tafels with 2 gives 2 table
  exercises; Bewerkingen with 1 gives `orderOfOperations` or `smartCalculation` (shares
  0,4 / 0,2 / 0,4, the tie broken at random).
- **Opfrisser, `n = 5`, all 11 sets:** 5 random sets get 1 exercise, the other 6 get 0.
- **Opfrisser, `n = 15`, Tafels and Meten:** 8 + 7, the set with 8 chosen at random.
- **Verdieping, `n = 15`, all sets:** 10 counting sets (Tafels does not count). 3 Opfrisser
  exercises go to 3 random sets (1 each, one of their Opfrisser topics); `n − 3 = 12` over 10
  sets, so 2 random sets get 2 and the other 8 get 1, each over its 4 Verdieping topics.
- **Verdieping, `n = 10`, Meten and Verhoudingen:** 2 Opfrisser exercises, 1 per set; `8` over
  2 sets, so 4 + 4, which is 1 per Verdieping topic.

## 5. Topics

All prompts are in Dutch. Ranges are chosen so that everything can be done mentally. Every
topic answers with a number unless stated otherwise.

The topic sections live in one file per set, in `topics/` next to this spec. The § numbers are
unchanged, so a reference to §5.x still holds; find its file in the index below. The rules that
several sets share follow the index.

| § | Topic | File |
|---|---|---|
| §5.1 | Multiplication tables (`tables`) | `topics/tafels.md` |
| §5.2 | LCM — KGV (`lcm`) | `topics/getallen.md` |
| §5.3 | GCD — GGD (`gcd`) | `topics/getallen.md` |
| §5.4 | Prime yes/no (`prime`) | `topics/getallen.md` |
| §5.5 | Prime factorization (`factorization`) | `topics/getallen.md` |
| §5.6 | Divisibility rules (`divisibility`) | `topics/getallen.md` |
| §5.7 | Squares & square roots (`squares`) | `topics/getallen.md` |
| §5.8 | Order of operations (`orderOfOperations`) | `topics/bewerkingen.md` |
| §5.9 | Smart calculation (`smartCalculation`) | `topics/bewerkingen.md` |
| §5.10 | Measurement (`volume`, `area`, `length`, `mass`, `time`) | `topics/meten.md` |
| §5.11 | Properties: commutative, associative, distributive (`properties`) | `topics/bewerkingen.md` |
| §5.12 | Percentages (`percentages`) | `topics/verhoudingen.md` |
| §5.13 | Ratios (`ratios`) | `topics/verhoudingen.md` |
| §5.14 | Large numbers (`numberUnits`) | `topics/meten.md` |
| §5.15 | Mental operations with larger numbers (`mentalOperations`) | `topics/getalbegrip.md` |
| §5.16 | Negative numbers (`negativeNumbers`) | `topics/getalbegrip.md` |
| §5.17 | Rounding (`rounding`) | `topics/getalbegrip.md` |
| §5.18 | Powers and roots (`powersRoots`) | `topics/getalbegrip.md` |
| §5.19 | Scientific notation (`scientificNotation`) | `topics/getalbegrip.md` |
| §5.20 | Fraction conversion (`fractionConversion`) | `topics/breuken.md` |
| §5.21 | Fraction arithmetic (`fractionArithmetic`) | `topics/breuken.md` |
| §5.22 | Decimal arithmetic (`decimalArithmetic`) | `topics/breuken.md` |
| §5.23 | Percentage change (`percentChange`) | `topics/verhoudingen.md` |
| §5.24 | Scale (`scale`) | `topics/verhoudingen.md` |
| §5.25 | Ratio word problems (`ratioProblems`) | `topics/verhoudingen.md` |
| §5.26 | Speed (`speed`) | `topics/meten.md` |
| §5.27 | Perimeter and area (`perimeterArea`) | `topics/meetkunde.md` |
| §5.28 | Solids (`solids`) | `topics/meetkunde.md` |
| §5.29 | Pythagoras (`pythagoras`) | `topics/meetkunde.md` |
| §5.30 | Angles (`angles`) | `topics/meetkunde.md` |
| §5.31 | Symmetry (`symmetry`) | `topics/meetkunde.md` |
| §5.32 | Shape properties (`shapeProperties`) | `topics/meetkunde.md` |
| §5.33 | Statistics (`statistics`) | `topics/verbanden.md` |
| §5.34 | Percentage points (`percentagePoints`) | `topics/verbanden.md` |
| §5.35 | Sequences (`sequences`) | `topics/verbanden.md` |
| §5.36 | Formulas (`formulas`) | `topics/verbanden.md` |
| §5.37 | Equations (`equations`) | `topics/verbanden.md` |
| §5.38 | Probability (`probability`) | `topics/verbanden.md` |
| §5.39 | Number systems (`numberSystems`) | `topics/talstelsels.md` |
| §5.40 | Roman numerals (`romanNumerals`) | `topics/talstelsels.md` |
| §5.41 | Systematic counting (`systematicCounting`) | `topics/heuristieken.md` |
| §5.42 | Working backwards (`workingBackwards`) | `topics/heuristieken.md` |
| §5.43 | Guess and check (`guessAndCheck`) | `topics/heuristieken.md` |
| §5.44 | Simplify the problem (`simplifyProblem`) | `topics/heuristieken.md` |
| §5.45 | Calendar units (`calendar`) | `topics/meten.md` |
| §5.46 | Data size (`dataSize`) | `topics/meten.md` |
| §5.47 | Clock (`clock`) | `topics/meten.md` |
| §5.48 | Measure sense (`measureSense`) | `topics/meten.md` |
| §5.49 | Compound quantities (`compoundUnits`) | `topics/meten.md` |
| §5.50 | Measure problems (`measureProblems`) | `topics/meten.md` |
| §5.51 | Time calculations (`timeCalc`) | `topics/meten.md` |
| §5.52 | Estimating (`estimating`) | `topics/meten.md` |
| §5.53 | Permille (`permille`) | `topics/verhoudingen.md` |
| §5.54 | Proportion concepts (`proportionConcepts`) | `topics/verhoudingen.md` |
| §5.55 | Percent problems (`percentProblems`) | `topics/verhoudingen.md` |
| §5.56 | Enlargement (`enlargement`) | `topics/verhoudingen.md` |
| §5.57 | Comparing ratios (`compareRatios`) | `topics/verhoudingen.md` |
| §5.58 | Ratio reasoning (`ratioReasoning`) | `topics/verhoudingen.md` |
| §5.59 | LCM and GCD in context (`lcmGcdProblems`) | `topics/getallen.md` |
| §5.60 | Divisors (`divisors`) | `topics/getallen.md` |
| §5.61 | Missing digit (`missingDigit`) | `topics/getallen.md` |
| §5.62 | Remainders (`remainders`) | `topics/getallen.md` |
| §5.63 | Bracket placement (`bracketPlacement`) | `topics/bewerkingen.md` |
| §5.64 | Derived facts (`derivedFacts`) | `topics/bewerkingen.md` |
| §5.65 | Multi-step problems (`multiStepProblems`) | `topics/bewerkingen.md` |
| §5.66 | Smart calculation, deeper (`smartCalculationDeep`) | `topics/bewerkingen.md` |
| §5.67 | Number order (`numberOrder`) | `topics/getalbegrip.md` |
| §5.68 | Words of arithmetic (`arithmeticWords`) | `topics/getalbegrip.md` |
| §5.69 | Negative numbers in context (`negativeContexts`) | `topics/getalbegrip.md` |
| §5.70 | Rounding reasoning (`roundingReasoning`) | `topics/getalbegrip.md` |
| §5.71 | Estimating calculations (`estimateCalc`) | `topics/getalbegrip.md` |
| §5.72 | Calculating with powers (`powerCalc`) | `topics/getalbegrip.md` |
| §5.73 | Decimal names (`decimalNames`) | `topics/breuken.md` |
| §5.74 | Comparing fractions, decimals, percentages and ratios (`compareFractions`) | `topics/breuken.md` |
| §5.75 | Fraction concepts (`fractionConcepts`) | `topics/breuken.md` |
| §5.76 | Mixed notation (`mixedNotation`) | `topics/breuken.md` |
| §5.77 | Fraction problems (`fractionProblems`) | `topics/breuken.md` |
| §5.78 | Decimal problems (`decimalProblems`) | `topics/breuken.md` |
| §5.79 | Number line (`betweenNumbers`) | `topics/breuken.md` |
| §5.80 | Solid names (`solidNames`) | `topics/meetkunde.md` |
| §5.81 | Scaling solids (`scalingSolids`) | `topics/meetkunde.md` |
| §5.82 | Surface area of solids (`surfaceArea`) | `topics/meetkunde.md` |
| §5.83 | Composite shapes (`compositeShapes`) | `topics/meetkunde.md` |
| §5.84 | Angle reasoning (`angleReasoning`) | `topics/meetkunde.md` |
| §5.86 | Two dice and coins (`twoDice`) | `topics/verbanden.md` |
| §5.87 | Statistics concepts (`statisticsReasoning`) | `topics/verbanden.md` |
| §5.88 | Averages in context (`statisticsProblems`) | `topics/verbanden.md` |
| §5.89 | Formulas and sequences in context (`formulaProblems`) | `topics/verbanden.md` |
| §5.90 | Calculating in other bases (`baseArithmetic`) | `topics/talstelsels.md` |
| §5.91 | Understanding number systems (`baseReasoning`) | `topics/talstelsels.md` |
| §5.92 | Binary and hexadecimal (`hexBinary`) | `topics/talstelsels.md` |
| §5.93 | Calculating with Roman numerals (`romanCalc`) | `topics/talstelsels.md` |
| §5.94 | Counting with conditions (`countingCases`) | `topics/heuristieken.md` |
| §5.95 | Working backwards, deeper (`backwardsProblems`) | `topics/heuristieken.md` |
| §5.96 | Two unknowns (`twoUnknowns`) | `topics/heuristieken.md` |
| §5.97 | Simplify the problem, deeper (`simplifyDeep`) | `topics/heuristieken.md` |

### v3 rules for Verhoudingen, Getallen & delers and Bewerkingen (§5.53–§5.66)

The v3 steps of three sets (§12.2 step 4), specified and built together. The rules of Meten v3
apply to all of them:

- Multiple-choice forms use the `choice` answer kind (§6): four options, no kladblok, no tip.
- The new topics have no topic tips (§3.4.1); number steps keep the factor-of-ten fallback.
- The de-duplication key of every new topic is the form, the variant or context and the numbers.
- Money as §8: `€` prefix, the expected answer with 2 decimals when not whole.
- A "nice whole" is an integer with at most 2 significant digits (§5.12).

### v3 rules for Getalbegrip, Breuken & kommagetallen and Meetkunde (§5.67–§5.84)

The v3 steps of three more sets (§12.2 step 4), specified and built together. The rules of
§5.53–§5.66 apply (multiple choice via `choice`, no topic tips, the de-duplication key is the
form, the variant or context and the numbers, money as §8, "nice whole" as §5.12). Also:

- An ordering option reads as a chain with `<` (`van klein naar groot`) or `>` (`van groot naar
  klein`) and spaces around the sign: `−3,5 < −1,2 < 0,35 < 0,4`. The prompt is
  `Welke rij klopt?`; the three wrong chains are false statements.
- A fraction answer "any equal value" follows §6: `0,875`, `7/8` and `14/16` are all correct.

### v3 rules for Verbanden & statistiek, Talstelsels and Heuristieken (§5.86–§5.97)

The v3 steps of the last three sets (§12.2 step 4), specified and built together: each gets a
Verdieping of four topics and no new Opfrisser topics (Verbanden & statistiek has two RWT gaps,
both Verdieping or multiple choice, §12.3; the other two have none). The rules of §5.53–§5.66
and §5.67–§5.84 apply (multiple choice via `choice`, no topic tips, the de-duplication key is the
form, the variant or context and the numbers, money as §8, "nice whole" as §5.12). Also:

- No new infrastructure: every topic uses an existing answer kind (`number`, `fraction`,
  `choice`, `baseDigits`, `roman`) and existing keys. The card descriptions (§3.1) stay.
- A value that is not a whole number is a decimal with at most 1 decimal, unless its section
  says otherwise (money with 2 decimals, a mean shown in §5.87, a probability typed as a decimal
  in §5.86); the exact value is checked with `lib/rational.ts`, never with floats.
- Prompts are question text without a slot (§3.3); no prompt is longer than 170 characters.
- An explanation names the way to the answer, with the numbers; the Heuristieken ones start
  with the name of the heuristic (§5.41–§5.44), plus `Schema maken:` (new, §5.96).

## 6. Input (keypad)

The keypad is custom. The system keyboard is never opened.

| Answer kind        | Keys                                                           |
|--------------------|----------------------------------------------------------------|
| number             | `0–9`, `,`, `−`, `⌫`, `OK`                                      |
| fraction           | number keys plus a **breuk** key (stacked-fraction icon)       |
| boolean            | two large buttons: `Ja` / `Nee`; a tap submits at once, no `OK` |
| expression         | `0–9`, `+ − × :`, `( )`, `⌫`, `OK`, in 4 columns               |
| factorization      | `0–9`, `×`, `^`, `⌫`, `OK`                                      |
| scientific         | `0–9`, `,`, `−`, `×`, `^`, `⌫`, `OK`, in 4 columns              |
| baseDigits         | `0–9`, `A–F`, `⌫`, `OK`, in 4 columns                           |
| roman              | `I V X L C D M`, `⌫`, `OK`, in 3 columns, taller keys           |
| choice             | four option buttons, one per row; a tap submits at once, no `OK` |

- Every answer kind has its own input model: keys, key reducer, validation and display.
- The input field shows a pretty-printed version as you type: `×`, `:`, and `^2` rendered as
  a superscript. The feedback and the results show the given answer the same way.
- `OK` is disabled only while the input is empty. It is a primary-coloured key that fills the rest
  of the last row. Disabled, it keeps the `--primary-disabled` fill with a `--primary-dark` label,
  which stays readable (v4 spec §9). Operator and auxiliary keys have a darker key colour than the digits.
- `⌫` is always bottom left: the left key of the bottom row of keys, with OK beside it or in a
  row of its own below it (roman), on every keypad and on the kladblok tray (§3.6). A new
  keypad keeps it there; when its keys do not fill a row, a key spans the rest of that row (the
  `M` of the roman keypad), never an empty cell.
- Every keypad is as high as five rows of keys: 5 × 52 + 4 × 8 = 292 px (312 px with 56 px
  keys on screens without a kladblok). A five-row keypad has 52 px keys (56 px without a
  kladblok); a keypad with fewer rows gets taller keys, `(292 − (rows − 1) × 8) / rows`
  (scientific and roman, 4 rows: 67 px, 72 px without a kladblok). "Without a kladblok" is a
  property of the session, not of the step: a session with a kladblok step uses the 292 px
  keypad on every step (§3.6, reserved space). So the prompt never moves
  between answer kinds or when the kladblok tray takes over. The kladblok keypad has 48 px
  keys on a separate tray. Ja/Nee are two buttons of 120 px high, Nee left and Ja right, with
  text only (26 px, weight 800): no ✕ or ✓, which mean wrong and correct elsewhere (v4 spec §9).
- Ja/Nee keeps the layout of a keypad step: the buttons sit at the bottom and the prompt stays at
  the height it has above a number keypad, so it does not jump between questions.
- Input that cannot be submitted, such as `−`, `25/0` or `2 ×`, gives an inline error and does
  **not** count as the attempt: "Ongeldig getal" for number and fraction, "Ongeldige
  ontbinding" for factorization, "Ongeldige som" for expressions and "Ongeldige notatie" for
  scientific notation. The error disappears at the next key press.
- **Factorization input:** `×` is allowed only directly after a number. `^` is allowed only
  directly after a base, so never at the start, after `×`, or after an exponent. Exponents are
  digits. `2^2×3×7` is shown as `2² × 3 × 7`.
- **Expression input** (only the rewrite step of §5.11 uses it): integers, `+ − × :` and
  parentheses. The rewrites never need a decimal comma, a power or a negative number, so these
  keys are left out, and `−` is always the operator. It, the scientific, baseDigits and kladblok
  keypads (§3.6) are the only keypads with 4 columns; all other keypads keep 3. Five rows, the same height as the other
  keypads:

  ```
  7  8  9  +
  4  5  6  −
  1  2  3  ×
  (  0  )  :
  ⌫  OK────────
  ```

  An operator is allowed only after a number or `)`; `(` only at the start, after an operator
  or after `(`; `)` only after a number or `)` while a `(` is open; a digit not directly after
  `)`. At most 30 characters. `7×(13+87)` is shown as `7 × (13 + 87)`. What the keys cannot
  prevent (a trailing operator, an unclosed `(`) gives "Ongeldige som".
- **Scientific input** (only the scientific-notation steps of §5.19 use it): the user writes the
  notation itself, `4,5×10^6`, with the existing keys. No new key is needed. Four columns like
  the expression keypad, but four rows, because it has fewer keys. Its keys are taller, so the
  keypad is as high as the others (see the key heights above):

  ```
  7  8  9  ×
  4  5  6  ^
  1  2  3  −
  ⌫  0  ,  OK
  ```

  The input is a number, optionally followed by `×` and a number, `^` and an exponent: `c`,
  `c×b^n` or `b^n`. Per key:
  - a digit: always, except when the exponent already has 2 digits
  - `,`: only in the number before `×`, once, and not after `^`
  - `×`: only after a digit of the first number, once
  - `^`: only after a digit of the number after `×`, or of the first number when there is no
    `×`; once
  - `−`: only directly after `^` (a negative exponent); elsewhere ignored. `c` is never
    negative in §5.19.
  - at most 16 characters
  - `4,5×10^-3` is shown as `4,5 × 10⁻³`; a `^` without an exponent stays visible.
- What the keys cannot prevent (`4,5×`, `4,5×10^`, a base other than 10 such as `4,5×2^6`)
  gives "Ongeldige notatie" and does not count as the attempt. A plain number (`4500000`) is
  valid input; it is judged wrong with a tip when its value is right (§5.19). Parsing is a small
  dedicated parser next to `parseFactorization`, not `lib/expr`.
- **Letter input** (added with Talstelsels, §5.39–§5.40): two keypads whose keys are only
  appended, so every input is valid and there is no inline error. `⌫` deletes the last
  character. The input is shown as typed (`B4`, `MCMXCIV`).
  - **baseDigits**: one keypad for every base, the digits in their usual place and `A`–`F` in
    a fourth column and the bottom row; at most 8 characters. Five rows, the same height as the
    other keypads:

    ```
    7  8  9  A
    4  5  6  B
    1  2  3  C
    0  D  E  F
    ⌫  OK─────
    ```

  - **roman**: the symbols in order of value, in 3 columns and 4 rows; at most 15 characters
    (the longest answer, `MDCCCLXXXVIII`, has 13). `M` spans two columns next to `⌫`, and OK
    fills the last row. Like the scientific keypad it has taller keys, so it is as high as the
    others:

    ```
    I  V  X
    L  C  D
    ⌫  M───
    OK─────
    ```
- **Multiple-choice input** (`choice`, §12.3; added in v3 as a framework, before any topic uses
  it):
  - Always exactly four options, each a short text (a number, a fraction, a word or a short
    phrase), rendered like the prompt (stacked fractions, §8). The texts are unique and one of
    them is the answer.
  - The generator sets the order: shuffled with its rng, or a natural order such as ascending
    when the options are numbers. A repeat (§3.4) keeps the order.
  - The buttons are full width, one per row, and fill the height of a keypad without a
    kladblok: (312 − 3 × 8) / 4 = 72 px each, or 67 px in a session with a kladblok step
    (292 px, §3.6). So the prompt sits where it does above a
    keypad, as with Ja/Nee. No letters A–D.
  - Like Ja/Nee: a tap is the answer, acting on release (`click`); there is no kladblok (§3.6)
    and no tip (§3.4.1). A choice step has no prefix or suffix: a unit is part of the option
    text.
  - The input is the chosen text; the feedback and the results show it as it is.
- Units are shown next to the input field, and the user never types them. `€`, `1 :` (the
  find-the-scale form of §5.24) and `x =` (§5.37) are fixed prefixes (`€ 45`, `1 : 25 000`,
  `x = 5`); other units (`%`,
  `cm³`, …) are a fixed suffix. The feedback tiles and the result tiles show the same prefix
  and suffix around the answer (`€ 45`, `402 cm²`).
- While the input is empty, the field shows `…` in the muted colour as a placeholder. Empty
  fraction slots show the same placeholder.
- Keys act on press (`pointerdown`), not on release, and show a pressed state on every
  platform (incl. iOS Safari). Keyboard activation still works, and one press never counts
  twice. Exceptions: **OK** and the **Ja**/**Nee** buttons act on release (`click`), so the
  release does not land on the next screen.
- **Fraction input** (introduced with Verhoudingen v1 for `12½%`): a decimal (`12,5`), a
  fraction (`25/2`) or a mixed number (`12 1/2`). Fractions are entered with a template:
  - **breuk** on empty input opens an empty stacked template, with the cursor in the numerator.
  - **breuk** after a whole number (`12`) keeps `12` as the whole part and opens the template
    next to it, cursor in the numerator: a mixed number.
  - Inside a template, **breuk** moves the cursor between numerator and denominator. Tapping a
    slot in the input field selects it as well. The active slot is highlighted.
  - **breuk** does nothing after a comma, and the comma does nothing once a template is open.
  - `⌫` deletes the last digit of the active slot. In an empty denominator it moves the cursor
    to the numerator; when both slots are empty it removes the template, leaving the whole part
    (if any).
  - `−` applies to the whole number: `−12 1/2` means −(12 + 1/2).
  - `OK` is disabled while no digit has been entered. An empty slot or a zero denominator gives
    "Ongeldig getal".
  - An improper fraction in a mixed number (`12 5/3`) is valid input. Any value equal to the
    answer is correct.
  - The submitted input is a string: `25/2`, `12 1/2` or `12,5`, with `-` for the sign. Parsing,
    checking and results work on that string.
- **Judging a fraction answer** (added with Breuken & kommagetallen). A fraction step has one of
  two rules:
  - **any equal value** (§5.12, §5.20 fraction → percentage): `12,5`, `25/2` and `12 1/2` are all
    correct. The expected answer is a whole or mixed number (`12 1/2`), unless the topic sets
    its own (§5.20 shows the percentage as a decimal).
  - **simplest form** (fraction answers of §5.20 and §5.21): correct when the value is equal
    **and** the input is in simplest form. Simplest forms are a whole number (`4`), a fraction
    `a/b` in lowest terms with `b ≥ 2` (`3/4`, also improper: `17/12`), and a mixed number
    `w a/b` with `w ≥ 1`, `0 < a < b` and `a/b` in lowest terms (`1 5/12`). Not simplest: `9/12`,
    `12/3`, `4/1`, `0 3/4`, `1 2/4`, `1 14/12`. A decimal (any input with a comma) is correct
    when the step allows decimals (§5.21 sums: `0,3` and `0,30` for `3/10`) and wrong otherwise
    (§5.20 → fraction, §5.21 simplify). Wrong answers with the right value get a tip (§3.4.1).
  - The expected answer of a simplest-form step is the whole number, the proper fraction, or the
    mixed number for an improper value (`1 5/12`), never both notations.

## 7. Expression engine (`lib/expr`)

- **Tokenizer:** integers, decimal commas, `+ − × : ( ) ^`. Superscript digits read as a power
  (`5²` as `5^2`), so prompt text can be parsed back.
- **Unary minus:** it is allowed at the start of an expression and directly after `(`, and only
  in front of a number: it makes a negative literal. It is needed for the negative literals in
  §5.8. In user input it only occurs in number answers.
- **Parser:** recursive descent producing an AST. Explicit parentheses are kept as `Group`
  nodes, because the associative check depends on them. Parentheses around just a negative
  literal (`(−3)`) are its notation, not a group: they give the negative literal itself.
  - Grammar, by increasing precedence: `sum := product (('+'|'−') product)*`,
    `product := power (('×'|':') power)*`, `power := unary ('^' atom)?`,
    `unary := '−' number | atom`, `atom := number | '(' sum ')'`.
  - Binary operators are left-associative: `20 − 5 − 3` is `(20 − 5) − 3`.
  - As a result, `−3²` would parse as `(−3)²`. This is the reason §5.8 never generates that form
    in a prompt.
- **Evaluate:** exact rational arithmetic via `lib/rational.ts`. Division by zero, and an
  exponent that is not an integer in `[0, 10]`, give no value (`null`) instead of a crash.
- **Formatter:** turns an AST into prompt text following §8. It inserts the parentheses around
  negative literals itself (§5.8).
- **Evaluation steps:** the expression after each single operation, in the order of §8, for
  the explanations in §5.8 and §5.11.
- **Chains:** within one parenthesis level, consecutive `+` operands form an n-ary `Sum` chain
  and consecutive `×` operands form a `Product` chain. Subtraction and division are not
  chainable for commutative/associative purposes.

### 7.1 Rewrite checker

`checkRewrite(original, rewritten, property) → { valid: true }`, or `{ valid: false, reason }`
with `detected: Property` (the first detected property, in the order commutative, associative,
distributive) when the reason is `otherProperty`

A step is a single valid application of property P when the value is preserved, the rewritten
expression differs from the original, and exactly one of the following matches:

- **Commutative.** There is exactly one chain (`Sum` or `Product`) whose children are
  permuted, by a non-identity permutation. The children themselves, including `Group`s, are
  unchanged. Everything else in the AST is identical.
- **Associative.** There is exactly one chain whose fully flattened operand sequence (flattened
  through `Group`s of the same operator) is identical *in order*, while the grouping differs.
  Everything else in the AST is identical.
- **Distributive**, in one of two forms:
  - Expand: `F × S` or `S × F` becomes `F×t₁ ± F×t₂`. Here `S` is either `(t₁ ± t₂)`, or a
    literal `n` that is split as `t₁ ± t₂ = n`. The factor may appear on either side within each
    term.
  - Factor out: `F×t₁ ± F×t₂` becomes `F × (t₁ ± t₂)`, again with the factor on either side.
  - In both forms everything else in the AST is identical.

If more than one property is needed (e.g. both reordering and regrouping), the step is rejected
with the reason "Dit zijn meerdere stappen: …". Steps that violate a property, such as
reordering a subtraction, are rejected with the reason "Deze eigenschap geldt niet voor − en :.".
The full texts are in §5.11.

How the checker decides, in this order:

0. Parentheses that cannot matter are removed from both expressions first: around the whole
   expression, directly inside other parentheses, around a number or a power, and around a `×`
   or `:` term of `+` or `−`. So `(7 × 100) − (7 × 2)` counts as `7 × 100 − 7 × 2`.
   Parentheses around a sum, or around a product inside a product, stay: they are what the
   associative property is about.
1. The rewritten expression is a single number: reason `valueOnly`.
2. With all `Group`s removed, both ASTs are identical: the order of evaluation did not change,
   so nothing happened (`7 × 98` → `(7 × 98)`, `(17 + 25) + 75` → `17 + 25 + 75`): reason
   `unchanged`.
3. The values differ, or the rewrite has no value (division by zero): reason `valueChanged`.
4. Both ASTs are converted to chains. The **difference root** is the smallest pair of subtrees
   that contains every difference: descend while both nodes have the same type, operator and
   number of children and exactly one child differs. "Everything else in the AST is identical"
   holds by construction; the three property tests above are applied to the difference root.
5. If the required property is among the detected ones, the step is valid. If another property
   is detected: reason `otherProperty`.
6. Otherwise, when the difference root of the original is a `−` or `:` and both roots contain
   the same numbers: reason `notForMinusOrDivide`. When only one number was written
   differently (`7 × 98` → `7 × (100 − 2)`, or `7 × 98` → `7 × 49 × 2` within a chain), or
   only one part was worked out into a number (`6 × (40 + 3)` → `6 × 43`, or
   `25 × 37 × 4` → `25 × 148` within a chain): reason `noProperty`. Else: reason
   `multipleSteps`.

The distributive *expand* form only applies to a product of exactly two factors, and the split
`t₁ ± t₂ = n` only to number literals. In the *factor out* form, `S` must be a `Group`. A term
that is just the factor `F` counts as `F × 1`: `15 × 99` → `15 × 100 − 15` is valid.

Required test cases (accept ✔ / reject ✘):

| Original          | Required      | Input                | Result |
|-------------------|---------------|----------------------|--------|
| `7 × 98`          | distributive  | `7 × 100 − 7 × 2`    | ✔      |
| `7 × 98`          | distributive  | `7 × 90 + 7 × 8`     | ✔      |
| `7 × 98`          | distributive  | `686`                | ✘ (no rewrite, just the value) |
| `7 × 98`          | distributive  | `98 × 7`             | ✘ (commutative) |
| `(17 + 25) + 75`  | associative   | `17 + (25 + 75)`     | ✔      |
| `(17 + 25) + 75`  | associative   | `(25 + 75) + 17`     | ✘ (multiple steps) |
| `(17 + 25) + 75`  | commutative   | `75 + (17 + 25)`     | ✔      |
| `25 × 37 × 4`     | commutative   | `25 × 4 × 37`        | ✔      |
| `25 × 37 × 4`     | commutative   | `(25 × 4) × 37`      | ✘ (multiple steps) |
| `7 × 13 + 7 × 87` | distributive  | `7 × (13 + 87)`      | ✔      |
| `20 − 5 − 3`      | commutative   | `20 − 3 − 5`         | ✘ (not for −) |
| `(17 + 25) + 75`  | associative   | `17 + 25 + 75`       | ✘ (unchanged) |
| `7 × 98`          | distributive  | `(7 × 100) − (7 × 2)` | ✔            |
| `7 × 98`          | distributive  | `7 × (100 − 2)`      | ✘ (no property yet) |
| `15 × 99`         | distributive  | `15 × 100 − 15`      | ✔             |

## 8. Conventions

- **Order of operations:** parentheses → powers → `×`/`:` (equal priority, left to right) →
  `+`/`−` (equal priority, left to right).
- **Number formatting:**
  - decimal comma
  - thousands separator from 10 000 onwards (`2 500 000`): a narrow no-break space (U+202F),
    i.e. a thin space that never wraps
  - no separator for 4-digit numbers (`1000`)
  - the minus sign is shown as `−` (U+2212)
  - money: `€`, a no-break space (U+00A0), then the amount; whole euros without decimals,
    otherwise 2 decimals (`€ 45`, `€ 25,50`)
  - fractions are always shown stacked, as written by hand: numerator, a horizontal bar,
    denominator. This applies to prompts, the input field, the feedback and the results.
    Strings keep the text form `a/b`, also for mixed numbers (`12 1/2%`, never a glyph like
    `½`). Only the UI renders them stacked, with a hidden `/` so screen readers still read a
    fraction.
  - mixed numbers show the whole part at normal height next to the stacked fraction: `12 1/2%`
    is rendered as `12` with a stacked `1/2`. Next to the hidden `/`, a hidden ` en ` between
    the whole part and the fraction makes screen readers read `12 en 1/2`.
  - an expected answer with an improper value is a mixed number: `1 5/12` (§6)
  - the slot can take the place of the numerator or the denominator (`3/4 = ?/12`); it is
    drawn stacked like a digit
  - a whole number directly followed by one space and a fraction always reads as a mixed number
    (`3 1/2`). Text must therefore never put a number, a space and a fraction side by side when
    they are not a mixed number, and never put a decimal next to `/` (`37,5/100`): both would be
    drawn wrong.
- **Slot:** the unknown of a sum (`7 × ? = 56`, `2 uur = ? min`, `KGV van 12 en 18 = ?`,
  `… is in het echt ? km`) is written by the generator as the marker `SLOT` (`lib/slot.ts`),
  never as a literal `?`. The UI draws it as `?` (coloured, or filled in, §3.4). A literal `?`
  in a prompt is always a question mark (word problems) and is never coloured or replaced. A
  step has at most one slot, and a literal `?` only as the last character of its prompt.
- **Language:** UI text is in Dutch. Code, comments, tests and documentation are in English.

## 9. Code structure

See the Architecture section in `CLAUDE.md` and the core types in `src/lib/types.ts`.

## 10. Testing strategy

- **Unit (Vitest), for everything in `lib/`:**
  - Generators are run with a seeded RNG, 1000 questions each, and checked for these
    invariants:
    - values stay within their ranges
    - divisions are exact
    - `check(expected)` returns correct
    - prompts are non-empty
  - Number-theory helpers are compared against brute force.
  - `rational.ts`: arithmetic, normalisation, and Dutch decimal parsing/formatting edge cases.
  - Parser: precedence, left-to-right evaluation, unary minus, parentheses, and error cases.
  - Rewrite checker: the table in §7.1, plus generated cases taken from each template's
    example rewrite.
  - Divisibility: every generated explanation agrees with actual divisibility.
  - Scientific input: table-driven parser and judging tests (`4,5×10^6` ✔, `10^6` ✔ for
    `1 × 10⁶`, `45×10^5` ✘ with tip, `4500000` ✘ with tip, `4,5×2^6` invalid).
  - Rounding: every expected answer agrees with half-up rounding computed independently.
  - Fraction judging: table-driven tests of the simplest form (§6), e.g. `3/4` ✔, `9/12` ✘ with
    tip, `1 5/12` ✔ and `17/12` ✔ for 17/12, `1 14/12` ✘, `12/3` ✘ for 4, `0,3` ✔ only when
    decimals are allowed.
  - Fraction arithmetic: every expected answer agrees with the value computed independently, and
    is in simplest form.
  - Sets and session builder:
    - quotas for every set × every allowed `n` (incl. the examples in §4.2)
    - every topic is present when `r ≥ topics`
    - de-duplication works
    - output is deterministic with a fixed seed
- **Component tests (`@testing-library/svelte`):** keypad input per answer kind, the
  feedback flow (auto-advance when correct, Verder when wrong), and the kladblok (focus,
  spatie, keypad switch, hidden for tables and Ja/Nee, notes reset per question).
- **Manual:** install the PWA on iOS Safari and Android Chrome, then verify offline mode.

## 11. Open assumptions

While a set's spec is iterated, assumptions that still need the user's confirmation are listed
here. Once confirmed, the decision lives in its own section and the item is removed; the history
is in git.

No open assumptions.

## 12. Roadmap (not in v1)

The roadmap covers the practice sets, plus the two lesson features of v6. The lesstof content has
its own order (lesstof spec §2); a new set needs no lesson.

v3 deepens practice within a set: levels (§12.2) and multiple choice with the RWT gaps
(§12.3), then three small features that make a session's result usable (§12.4). Mixed
categories (§12.5) are done. The order after that (decided 2026-11-14, v6 and v8 inserted
2026-11-15):

- v4: tablet support (§12.10).
- v5: the practice test (§12.6, done).
- v6: from a lesson to practice, and a mini check after a lesson (§12.15).
- v7: persistent memory in IndexedDB. No section yet; the non-goals of §1 change when that work
  starts. Input for its spec (architecture analysis of 2026-11-14, not decided): a `Question`
  cannot be stored (`Step.check` is a closure), so storage gets its own record of plain data
  (such as topic, key, correct, duration, time) behind an interface in `lib/` with an in-memory
  variant; the `Topic` id is then a storage format, and the app keeps working without IndexedDB.
- v8: yesterday's mistakes (§12.16), builds on v7.
- v9: problems where a calculator is allowed (§12.11).
- v10: a print button for the practice test (§12.12).
- v11: a streak of practice days (§12.13).
- v12: visual improvements to the exercises (§12.14).

The check against the toetsmatrijs (§12.7) is not tied to a version.

### 12.1 v2 — PABO mental arithmetic and basic knowledge (done)

v2 covers the PABO tests: the RWT (landelijke reken- en wiskundetoets, year 1, replaced the
Wiscat in 2024; source: Cito handreiking, excerpt in `docs/references/cito-rwt-handreiking.md`)
and the LKT (landelijke kennistoets, year 3). Both test these domains: whole numbers; ratios,
percentages, fractions and decimals; measurement and geometry; relations and statistics. The LKT adds number systems, figurate numbers and problem solving with heuristics.
v2 only covers what can be practised as mental arithmetic or basic knowledge with a typed
answer. Prompts describe figures in words; there are no pictures.

The sets are built in this order, one implementation plan each. The topic details are decided
in each set's own spec iteration.

1. **Getalbegrip** — done, specified in §5.15–§5.19.
2. **Breuken & kommagetallen** — done, specified in §5.20–§5.22.
3. **Verhoudingen** (v2 part) — done, specified in §5.23–§5.25
   - `percentChange`: the percentage of a change, VAT (21% and 9%) both ways, and the original
     price before a change.
   - `scale`: map scale ↔ real distance, and finding the scale.
   - `ratioProblems`: word problems with a ratio: part of the whole, mixing, and per unit
     (added because the user finds these hardest in the book).
   - Infrastructure: none; uses the `€` prefix, the `1 :` prefix and the unit suffix.
4. **Meten** (v2 part) — done, specified in §5.26
   - `speed`: distance, time and speed, and km/u ↔ m/s.
   - Infrastructure: none; its own module, because the factor 3,6 does not fit the conversion
     engine (§5.10).
5. **Meetkunde** (new set) — done, specified in §5.27–§5.32
   - `perimeterArea`: perimeter and area of a square, rectangle, triangle, parallelogram,
     trapezium and circle (`π ≈ 3,14`, with numbers that can be done mentally).
   - `solids`: volume and surface area of a cube, a box and a cylinder.
   - `pythagoras`: the missing side of a right-angled triangle, using Pythagorean triples and
     their multiples.
   - `angles`: angle sums in triangles and polygons, the angle of a regular polygon, and the
     angle between the hands of a clock.
   - `symmetry`: the number of lines of symmetry and the order of rotational symmetry of a
     figure named in words (regular polygons, quadrilaterals, triangles).
   - `shapeProperties`: yes/no statements about quadrilaterals and triangles
     (`Is elk vierkant een ruit?`), with the boolean answer kind of `prime`.
6. **Verbanden & statistiek** (new set) — done, specified in §5.33–§5.38
   - `statistics`: mean, median, mode and range of a short list, and the missing value for a
     given mean.
   - `percentagePoints`: the change between two percentages in percentage points versus in
     percent (`van 20% naar 25%`: 5 procentpunt, 25% hoger), and the new percentage after
     either.
   - `sequences`: arithmetic and geometric sequences, and figurate numbers (triangular and
     square numbers): the next term or the n-th term.
   - `formulas`: substituting into a formula, and the start value and slope of a linear
     relation given as a table.
   - `equations`: linear equations in one unknown with an integer solution: `3x + 5 = 20`,
     with brackets, and with `x` on both sides.
   - `probability`: simple probabilities as a fraction (one die, marbles).
   - Infrastructure: none; uses the `x =` prefix, the `€` prefix and the unit suffix.
7. **Talstelsels** (new set; LKT) — done, specified in §5.39–§5.40
   - `numberSystems`: binary, base 5 and hexadecimal ↔ decimal.
   - `romanNumerals`: Roman numerals ↔ decimal.
   - Infrastructure: two letter answer kinds, `baseDigits` (`0`–`9`, `A`–`F`) and `roman`
     (`I V X L C D M`) (§6).
8. **Heuristieken** (new set; LKT) — done, specified in §5.41–§5.44
   - Short generated puzzles with a number as the answer. The explanation names the
     heuristic.
   - `systematicCounting`: combinations, handshakes and orderings.
   - `workingBackwards`: `Ik denk aan een getal…` and money left over.
   - `guessAndCheck`: chickens and rabbits (and bicycles and tricycles), and two numbers from
     their sum and difference.
   - `simplifyProblem`: Gauss sums, counting (divisible numbers, `tot en met`, fence posts),
     and figure patterns described in words, both ways.
   - Infrastructure: none; check the longest prompts on a phone (the prompt sizes of §3.3 and
     the scrolling prompt of §2).
   - This set comes last because it combines the skills of the other sets.

Why this order: Getalbegrip is the largest domain in the RWT mental-arithmetic part and needs
little new infrastructure. Its negative numbers are needed later. Fractions and decimals come
next because percentages, scale, probability and statistics build on them. The remaining sets
build on both. Talstelsels and Heuristieken are LKT-only and come last.

### 12.2 v3 — levels: Opfrisser and Verdieping

Comes after the v2 sets (§12.1). Every set except Tafels
gets a second level, **Verdieping**: exercises closer to the PABO tests (Cito), with more steps,
combined skills and word problems, so an exercise takes longer than the ~12 s of Opfrisser. It
stays mental arithmetic with the kladblok (§1, §12.8). Tafels has no levels: the table choice
(§3.2) already sets what is practised.

Built in steps, each its own session and only when the user says so:

1. **Docs** — this section, §1 and the roadmap in `CLAUDE.md` (done).
2. **Framework** (done) — no new exercises. The level choice is in §3.2; until a set gets its
   step 4, its Verdieping is disabled, and the framework is tested with a fixture set
   (`lib/setFixture.ts`).
   - Model: `Level = 'quick' | 'deep'` (Opfrisser and Verdieping). A set keeps its current
     topics, weights and tables share as the quick level and gets an optional
     `deep?: readonly TopicWeight[]` with its own topics and weights. A set without `deep`
     disables the segment; Tafels never has one. Verdieping mixes in no tables.
   - `forLevel(set, level)` gives the set at the chosen level (for Verdieping its `deep` topics
     and no tables share).
   - Opfrisser share (decided 2026-11-01, after the framework): Verdieping also mixes in 20%
     exercises from the set's quick topics (§4.2), shown as one row "20% opfrisser" (§3.2). The
     levels are not disjoint, so a Verdieping session also retrieves the quick basics its
     multi-step exercises build on; a separate warm-up block at the start was rejected (it
     needs new session infrastructure for little gain). This changes `forLevel` and the quota
     algorithm; it is a small feature of its own, not part of a set step.
   - Verdieping topics are their own `Topic` ids and generators (`lib/topics/`), with their own
     labels and tips. They may reuse the steps, answer kinds and helpers of the quick topics.
3. **Multiple choice** (done) — the multiple-choice answer kind `choice` (§6, §12.3),
   framework only, right after the levels framework so every set step can use it.
4. **Per set** — one set at a time: a spec iteration (topics, ranges, tips, quota examples), a
   light plan, then the implementation. Enabling a set's Verdieping is adding its `deep` config.
   The step also closes the set's RWT gaps (§12.3), at both levels. No fixed order: the user
   picks the next set. Done: Meten (§5.45–§5.52), and, built together, Verhoudingen
   (§5.53–§5.58), Getallen & delers (§5.59–§5.62) and Bewerkingen (§5.63–§5.66), and, built
   together, Getalbegrip (§5.67–§5.72), Breuken & kommagetallen (§5.73–§5.79) and Meetkunde
   (§5.80–§5.84), and, built together, Verbanden & statistiek (§5.86–§5.89), Talstelsels
   (§5.90–§5.93) and Heuristieken (§5.94–§5.97). Every set except Tafels now has a Verdieping.

The lesstof (lesstof spec) is not split by level.

### 12.3 v3 — multiple choice and the RWT gaps

**Multiple choice** (§12.2 step 3): a multiple-choice answer kind, `choice` (§6). The step
builds the framework only, tested with test-only steps; the sets add the questions in their
own step (§12.2 step 4). It serves:

- mathematical language and concepts, such as absolute versus relative, and mean versus median
- estimating (`welk antwoord ligt het dichtst bij`)
- comparing and ordering

**RWT gaps**: what the eindtermen of the Cito handreiking
(`docs/references/cito-rwt-handreiking.md`, ch. 6) ask and the sets do not have yet, within
mental arithmetic and basic knowledge. Checked 2026-10-26 against §5 and the lesstof. Each set closes its gaps in its own step (§12.2 step 4);
the details (forms, ranges, input) are decided in that set's spec iteration. Per gap: the
eindterm, then the level, or **MC** when it needs multiple choice. Lessons for the new topics
follow separately (lesstof spec §2).

- **Meten** — specified in §5.10, §5.14 and §5.45–§5.52; reading the time is multiple choice
  only, so there is no time keypad.
  - 0.2: the standard reference values (a door ≈ 2 m, walking ≈ 5 km/u, the Netherlands
    ≈ 18 miljoen inhabitants) and estimating with them. Opfrisser, estimating MC.
  - 0.1: measuring instruments. MC.
  - A.1: writing out a number with a name in full (`10,6 miljoen = 10 600 000`). Opfrisser.
  - C.2: the missing units: `hm`, `dam`, `kl`, `km³`, `ca`, kuub and cc; time above a day
    (week, maand, kwartaal, jaar, etmaal, lustrum, decennium, eeuw, millennium); money (`ton`);
    memory (kB, MB, GB, TB). Opfrisser. Choosing the most suitable unit and ordering lengths in
    mixed units: MC.
  - C.3: compound quantities other than speed, such as population density (inwoners per km²),
    and speed from metres (`500 m in 3 min → km/u`). Verdieping.
  - C.9: reading the time (`tien voor half 9` ↔ `20:20`) and elapsed time. Opfrisser; how a time
    is typed is decided in the spec iteration.
- **Getalbegrip** — specified in §5.67–§5.72
  - A.3: ordering positive and negative numbers, and estimating. MC.
  - A.2: the words of arithmetic (som, verschil, bijna, ruim). MC.
  - A.4b: shortages with money (`€ 462 te kort`, `in het rood`). Verdieping.
- **Verhoudingen** — specified in §5.53–§5.58
  - B.1, B.7: promille, missing everywhere. Opfrisser and Verdieping.
  - B.10: enlarging and reducing with percentages (a copier at 125%). Verdieping.
  - B.4: comparing ratios (`appels : peren = 1 : 2` against `3 : 4`). Verdieping.
  - B.1: concepts such as absolute versus relative. MC.
- **Breuken & kommagetallen** — specified in §5.73–§5.79
  - B.2: naming small decimals (`acht duizendste`, `drie miljardste`). Opfrisser.
  - B.4: comparing fractions and decimals (`Welke breuk is het grootst?`, the answer typed with
    the existing keys). Opfrisser; ordering a whole list MC.
  - B.9: combinations of fractions, decimals and percentages (`4 3/5 : 0,20`). Verdieping.
  - §3.6 of the handreiking: every eindterm is tested formally and in a context; the set is now
    almost only formal. Verdieping adds contexts.
  - B.1: concepts such as gelijkwaardig and samengestelde breuk. MC.
- **Meetkunde** — specified in §5.80–§5.84
  - C.13: quadratic and cubic enlargement (`de ribbe wordt 2 keer zo lang → de inhoud 8 keer`).
    Verdieping.
  - C.10: the surface area of a pyramid from given parts (`9 + 4 × 7,5`). Verdieping.
  - C.1: the names of solids (prisma, kegel, piramide). MC.
- **Verbanden & statistiek** — specified in §5.86–§5.89
  - B.11: probability with two dice. Verdieping.
  - Mean versus median and other concepts. MC.

Getallen & delers, Bewerkingen, Talstelsels and Heuristieken have no RWT gaps. Out of scope
(§12.8): C.5 to C.8 and C.14 (pictures), C.12 the volume of a sphere (calculator), D.1 to D.3
(graphs, tables, spreadsheets). The hoofdrekenen part of the RWT has no questions from domain
D.

### 12.4 v3 — results and lesson link

Comes after the levels (§12.2) in the roadmap. Three separate small features (CLAUDE.md
workflow), each its own spec iteration; the user picks the order, also relative to the
remaining set steps (§12.2 step 4). None needs persistence: everything lives in the memory of
the current session.

1. **Practise mistakes** — a button on the results screen (§3.5) that starts a new session with
   only the topics of the first-attempt mistakes. Decided in §3.5 (button Fouten oefenen).
2. **Score per topic** — the results screen shows the first-attempt score per topic, so weak
   topics stand out. Decided in §3.5 (card "Per onderwerp"). The practice test (§12.6) reuses it for "on which topics they still need
   to practise".
3. **Lesson link** (done) — from a mistake in the wrong-answer panel to the lesson topics of its
   practice topic, read in a sheet over the session (not via `openLesson`). Decided in the
   lesstof spec §3.1–§3.2 (place, button, sheet, mapping) and §4 (exception to the code
   separation).

### 12.5 Mixed categories (done)

Comes after v3. Built as the first v4 step, before the reorder of 2026-11-14. A session that mixes exercises from more than one set. Decided 2026-11-08,
specified in §3.1 (the row **Gemengd**), §3.2 (set choice), §4.1 and §4.2 (distribution):

- One row **Gemengd** on the overview; its setup has a pill per set (default all), plus the
  count and the level. No fixed mixed set and no multi-select on the overview: the set choice
  covers both "everything mixed" and "a few sets of my choice".
- Every selected set weighs the same, then its own topic weights apply. The alternative, one
  pool of all topics, lets Meten (11 topics) outweigh Talstelsels (2).
- Tafels is a selectable set like the others, with all tables; Gemengd has no separate tables
  share. At Verdieping the Tafels pill is disabled, because Tafels has no Verdieping.
- No new session infrastructure beyond the quota of §4.2: play, repeats, results, Opnieuw and
  Fouten oefenen work as for a set. The practice test (§12.6) reuses the distribution.

LKT 3.3 (written algorithms) is out of scope (§12.8, decided 2026-11-08).

### 12.6 v5 — practice test (oefentoets) (done)

Comes after tablet support (v4, §12.10). It reuses the mixing of mixed categories (§12.5). A session in the style of a PABO
test. Its form (composition, count, level, the pass mark) is in its own spec,
`2026-11-14-oefentoets-design.md` (built 2026-11-15); where that spec and the notes below
differ, that spec holds. The non-goals of §1 hold: no stored results or history.

Input for its spec (architecture analysis of 2026-11-14, not decided): `lib/play.ts` always
repeats a wrong question and always sets feedback, so the test needs a policy on `startPlay`
(repeat wrong answers, show feedback) and its own screen that reuses `QuestionView`; and the
test is better a session configuration (set, mixed or test, one build function) than a third
pseudo set next to `MIXED_SET` and the `tablesPercent === 100` check of Tafels.

Feedback is given only after the test, unlike a practice session (§3.4):

- No repeat of wrong answers, and no sign during the test that an answer was wrong (no correct or
  wrong state, no wrong-answer panel, no tips).
- The mistakes are shown only on the results screen.
- The results screen says whether the user passes or fails, and on which topics they still need to
  practise (score per topic, §12.4).

### 12.7 Check against the toetsmatrijs

Check the sets (topics, ranges, weights) against the toetsmatrijs and record the gaps. The
toetsmatrijs is in the Cito handreiking (`docs/references/cito-rwt-handreiking.md`): the
distribution per domain and part in §3.3 (table 1), the eindtermen with H/NH per eindterm in
ch. 6. Not tied to a version: it is done between versions, and each later version checks its
scope against it. The check of 2026-10-26 gave the RWT gaps of §12.3.

**Check of 2026-11-02** (after v3, against §5): the gaps of §12.3 are closed. Remaining gaps
(decided 2026-11-02): the RWT gaps are closed before v4, one small round per set (all closed
2026-11-02); the LKT gaps
wait until the version of the kennisbasis is confirmed; 3.3 is out of scope (§12.8).

- RWT
  - C.10b: the surface area of a sphere with the formula given (`4 × π × r²`). Meetkunde,
    Verdieping. §12.8 drops only the volume of a sphere (C.12b). Closed by the Sphere form of
    §5.82 (`π = 3,14`).
  - A.4a: division with a remainder (`23 : 7 = 3 rest 2`) is Verdieping only (`remainders`,
    `multiStepProblems`), while A.4 is also hoofdrekenen. Opfrisser. Closed by the Remainder
    form of §5.15 (`mentalOperations`, Opfrisser), missed in this check; the bare form without
    context needs a two-part answer and is not added.
  - B.4: comparing percentages and ratios together with fractions and decimals;
    `compareFractions` has fractions and decimals only. Opfrisser. Closed by the Mixed form of
    §5.74.
  - D.4: a formula with a decimal factor, such as Celsius ↔ Fahrenheit (`F = 32 + 1,8 × C`).
    Verdieping. Closed by the temperatuur context of §5.89; decimal rates were already in the
    word formulas of §5.36 (taxi `2,50`, kaars `1,5`).
  - C.1: the terms horizontaal, verticaal, grootheid and eenheid. A.1: cijfer versus getal
    (`45 bestaat uit de cijfers 4 en 5`). MC. Closed by the Digit form of §5.68, the Quantity
    form of §5.48 and the Line form of §5.80.
- LKT, provisional: the version of the kennisbasis
  (`docs/references/lkt-kennisbasis-concept.md`) is unconfirmed.
  - 2.3: meetniveaus (nominaal, ordinaal, interval, ratio), correlatie versus causaliteit, and
    generalisatie and betrouwbaarheid (a sample). Verbanden & statistiek, MC.
  - 2.2: other measurement systems with the rate given (inch ↔ cm, mijl ↔ km), and
    meetnauwkeurigheid (`op hele cm gemeten: 14 cm` lies between 13,5 and 14,5 cm). Meten.
  - 2.5: angle types by size (scherp, recht, stomp, gestrekt). Meetkunde, Opfrisser MC.
  - 2.1.c: the gulden snede (≈ 1,618). Verhoudingen, MC.
  - 3.3: written algorithms (kolomsgewijs, cijferen) are not mental arithmetic with one typed
    answer. Out of scope (§12.8, decided 2026-11-08).

The distribution of table 1 needs no change to the sets; it matters for the practice test
(§12.6).

### 12.8 Out of scope until further notice

- Problems that need a calculator, such as the RWT calculator part and the LKT part 2, also at
  the Verdieping level, until v9 (§12.11). Until then the app is for mental arithmetic and ways
  of thinking.
- Anything that needs pictures, until v12 decides what is allowed (§12.14):
  - reading graphs, tables and diagrams
  - spatial geometry: views, nets and cube buildings
  - symmetry of pictured figures (letters, patterns) and coordinates
  - measuring angles
- Didactics (part of the LKT).
- Written algorithms (LKT 3.3: kolomsgewijs, cijferen): not mental arithmetic with one typed
  answer, and they would need a column input of their own.

### 12.9 Optional later

Topic toggles on the setup screen.

### 12.10 v4 — tablet support (done)

Decided 2026-11-14, built 2026-11-14. The app is phone-first; v4 makes it usable on a tablet.
Its form is in its own spec, `2026-11-14-tablet-design.md`: layouts for portrait and
landscape, the Design V3 phone changes, reserved kladblok space and physical keyboard input.
The phone rules it changed are in §2, §3.2, §3.5, §3.6 and §6 of this spec.

### 12.11 v9 — calculator problems

Decided 2026-11-14; reverses the drop of calculator problems in §12.8. The foundation: exercises
marked as "rekenmachine toegestaan", as Cito marks them, such as the RWT calculator part and the
LKT part 2. How and what (which problems, ranges, how the mark is shown, whether the app offers a
calculator, how it relates to the sets and levels) is decided in its own spec iteration; §1 and
§12.8 change when that work starts.

### 12.12 v10 — print the practice test

Decided 2026-11-14. Print the practice test (§12.6) to paper or PDF. Printing through the browser
(`window.print()` with a print stylesheet) needs no new infrastructure or network calls. Open:
what to print (questions only, answers, or both).

### 12.13 v11 — streak

Decided 2026-11-14. Track a streak of consecutive practice days. Builds on the persistent memory
of v7; streaks are a non-goal in §1 and "Out of scope" in `CLAUDE.md` until that work starts.

### 12.14 v12 — visual improvements to the exercises

Decided 2026-11-14. Exercises that show more than text. First decide the principle, not one-off
exceptions to "no pictures" (§12.8): for example text-like visuals (tables) allowed, while
figures and graphs stay out, or more.

A first candidate (discussed 2026-10-29): a 2×2 ratio table with one unknown cell, instead of the
text form `3 : 5 = 12 : ${SLOT}`, for `ratios` and `ratioProblems`. Answer checking, tips and
keypad stay the same (one number step); new are an optional `table` field on `Step` with `SLOT`
in one cell, a table component, and a branch in `QuestionView`. The table costs height, and the
kladblok hides rows below 816 px viewport height (§3.6). Open: only 2×2, or also 3 columns with
an intermediate step.

### 12.15 v6 — from a lesson to practice, and a mini check

Decided 2026-11-15. Two features that connect the lesstof to practice; the opposite direction
(from a mistake to a lesson, lesstof spec §3.1–§3.2) exists. Both need no new infrastructure and
no persistence. Their form is decided in the lesstof spec when the work starts.

- From a lesson to practice: a lesson topic offers a way to practise that topic.
- Mini check: a few exercises about the lesson topic, after the lesson.

Open: where the button sits (per lesson topic or per lesson), which practice topics a lesson
topic maps to (`LESSON_LINKS` maps the other way, practice topic → lesson topics), the level
and the number of exercises, whether the mini check is a session of its own or part of the
lesson view, and whether the two features are one entry point or two.

### 12.16 v8 — yesterday's mistakes

Decided 2026-11-15. Exercises that went wrong come back on a later day. Builds on the persistent
memory of v7. A stored mistake is plain data (v7), so what comes back is a new exercise of the
same topic, as in Fouten oefenen (§3.5), not the same `Question`.

Open: when a mistake comes back (the next day, or spaced over more days), when it is cleared,
where the user starts it, and how it relates to "no adaptive difficulty" (§1): it picks
exercises from earlier results, which the user-chosen level does not.
