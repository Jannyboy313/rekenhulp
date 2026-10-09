# Rekenhulp — Design Spec

- Started: 2026-10-05
- Status: living spec, the source of truth for behaviour. Decision history is in git.

## 1. Goal

A phone-first PWA for practising arithmetic without a calculator. Purpose: improve general
mental-arithmetic skill and prepare for the PABO rekentoets. The user picks a themed practice
set, works through a generated session of exercises, gets immediate feedback per exercise and
an overview at the end.

### Non-goals

- No accounts, database, statistics, streaks or history
- No persistence at all, including localStorage. Every app start uses defaults.
- No network traffic after the initial load. The app works fully offline.
- No adaptive difficulty
- Only the topics marked v1 in §4 are in scope for v1. v2 and v3 are on the roadmap (§12), and
  the architecture must make adding them cheap.

## 2. Platform & stack

| Concern    | Choice                                                                 |
|------------|------------------------------------------------------------------------|
| UI         | Svelte 5 (runes), TypeScript strict, no SvelteKit                      |
| Build      | Vite, static output in `dist/`                                         |
| PWA        | `vite-plugin-pwa`, `generateSW`, precache all assets, `autoUpdate`     |
| Tests      | Vitest (unit), `@testing-library/svelte` for a few component tests     |
| Quality    | `svelte-check`, Prettier                                               |
| Hosting    | Self-hosted by the user, as static files                                |

Rationale for not using SvelteKit: the app has four screens driven by a state machine and
needs no routing, SSR or server endpoints. Plain Vite + Svelte keeps the surface minimal.

### PWA requirements

- Manifest: name `Rekenhulp`, `display: standalone`, `orientation: portrait`, theme and
  background colour, icons 192/512 px plus a maskable icon, and an `apple-touch-icon` for iOS.
- An SVG source icon is checked in. PNGs are generated as part of the build.
- Service worker precaches everything, so the app works in airplane mode after the first visit.
- When a new version is deployed, the app updates silently on the next launch.

### Mobile UX requirements

- Portrait layout for 360–430 px wide screens. Respects `env(safe-area-inset-*)`.
- `touch-action: manipulation` disables double-tap zoom.
- The page never scrolls while playing: the play screen is exactly one screen high. When the
  content does not fit, the question view lets only the prompt shrink and scroll (the kladblok
  and the keypad keep their size), and the feedback scrolls its prompt, answers, tip and
  explanation while **Verder** stays fixed below them. The other screens scroll as usual.
- Tap targets are ≥ 48 px, except the small **Alle**/**Geen** buttons (40 px, §3.2) and the
  fraction slots in the answer field (compact, so the keypad fits; the breuk key selects slots
  too). Feedback is announced via `aria-live`.
- Supports `prefers-color-scheme` (light/dark) and `prefers-reduced-motion`.
- The system keyboard is never used for answers; the app has its own keypad (§6).
- The screen stays on during a session (Screen Wake Lock API). The lock is requested again when
  the app becomes visible after being hidden, and released when the session ends. Where the API
  is missing or the request is refused, nothing is shown and the session works as usual.

## 3. Session flow

The app is a state machine in `App.svelte` with four states:
`sets → setup → playing → results`.

- "Terug" moves from `setup` back to `sets`.
- "Opnieuw" moves from `results` back to `playing`, with the same set, count and table choice.
- "Menu" moves from `results` to `sets`.
- The system back action (Android back button or gesture, iOS swipe back) never closes the app
  from another screen. On `setup` and `results` it moves to `sets`, like Terug and Menu. During
  `playing` it is ignored; only Stop ends a session. On `sets` it behaves as the system default.
  Implementation: one history entry is kept above the start screen while the app is not on
  `sets`; a `popstate` that consumes it is handled as back.

### 3.1 Set overview (start screen)

- The app always opens on this screen, with no set preselected.
- It shows a list of cards, one per available set (§4). Each card shows the set's name and a
  one-line description of its topics.
- Tapping a card opens the setup screen for that set.
- Sets whose topics are not implemented yet (v2/v3) are not shown.

### 3.2 Setup screen

- The header shows the set name and a **Terug** button.
- Below it is a list of the set's topics. For every set except Tafels, the list includes
  "15% tafels".
- **Table choice (Tafels only):** instead of the topic list, Tafels shows the heading "Kies
  tafels" with two small buttons **Alle** and **Geen**, and a grid of 13 toggles, one per table
  (2–9, 11–15, §5.1), five per row. By default all tables are selected. Alle selects all,
  Geen clears all. With no table selected, **Start** is disabled. The choice applies only to
  the Tafels set; the 15% tables in the other sets always use all tables.
- **Count:** 5, 10, 15, 25 or 50 exercises, shown as full-width options stacked in one column.
  The default is 15.
- A **Start** button.
- The chosen count and table choice are kept in memory only while the app stays open; nothing is
  persisted. **Opnieuw** reuses both.

Note: the 3-minute target corresponds to roughly 15 exercises (~12 s each). Larger counts are
deliberate longer sessions.

### 3.3 Playing

- The header shows the set name, progress (`7 / 15`, or **Herhaling** while a repeated exercise
  is shown, §3.4), the elapsed time (`mm:ss`, counting up, no time limit) and a **Stop**
  button. Stop is light red (the wrong-answer background with
  the wrong-answer text colour), so it stands apart from the neutral buttons.
- Stop ends the session immediately and goes to results. Results then cover only the answered
  exercises; the current, unanswered exercise is not counted. A two-step exercise counts as
  answered only after its last step, so Stop after step 1 drops it. Repeats still waiting in the
  queue are dropped as well.
- The time spent on each exercise is recorded, measured from when it is shown until the final
  submission.
- Most exercises show a kladblok (scratchpad) above the prompt (§3.6).
- The prompt's font size depends on its length as displayed (a stacked fraction counts as its
  widest line): up to 18 characters large (2.5rem), up to 40 medium (1.75rem), longer small
  (1.375rem). Short sums stay large; word problems and property prompts no longer push the
  keypad down. The thresholds are estimates, to be adjusted after the phone check.

### 3.4 Feedback per exercise

- **Correct:** green confirmation for 600 ms, then automatically on to the next exercise. With
  reduced motion, a static colour is shown instead of an animation.
- **Wrong:** red, with "Jouw antwoord", "Juist antwoord", an optional tip (§3.4.1) and an
  optional explanation (e.g. `91 = 7 × 13`). The user moves on by tapping **Verder**.
- Each time an exercise is shown, it allows exactly one attempt (one per step for property
  exercises, §5.11).
- The feedback shows the prompt with the size steps of §3.3, one step smaller: 2rem, 1.5rem and
  1.25rem.
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
  equals exactly what that mistake produces.

| Topic | Answer equals | Tip |
|---|---|---|
| Meten, grote getallen name → name (`3,5 L = ? cm³`, `250 miljoen = ? miljard`) | value with × and : swapped | "Naar een kleinere eenheid wordt het getal groter: vermenigvuldig met 1000." (or: grotere eenheid, deel) |
| `area` | conversion with the length factor (10ᵏ instead of 10²ᵏ) | "Bij oppervlakte is elke stap ×100 (10 × 10), niet ×10." |
| `volume`, both units cubic | conversion with the length factor | "Bij kubieke eenheden is elke stap ×1000 (10 × 10 × 10), niet ×10." |
| `time` (min↔s, uur↔min, uur↔s) | conversion with 100 per 60 | "1 uur = 60 min, niet 100 min." |
| `time`, larger → smaller, factor 60 | decimals read as minutes: 2,5 uur → 170 or 125 | "0,5 uur is 30 min, niet 50 min." |
| `time`, smaller → larger, factor 60 | remainder written as decimals: 150 min → 2,3 | "30 min is 0,5 uur, niet 0,3 uur." |
| `numberUnits`, name → power | English short scale (biljoen → 10⁹) | "Een biljoen is 10¹²; 10⁹ is een miljard (Engels: billion)." |
| `numberUnits`, name → power | shift of the coefficient forgotten | "250 = 2,5 × 10²: tel 2 op bij 6." |
| `percentages`, part of whole | the rest (100% − p%) | "Dat is wat er overblijft; gevraagd is 25% zelf." |
| `percentages`, what percentage | the ratio part : whole (0,25 or 1/4) | "Dat is deel : geheel, nog geen percentage; × 100 geeft het percentage." |
| `percentages`, what percentage | whole : part (or × 100) | "Je hebt het geheel door het deel gedeeld; reken deel : geheel." |
| `percentages`, price change | the change itself | "Dat is de korting zelf; trek die nog af van de prijs." (verhoging: tel op) |
| `percentages`, price change | change in the wrong direction | "Bij korting wordt de prijs lager: trek de korting af." (verhoging: hoger, tel op) |
| `percentages`, back to 100% | p% of the given part | "Je hebt 20% van 14 berekend, maar 14 is zelf al 20%. Reken terug naar 100%." |
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

Ja/Nee steps (prime, divisibility) and property rewrites get no tips: their explanation (§5.4,
§5.6) or rewrite message (§5.11) already names the mistake.

### 3.5 Results

- Score `x / n` and percentage, over first attempts only: repeats (§3.4) do not count. `n` is
  the number of answered exercises (after Stop, fewer than the count). With none answered the
  screen shows "Geen opgaven beantwoord."
- Total time (wall clock, repeats included), and average time per exercise (first attempts)
- A list "Fouten" with one entry per wrong step, each showing the prompt, the user's answer, the
  correct answer and the tip and explanation; a correct step of a two-step exercise is left
  out. These are the first-attempt mistakes, also when a repeat was correct. Without mistakes:
  "Alles goed!"
- Buttons **Opnieuw** (new session with the same set, count and table choice) and **Menu**

### 3.6 Kladblok (scratchpad)

A small scratchpad for remembering intermediate results while playing. It holds short sums and
numbers, separated by spaces (`12×7=84 3,5`), and uses the expression keypad (§6) with `^`
and the breuk key in the place of the parentheses, extended with `,`, `=` and a **spatie** key
in the place of OK.

- **Layout:** 6 cells in a grid of 2 columns and 3 rows, each 48 px high, between the header
  and the prompt. The size is fixed: cells never grow, wrap to more lines or scroll.
- **Short screens:** rows are dropped from the bottom so the keypad does not end up below the
  screen edge: 3 rows from 816 px viewport height, 2 rows (4 cells) from 760 px
  (`max-height: 815px`), and only the top row (2 cells) below that (`max-height: 759px`).
  This is CSS only: a hidden cell cannot be tapped, so it never becomes active. The thresholds
  come from a height estimate (56 px per row) and are checked on a phone.
- **When shown:** for every step that is not Ja/Nee, unless the question is a table exercise
  (topic `tables`, including the tables mixed into other sets). Tables are practised from
  memory.
- **Focus:** tapping a cell makes it active; tapping the answer field, or a fraction slot in
  it, makes the answer field active again. Tapping is the only way to switch. The active
  field has a `--primary` border. Every new step starts with the answer field active.
- **While a cell is active**, the keypad is the kladblok keypad, whatever the answer kind: the
  expression keys with `^` and the breuk key instead of `(` and `)`, plus `,`, `=` and the
  spatie, in 4 columns and 5 rows (the same height as the other keypads, except the
  4-row scientific keypad: there the keypad grows one row while a cell is active). The spatie takes one
  column, has the normal key colour, acts on press like the other keys and is always enabled.
  The kladblok has no parentheses.

  ```
  7  8  9  +
  4  5  6  −
  1  2  3  ×
  ^  0  /  :
  ⌫  ,  =  ␣
  ```

  `/` is the breuk key, drawn as a small stacked fraction as on the fraction keypad.

- **Typing in a cell.** A cell is a list of items separated by single spaces; an item is a
  number or a short sum such as `12×7=84`, `2^3=8`, `−¾+1` or `7/4=1¾`. A number is digits with
  at most one comma (at most 12 characters, as in the answer field); the sign is not counted.
  The breuk key works as in the answer field (§6): it opens an empty fraction with the cursor
  in the numerator, and a second press moves the cursor to the denominator. Digits typed
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
  `1 en 2/3`, as elsewhere. The spatie key shows `␣` and is labelled `spatie`; `=` is labelled
  `is`.
- To make room, keypad keys are 3 rem (48 px) high instead of 3.5 rem.

## 4. Practice sets & session composition

### 4.1 Sets

A set is pure configuration (`lib/sets.ts`). Every set except **Tafels** mixes in 15% table
exercises.

| Set                         | Topics (weight 1 unless stated)                                                   | Tables | Version |
|-----------------------------|-----------------------------------------------------------------------------------|--------|---------|
| **Tafels**                  | `tables`                                                                          | 100%   | v1      |
| **Getallen & delers**       | `lcm`, `gcd`, `prime`, `factorization`, `divisibility`, `squares`                 | 15%    | v1      |
| **Bewerkingen**             | `orderOfOperations`, `properties` (weight 0.5), `smartCalculation`                | 15%    | v1      |
| **Meten**                   | `volume`, `area`, `length`, `mass`, `time`, `numberUnits` (v1); `speed` (v2)      | 15%    | v1 + v2 |
| **Verhoudingen**            | `percentages`, `ratios` (v1); `percentChange`, `scale` (v2)                       | 15%    | v1 + v2 |
| **Getalbegrip**             | `mentalOperations`, `negativeNumbers`, `rounding`, `powersRoots`, `scientificNotation` | 15% | v2   |
| **Breuken & kommagetallen** | `fractionConversion`, `fractionArithmetic`, `decimalArithmetic`                   | 15%    | v2      |
| **Meetkunde**               | `perimeterArea`, `solids`, `pythagoras`, `angles`                                 | 15%    | v2      |
| **Verbanden & statistiek**  | `statistics`, `sequences`, `formulas`, `equations`, `probability`                 | 15%    | v2      |
| **Talstelsels**             | `numberSystems`, `romanNumerals`                                                  | 15%    | v2      |
| **Heuristieken**            | `systematicCounting`, `workingBackwards`, `guessAndCheck`, `simplifyProblem`      | 15%    | v2      |

The v2 sets follow the PABO tests: the RWT (year 1) and the LKT (kennisbasistoets, year 3).
v2 covers mental arithmetic and basic knowledge only; see §12 for the order, the scope and what
moves to v3.

`properties` has weight 0.5 because it is a two-step exercise and takes about 2–3× as long as
the others.

The set overview (§3.1) shows the implemented sets in the build order of §12.1 (Tafels, Meten,
Verhoudingen, Getallen & delers, Bewerkingen, Getalbegrip, Breuken & kommagetallen, …), not in
the order of this table.

### 4.2 Quota algorithm

Given a set and a session size `n`:

1. `tablesCount = Math.round(tablesPercent × n / 100)`. The share is stored as an integer
   percentage to avoid float artefacts: `0.15 × 50` must give exactly 7.5, so it rounds to 8.
   For the Tafels set, `tablesPercent = 100` and `topics` is empty.
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

Table share for each count:

| `n`         | 5 | 10 | 15 | 25 | 50 |
|-------------|---|----|----|----|----|
| tables      | 1 | 2  | 2  | 4  | 8  |

Examples with `n = 15`:

- **Bewerkingen:** `r = 13`, weights 1 / 0.5 / 1, so the shares are 5,2 / 2,6 / 5,2. That gives
  orderOfOperations 5, properties 3 and smartCalculation 5.
- **Getallen & delers:** `r = 13` over 6 topics, so 3 + 2 + 2 + 2 + 2 + 2. The topic with 3 is
  chosen at random.
- **Verhoudingen (v1):** `r = 13` over 2 topics, so 7 + 6.
- **Meten:** `r = 13` over 6 topics, so 3 + 2 + 2 + 2 + 2 + 2. The topic with 3 is chosen at
  random.
- **Getalbegrip:** `r = 13` over 5 topics, so 3 + 3 + 3 + 2 + 2. The topics with 3 are chosen at
  random.
- **Breuken & kommagetallen:** `r = 13` over 3 topics, so 5 + 4 + 4. The topic with 5 is chosen
  at random.

## 5. Topics

All prompts are in Dutch. Ranges are chosen so that everything can be done mentally. Every
topic answers with a number unless stated otherwise.

### 5.1 Multiplication tables (`tables`)

- Factors `a, b ∈ {2, …, 15} \ {10}` (13 values each, 169 combinations)
  - No table of 1, so ×1 never occurs.
  - No table of 10. The exclusion applies to both factors, so `7 × 10` and `70 : 10` never
    occur either.
- **Chosen tables** (Tafels set only, §3.2): at least one factor is a chosen table; the other
  factor is any value of the range. "Tafel van 7" thus covers `7 × 13`, `13 × 7`, `91 : 13`,
  `91 : 7` and the missing-factor forms. The pair `(a, b)` is drawn uniformly from the range and
  redrawn until one factor is chosen, so every allowed pair is equally likely and choosing all
  tables gives exactly the distribution above. With one table chosen there are 25 pairs, enough
  unique keys for 50 exercises across the three forms.
- There are three forms, each picked with equal probability:
  - product: `13 × 7 = ?`
  - division: `91 : 7 = ?`, where the dividend is always `a × b`
  - missing factor: `? × 7 = 91` or `13 × ? = 91`
- Answer: integer.

### 5.2 LCM — KGV (`lcm`)

- Two distinct numbers `a, b ∈ [2, 60]` with `lcm(a, b) ≤ 300`, in random order
- 75% of the pairs share a factor (`gcd(a, b) > 1`), so that simply multiplying them is not
  enough. The other 25% are coprime.
- Prompt: `KGV van 12 en 18 = ?`
- Explanation on error: the prime factorizations of both numbers, then the LCM as the highest
  power of every prime: `12 = 2² × 3 en 18 = 2 × 3² → KGV = 2² × 3² = 36`. A prime is written
  as `13 is priem`.

### 5.3 GCD — GGD (`gcd`)

- 90% of exercises are generated as `a = g·p` and `b = g·q`, with `g ∈ [2, 30]`, `p ≠ q`,
  `gcd(p, q) = 1`, and `a, b ≤ 200`. First `g` is drawn uniformly, then `(p, q)`. `p = 1` is
  allowed, so one number can divide the other.
- 10% of exercises are coprime pairs, whose answer is `1`. Both numbers are composite and lie in
  `[10, 200]`, so the answer does not follow from spotting two primes.
- Prompt: `GGD van 84 en 126 = ?`
- Explanation on error: the prime factorizations of both numbers, then the common prime powers:
  `84 = 2² × 3 × 7 en 126 = 2 × 3² × 7 → GGD = 2 × 3 × 7 = 42`. For a coprime pair it ends in
  `→ geen gemeenschappelijke priemfactor, GGD = 1`.

### 5.4 Prime yes/no (`prime`)

- `n ∈ [11, 199]`. Prompt: `Is 91 een priemgetal?`
- 50% of the numbers are prime and 50% are composite.
- Composites are odd and not divisible by 5. Half of them are also not divisible by 3, which
  makes them the hard ones: 49, 77, 91, 119, 121, 133, 143, 161, 169 and 187. The other half
  are odd multiples of 3 that are not divisible by 5 (21, 27, 33, …, 189).
- Answer: **Ja** / **Nee** buttons.
- Explanation on error:
  - if `n` is composite: its smallest prime factor times the cofactor, e.g. `91 = 7 × 13` or
    `27 = 3 × 9`
  - if `n` is prime: `Geen deler tot en met √151`, with the actual number

### 5.5 Prime factorization (`factorization`)

- Composite `n ∈ [12, 200]` with at least 3 prime factors counted with multiplicity (e.g. 84,
  but not 15)
- Prompt: `Ontbind 84 in priemfactoren`
- Input: an expression containing only integers, `×` and `^` (§6).
- The answer is correct when all of the following hold:
  - every base is prime
  - every exponent is ≥ 1
  - the product equals `n`
  - the order of the factors and the notation are free: `2×2×3×7`, `2^2×3×7` and `7×3×2^2` are
    all correct
- Expected answer shown: the canonical form `2² × 3 × 7`.
- Explanation on error: the division ladder, dividing by the smallest prime each time:
  `84 : 2 = 42, 42 : 2 = 21, 21 : 3 = 7`.

### 5.6 Divisibility rules (`divisibility`)

- Prompt: `Is 2718 deelbaar door 9?`
- Answer: **Ja** / **Nee**.
- Divisors: 2 to 15 without 10, like the tables: `{2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 13, 14, 15}`,
  each equally likely.
- The number of digits is drawn uniformly: 3 to 5 digits (`[100, 99 999]`), but only 3 or 4
  digits (`[100, 9999]`) for 7, 13 and 14, which have no digit rule.
- 50% of the numbers are divisible.
- Non-divisible numbers are close calls, so that guessing does not work. Their remainder modulo
  the divisor comes from this table; where there are two groups, each is picked with equal
  probability:

  | Divisor | Remainders                                  | Close call                               |
  |---------|---------------------------------------------|------------------------------------------|
  | 2       | 1                                           | odd                                      |
  | 3       | 1, 2                                        | digit sum off by 1 or 2                  |
  | 4       | 2                                           | last two digits even, not divisible      |
  | 5       | 1, 2, 3, 4                                  | —                                        |
  | 6       | 2, 4 / 3                                    | even but not by 3 / by 3 but odd         |
  | 7       | 1, 2, 5, 6                                  | off by 1 or 2 from a multiple            |
  | 8       | 2, 4, 6                                     | last three digits even, not divisible    |
  | 9       | 1, 2, 7, 8                                  | digit sum off by 1 or 2                  |
  | 11      | 1, 2, 9, 10                                 | alternating sum off by 1 or 2            |
  | 12      | 4, 8 / 3, 6, 9                              | by 4 but not by 3 / by 3 but not by 4    |
  | 13      | 1, 2, 11, 12                                | off by 1 or 2 from a multiple            |
  | 14      | 2, 4, 6, 8, 10, 12 / 7                      | even but not by 7 / by 7 but odd         |
  | 15      | 5, 10 / 3, 6, 9, 12                         | by 5 but not by 3 / by 3 but not by 5    |

- The explanation shows the rule as it applies to the number:
  - 2 and 5: `Laatste cijfer 8 → deelbaar door 2`
  - 3 and 9: `Cijfersom 2 + 7 + 1 + 8 = 18 → deelbaar door 9`
  - 4: `Laatste twee cijfers 18 → niet deelbaar door 4`; 8: `Laatste drie cijfers 718 → …`
  - 11: `Alternerende som 2 − 7 + 1 − 8 = −12 → niet deelbaar door 11`, starting with `+` at
    the leftmost digit
  - 7 and 13, by chunking (*happen*): one multiple of the divisor per non-zero digit of the
    quotient, then the remainder: `2718 = 2100 + 560 + 56 + rest 2 → niet deelbaar door 7`, or
    `2716 = 2100 + 560 + 56 → deelbaar door 7`
  - 6, 12, 14 and 15 combine the rules of two coprime factors (`2 × 3`, `3 × 4`, `2 × 7`,
    `3 × 5`), and always show both: `Deelbaar door 2 (laatste cijfer 6) en niet deelbaar door 3
    (cijfersom 1 + 2 + 4 + 6 = 13) → niet deelbaar door 6`

### 5.7 Squares & square roots (`squares`)

- There are two forms, each picked with equal probability:
  - `17² = ?` with `n ∈ [2, 25]`
  - `√289 = ?` where the radicand is a perfect square from `2²` up to `25²`
- In 70% of exercises `n ∈ [11, 25]`, because those are the squares worth memorising. The other
  30% have `n ∈ [2, 10]`.
- Explanation on error, the same for both forms: `7² = 7 × 7 = 49` for `n ≤ 10`,
  `20² = 20 × 20 = 400`, and otherwise splitting off the tens:
  `17² = 17 × 10 + 17 × 7 = 170 + 119 = 289`, `23² = 23 × 20 + 23 × 3 = 460 + 69 = 529`.

### 5.8 Order of operations (`orderOfOperations`)

- Expressions are built from these 10 templates (2 to 4 operations, a power counts as one),
  each equally likely:
  - `a + b × c`
  - `a × (b − c) + d`
  - `a − b : c × d`
  - `(a + b)² − c × d`
  - `a² + b × c − d`
  - `a : b + c × (d − e)`
  - `a × b − c : d`
  - `(a − b) × c + d²`
  - `a − (b + c) : d`
  - `a × (b + c²) − d`
- Literals are integers in `[1, 20]`.
- Powers: base `[2, 12]` with exponent 2, or base `[2, 5]` with exponent 3. A power slot (`²`
  above) has exponent 3 in 25% of the exercises. With a negative base, these ranges apply to its
  absolute value.
- Every division is exact, including its intermediate results.
- No trivial parts: a divisor and a quotient have an absolute value of at least 2 (no `x : 1`,
  no `x : x`), no factor of `×` has the value 1 or −1, and no parenthesized part has the
  value 0 (no `(7 − 7)`).
- The power base is spread evenly: per exercise, the exponent (2 or 3) and then the absolute
  value of the base (`[2, 12]` or `[2, 5]`) are drawn first, and the exercise is redrawn until
  its power has exactly that base. Without this, `(a + b)²` would favour large bases.
- The answer is an integer with `|answer| ≤ 500`. Negative answers are allowed.
- Values are drawn at random and the exercise is redrawn (same template) until all of the above
  hold.
- **Negative numbers:** 30% of exercises contain negative literals: 1 or 2 of them (equally
  likely), at random literal positions (never an exponent).
  - In a prompt, a negative literal is always written in parentheses, except when it is the
    first term of the expression or of a parenthesized part, where unary minus is allowed
    (§7): `−7 − (−12)`, `5 × (−3) + 8`, `(−3 + 5) × 2`.
  - A negative power base is always written in parentheses: `(−4)² − 10`. The form `−3²` is
    not generated, because it is a common source of confusion.
- The convention from §8 applies: `×` and `:` have equal priority and are evaluated left to
  right.
- Explanation on error: the evaluation one operation at a time, in the order of §8 (innermost
  parentheses first, then powers, then `×`/`:` from left to right, then `+`/`−` from left to
  right): `3 × (8 − 2) + 4 = 3 × 6 + 4 = 18 + 4 = 22`.

### 5.9 Smart calculation (`smartCalculation`)

These exercises are designed so that a mental strategy makes them fast. The answer is a single
number. The difference from `properties` (§5.11) is that the user only gives the result, not
the rewrite.

| Strategy           | Template                        | Example                   | Explanation shown                  |
|--------------------|---------------------------------|---------------------------|------------------------------------|
| Compensating (+)   | `a + b`, `a` close to round     | `398 + 247`               | `400 + 247 − 2 = 645`              |
| Compensating (−)   | `a − b`, `b` close to round     | `5003 − 2998`             | `5003 − 3000 + 2 = 2005`           |
| Complement         | `1000 − b` or `100 − b`         | `1000 − 463`              | `463 + 537 = 1000`                 |
| Split (×)          | `a × b`, `b ∈ {25, 125, 50}`    | `48 × 25`, `16 × 125`     | `48 : 4 × 100 = 1200`              |
| Double / halve     | `a × b`, one factor ends in 5, the other is even | `35 × 18` | `70 × 9 = 630`                |
| Split (:)          | `a : b`, `b ∈ {4, 5, 8, 25}`    | `72 : 4`, `340 : 5`       | `72 : 2 : 2 = 18`                  |

- "Close to round" means within ±1 to ±3 of a multiple of 10, 100 or 1000.
- Answers are integers in `[1, 10 000]`.
- The six strategies are equally likely. Values per strategy:
  - **Compensating (+):** a magnitude `m ∈ {10, 100, 1000}` (equally likely), a round
    `R = k·m` (`k ∈ [2, 8]` for `m = 10`, otherwise `[1, 8]`) and `a = R ± d` with
    `d ∈ [1, 3]`. `b ∈ [m + 1, min(10m − 1, 10 000 − a)]` and not a multiple of 10, so the
    answer never exceeds 10 000 and no redraw skews the mix of magnitudes. The near-round
    number comes first.
  - **Compensating (−):** `b = R ± d` as above, and `a ∈ [R + m, 10m − 1]`: `a` lies beyond
    the next round number, so the difference is not tiny and the explanation never goes below
    zero. Explanation `a − R + d` or `a − R − d`.
  - **Complement:** `100 − b` with `b ∈ [11, 89]`, or `1000 − b` with `b ∈ [101, 989]`, each
    equally likely; `b` is not a multiple of 10, and the answer is at least 11.
  - **Split (×):** `a × 25` with `a = 4k`, `k ∈ [3, 25]`; `a × 50` with `a = 2k`,
    `k ∈ [6, 50]`; `a × 125` with `a = 8k`, `k ∈ [2, 10]`; `a` is never a multiple of 10
    (`100 × 25` is not smart calculation). Explanations `a : 4 × 100`, `a : 2 × 100` and
    `a : 8 × 1000`.
  - **Double / halve:** `a ∈ {15, 25, …, 75}` and `b = 2h` with `h ∈ [6, 15]`, not a multiple
    of 5. Explanation `2a × h`, which is a table fact times 10: `35 × 18 → 70 × 9`.
  - **Split (:):** quotient `q ∈ [13, 99]` for 4 and 8, `[13, 199]` for 5, `[5, 99]` for 25,
    and `a = b × q`; `q` is not a multiple of 10 (`200 : 4` is not smart calculation).
    Explanations `a : 2 : 2`, `a : 2 : 2 : 2`, `a × 2 : 10` and `a × 4 : 100`.
- The de-duplication key is the sum itself, with the factors of a product in ascending order,
  so the same calculation never appears twice in a session, whichever strategy produced it
  (`12 × 25` and `25 × 12` count as one).

### 5.10 Measurement (`volume`, `area`, `length`, `mass`, `time`)

There is one shared conversion engine (`topics/measurement.ts`) with one topic per dimension.
The exercise is always a conversion, e.g. `3,5 L = ? cm³`. The target unit is also shown as the
input suffix (§6).

| Topic    | Units                                          | Steps                                                  |
|----------|------------------------------------------------|--------------------------------------------------------|
| `volume` | `ml, cl, dl, L, hl` and `mm³, cm³, dm³, m³`    | capacity ×10 (`1 hl = 100 L`); cubic ×1000; links `1 cm³ = 1 ml`, `1 dm³ = 1 L`, `1 m³ = 1000 L` |
| `area`   | `mm², cm², dm², m², are, ha, km²`              | ×100 (`are = dam²`, `ha = hm²`)                        |
| `length` | `mm, cm, dm, m, km`                            | ×10 up to m, then `1 km = 1000 m`                      |
| `mass`   | `mg, g, kg, ton`                               | ×1000                                                  |
| `time`   | `s, min, uur, dag`                             | ×60, ×60, ×24                                          |

Value rules for metric dimensions:

- Unit pairs: any two different units of the dimension whose sizes differ by at most a factor
  10⁶, in both directions. So `m³ ↔ cm³` occurs, `m³ ↔ mm³` (10⁹) does not. Within `volume`,
  capacity and cubic units mix freely, including the factor-1 links `ml ↔ cm³` and `L ↔ dm³`.
- The source value has 1 to 3 significant digits.
- The source value and the answer both lie in `[0,001; 10 000 000]` and have at most 3
  decimals. Because every factor is a power of 10, the answer also has at most 3 significant
  digits.

Value rules for `time`:

- Unit pairs: `s ↔ min`, `min ↔ uur`, `uur ↔ dag`, `s ↔ uur` and `min ↔ dag`, in both
  directions. `s ↔ dag` (factor 86 400) is left out.
- The value in the larger unit is at most 100 and is a whole number, a half, a quarter, or a
  number of tenths such as 0,2 or 0,7 (these four groups equally likely; a group without values
  for the pair, such as tenths for `uur ↔ dag`, is left out). The value in the smaller unit is
  a whole number of at most 10 000. As a result both values have at most 2 decimals, e.g.
  `135 min = 2,25 uur` or `3,5 dag = 84 uur`.
- Prompts never contain mixed notation such as `1 uur 45 min`.

Explanation on error: the conversion fact, followed by the calculation:

- `1 L = 1000 cm³ → 3,5 × 1000 = 3500`
- `1 uur = 60 min → 135 : 60 = 2,25`
- for factor-1 links only the fact: `1 dm³ = 1 L`

General rules:

- Arithmetic is exact (`lib/rational.ts`), with no floats.
- Accepted input:
  - `0,25`, `,25` and `0,250` are all accepted
  - `−` is accepted
  - a leading zero is optional

### 5.11 Properties: commutative, associative, distributive (`properties`)

A two-step exercise:

1. **Rewrite step.** The user enters a rewritten expression, which is validated by the rewrite
   checker (§7).
2. **Result step.** The user enters the numeric result.

- The exercise counts as correct only if both steps are correct.
- If step 1 is wrong, feedback is shown (including an example rewrite), and the user still
  proceeds to step 2.

**Variants**, 50/50 per exercise:

- **Basis:** `Vereenvoudig in één stap: 7 × 98`. The step must be a single valid application of
  the template's *intended* property, i.e. the useful one. A valid step using another property
  is rejected with a hint, e.g. "Geldige stap (commutatief), maar niet handig. Probeer
  distributief."
- **Gevorderd:** `Pas de associatieve eigenschap toe: (17 + 25) + 75`. The named property is
  picked from the properties *applicable* to the expression; it does not have to be the useful
  one. The step must be a single valid application of exactly that property.

**Templates.** In all of them, "round" means a multiple of 10, 100 or 1000.

| Intended property | Template                         | Example                  | Constraint                    |
|-------------------|----------------------------------|--------------------------|-------------------------------|
| distributive      | `a × n`, n close to round        | `7 × 98`, `15 × 99`      | `n = R ± d`, `d ∈ [1,3]`, `a ∈ [3,19]`, `a ≠ n` |
| distributive      | `a × (b + c)`                    | `6 × (40 + 3)`           | `b` round                     |
| distributive      | `a × b + a × c` (factor out)     | `7 × 13 + 7 × 87`        | `b + c` round                 |
| associative       | `(a + b) + c`                    | `(17 + 25) + 75`         | `b + c` round                 |
| associative       | `(a × b) × c`                    | `(13 × 25) × 4`          | `b × c ∈ {100, 1000}`         |
| commutative       | `a + b + c`                      | `38 + 57 + 62`           | `a + c` round                 |
| commutative       | `a × b × c`                      | `25 × 37 × 4`            | `a × c ∈ {100, 1000}`         |

The seven templates are equally likely. Values:

- `a ∈ [3, 19]` without 10 in the three distributive templates; `n = R ± d` with `R` one of
  `20, 30, …, 90, 100, 200, …, 900, 1000` and `d ∈ [1, 3]`; `b ∈ {20, 30, …, 90}` and
  `c ∈ [1, 9]` in `a × (b + c)`.
- The sums that must be round (`b + c` in the factor-out and associative templates, `a + c` in
  the commutative one) are always 100: two numbers in `[11, 89]` that are not multiples of 10.
  The third number is in `[11, 99]` and not a multiple of 10.
- The products that must be round use the pairs `25·4`, `50·2`, `20·5` (100) and `125·8`
  (1000), in either order. The third factor is in `[11, 49]` and not a multiple of 10, so the
  property is worth using (`5 × 3 × 20` is not).
- Only the intended pair is round, so the useful step is unique and Basis never rejects an
  equally handy step: in `a + b + c` and `(a + b) + c` the free number does not end in the
  same digit as either other number (so no other pair adds up to a multiple of 10); in
  `a × b × c` and `(a × b) × c` the free factor times either other factor is not a multiple
  of 100 (so no `2 × 12 × 50` or `(12 × 25) × 4`).
- The de-duplication key is the expression, so the same expression never appears twice in a
  session, not even once as Basis and once as Gevorderd.

Applicable properties (Gevorderd picks one of these, equally likely) and the example rewrite
for each:

| Template          | Commutative            | Associative        | Distributive             |
|-------------------|------------------------|--------------------|--------------------------|
| `a × n`           | `n × a`                | —                  | `a × R − a × d` (or `+`) |
| `a × (b + c)`     | `(b + c) × a`          | —                  | `a × b + a × c`          |
| `a × b + a × c`   | `a × c + a × b`        | —                  | `a × (b + c)`            |
| `(a + b) + c`     | `c + (a + b)`          | `a + (b + c)`      | —                        |
| `(a × b) × c`     | `c × (a × b)`          | `a × (b × c)`      | —                        |
| `a + b + c`       | `a + c + b`            | `a + (b + c)`      | —                        |
| `a × b × c`       | `a × c × b`            | `a × (b × c)`      | —                        |

Example rewrites of the intended property, for instance:

- `7 × 100 − 7 × 2`
- `17 + (25 + 75)`
- `38 + 62 + 57`
- `25 × 4 × 37`

Feedback:

- **Step 1** is an `expression` step. The correct answer shown is the example rewrite of the
  asked property (Basis: the intended one). The explanation is the reason from the rewrite
  checker (§7.1):
  - only a number: "Schrijf een som op, niet alleen de uitkomst."
  - the same expression, or parentheses that do not change the order of evaluation
    (`(17 + 25) + 75` → `17 + 25 + 75`): "Er is niets veranderd."
  - another value: "Deze stap verandert de uitkomst."
  - only a number written differently (`7 × (100 − 2)`), or only a part worked out
    (`6 × (40 + 3)` → `6 × 43`): "Hier is nog geen eigenschap toegepast."
  - more than one step: "Dit zijn meerdere stappen: pas één eigenschap per keer toe."
  - reordering `−` or `:`: "Deze eigenschap geldt niet voor − en :."
  - a valid step with another property: "Geldige stap (commutatief), maar niet handig. Probeer
    distributief." (Basis) or "Geldige stap (commutatief), maar gevraagd is associatief."
    (Gevorderd)
- **Step 2** is a number step with the prompt `7 × 98 = ?`. Its explanation is the evaluation
  of the intended rewrite, one operation at a time as in §5.8:
  `7 × 100 − 7 × 2 = 700 − 7 × 2 = 700 − 14 = 686`.

### 5.12 Percentages (`percentages`)

There are four forms, each picked with equal probability:

| Form                | Example                                   | Answer |
|---------------------|-------------------------------------------|--------|
| Part of a whole     | `15% van 80 = ?`                          | 12     |
| What percentage     | `30 is ?% van 120`                        | 25     |
| Discount / increase | `€ 60 na 25% korting = ?`, `€ 40 na 15% verhoging = ?` | 45, 46 |
| Back to 100%        | `20% is 14. Hoeveel is 100%?`             | 70     |

- `p ∈ {1, 2, 5, 10, 12½, 15, 20, 25, 30, 40, 50, 60, 75, 80, 90, 120, 150}`
  - `12½` is written as a mixed number in prompts: `12` followed by a stacked `½` (§8).
  - Discount uses only `p < 100`; increase uses only `p ≤ 50`.
- The whole (the 100% amount, or the price) is an integer in `[10, 1000]` with at most 2
  significant digits: `85`, `470` and `1000`, but not `487`.
- Answers have at most 2 decimals. Per form:
  - **Part of a whole** and **discount / increase:** 80% of the answers are integers.
  - **What percentage:** the part and the whole are integers. The answer is `p`, so it is an
    integer except for `12½`. This form uses the `fraction` answer kind (§6): `12,5`, `25/2`
    and `12 1/2` are all correct, and so is any other equal value. The expected answer is the
    mixed number `12 1/2` (§8). All exercises of this form
    use it, so the breuk key does not give away the answer.
  - **Back to 100%:** the answer is the whole, so it is always an integer. In 80% of the
    exercises the given part is an integer as well; otherwise it has 1 or 2 decimals, e.g.
    `15% is 4,5. Hoeveel is 100%?`.
- Money (discount / increase): the prompt reads `€ 60 na 25% korting = ?`, `€` is the input
  prefix (§6), and the correct answer is shown with 2 decimals when it is not whole (`25,50`).
- Explanation on error: a strategy via 1%, 10% or a simple base percentage. Each `p` has a fixed
  base: `1%` for 1 and 2, `5%` for 5 and 15, `10%` for 10, 20, 30, 40, 60, 80, 90 and 120,
  `12½%`, `25%` for 25 and 75, and `50%` for 50 and 150.
  - Part of a whole: `10% = 80 : 10 = 8 → 30% = 3 × 8 = 24`, `25% = 80 : 4 = 20`. 5% and 15%
    go via 10%: `10% = 8, 5% = 4 → 15% = 12`.
  - Discount / increase: the same, followed by the price step:
    `25% = 60 : 4 = 15 → 60 − 15 = 45`, `10% = 4, 5% = 2 → 15% = 6 → 40 + 6 = 46`.
  - What percentage: the part-of-a-whole explanation for the answer, e.g.
    `25% = 120 : 4 = 30`.
  - Back to 100%: from the part via the base: `20% = 14 → 10% = 7 → 100% = 10 × 7 = 70`, or
    `25% = 14 → 100% = 4 × 14 = 56`.

### 5.13 Ratios (`ratios`)

There are three forms, each picked with equal probability:

| Form               | Example                                                         | Answer |
|--------------------|-----------------------------------------------------------------|--------|
| Missing term       | `3 : 5 = 12 : ?`                                                | 20     |
| Scaling            | `Voor 4 personen: 300 g pasta. Hoeveel g voor 6 personen?`      | 450    |
| Dividing in ratio  | `Verdeel 60 in de verhouding 2 : 3. Hoe groot is het grootste deel?` | 36 |

- Answers are integers. The given ratio has terms in `[1, 12]`.
- **Missing term:** a simplified ratio `p : q` with `p ≠ q`. The left side is `m × (p : q)` with
  terms ≤ 12, so it need not be simplified (`4 : 6 = 10 : ?`). The right side is
  `n × (p : q)` with `n ≠ m` and terms ≤ 100. The unknown is in any of the four positions, each
  equally likely.
- **Scaling:** counts `a ≠ b` in `[2, 12]`. There are three contexts: pasta (g) and milk (ml)
  for a number of people, and the price of notebooks (`€`, input prefix). The amount has at
  most 2 significant digits and is at most 1000 (at most `€ 100` for prices). The amount for
  `gcd(a, b)` is an integer, and the answer is at most 2000.
- **Dividing in ratio:** a simplified ratio `a : b` with `a ≠ b`, terms in `[1, 12]`. The total
  is `(a + b) × k` with `k ≥ 2` and is at most 500. The exercise asks for the largest or the
  smallest part, each equally likely.
- Explanation on error:
  - missing term: `3 : 5 = 12 : 20 (× 4)`, `12 : 20 = 3 : 5 (: 4)` or `4 : 6 = 2 : 3 = 10 : 15`
  - scaling: a ratio table via `gcd(a, b)`, e.g. `4 → 300, 2 → 150, 6 → 450`, or
    `4 → 300, 8 → 600`
  - dividing: `2 + 3 = 5 delen → 1 deel = 60 : 5 = 12 → 3 delen = 36`

### 5.14 Large numbers (`numberUnits`)

Part of the set Meten. The names of large numbers and their powers of 10, following the Dutch
**long scale**:

| Name          | Value | Name          | Value |
|---------------|-------|---------------|-------|
| `duizend`     | 10³   | `biljard`     | 10¹⁵  |
| `miljoen`     | 10⁶   | `triljoen`    | 10¹⁸  |
| `miljard`     | 10⁹   | `triljard`    | 10²¹  |
| `biljoen`     | 10¹²  | `quadriljoen` | 10²⁴  |

- Note: `biljoen` is 10¹², not 10⁹ (the English *billion* is a `miljard`).
- `tien` and `honderd` are not used; the topic starts at `duizend`.
- Large numbers are never written out with all their zeros. A prompt uses a power of 10
  instead, e.g. `2,5 × 10⁹`.

There are three forms, each picked with equal probability:

| Form           | Example                                    | Answer |
|----------------|--------------------------------------------|--------|
| Name → power   | `1 biljard = 10ⁿ. n = ?`                   | 15     |
|                | `250 miljoen = 2,5 × 10ⁿ. n = ?`           | 8      |
| Name ↔ name    | `3,5 biljoen = ? miljard`                  | 3500   |
| Power → name   | `2,5 × 10⁹ = ? miljoen`                    | 2500   |

- **Name → power:** in 40% of these the value is 1. Otherwise it is an integer in `[1, 999]`
  with 1 to 3 significant digits. The right-hand side writes the value in scientific notation
  `c × 10ⁿ` with `c ∈ [1, 10)`; for the value 1 it is just `10ⁿ`.
- **Name ↔ name:** only neighbouring names (factor 1000), in both directions. The source value
  has 1 to 3 significant digits; the source value and the answer lie in `[0,001; 100 000]` with
  at most 3 decimals. This is stricter than §5.10, so a prompt never shows something like
  `3 000 000 duizend`.
- **Power → name:** `c ∈ [1, 10)` with 1 to 3 significant digits (`c = 1` is written as just
  `10⁹`), the exponent is at least 3, and the answer lies in `[0,001; 100 000]` with at most 3
  decimals.
- Explanation on error:
  - name → power: `1 miljard = 1000 miljoen = 10⁹`, `1 duizend = 1000 = 10³`,
    `250 miljoen = 2,5 × 10² × 10⁶ = 2,5 × 10⁸`, `7 miljard = 7 × 10⁹`
  - name ↔ name: as in §5.10, `1 biljoen = 1000 miljard → 3,5 × 1000 = 3500`
  - power → name: `10⁹ = 1000 miljoen → 2,5 × 1000 = 2500`, or `10⁵ = 0,1 miljoen → 2,5 × 0,1 = 0,25`

### 5.15 Mental operations with larger numbers (`mentalOperations`)

Part of the set Getalbegrip. The four operations on larger whole numbers, the way they are done
mentally: adding in steps (*rijgen*), computing with zeros, and dividing with a remainder in a
context. Tricks such as compensating or splitting `× 25` belong to `smartCalculation` (§5.9) and
are left out here.

There are four forms, each picked with equal probability:

| Form              | Example                                                                   | Answer |
|-------------------|---------------------------------------------------------------------------|--------|
| Add / subtract    | `6347 + 2800 = ?`, `15 213 − 470 = ?`                                     | 9147, 14 743 |
| Multiply by zeros | `28 × 500 = ?`, `60 × 700 = ?`                                            | 14 000, 42 000 |
| Divide by zeros   | `7200 : 80 = ?`, `4800 : 6 = ?`                                           | 90, 800 |
| Remainder         | `230 leerlingen gaan met busjes van 8 plaatsen. Hoeveel busjes zijn er nodig?` | 29 |

- **Add / subtract** (each 50%): `a ∈ [1000, 99 999]`, and `b` has exactly 2 significant digits
  followed by 1 or 2 zeros (`b ∈ [110, 9900]`, e.g. `2800`, `470`). The sum needs at least one
  carry, the difference at least one borrow, so no column can be done on its own. The
  difference is positive.
  - Explanation: add the significant digits of `b` one at a time, largest first:
    `6347 + 2000 = 8347 → 8347 + 800 = 9147`, `15 213 − 400 = 14 813 → 14 813 − 70 = 14 743`.
- **Multiply by zeros:** `a = p × 10ⁱ` and `b = q × 10ʲ` with `p ∈ [2, 99]` not a multiple of 10,
  `q ∈ [2, 9]`, `i + j ∈ [1, 4]` and the product at most 1 000 000. The two factors appear in
  random order. Products that look like §5.9 are left out: `25`, `50` or `125` times a factor
  that is not a multiple of 10 (`27 × 50` too, although §5.9 only makes even ones).
  - Explanation: the table fact, then the zeros: `28 × 5 = 140 → 28 × 500 = 140 × 100 = 14 000`.
- **Divide by zeros:** the quotient is `p × 10ⁱ` and the divisor `q × 10ʲ`, with
  `p, q ∈ [2, 12] \ {10}`, `i + j ∈ [1, 4]` and the dividend at most 1 000 000. Because `i + j ≥ 1`,
  §5.9 never generates the same division (its quotients are no multiples of 10).
  - Explanation: when the divisor ends in zeros, strike equal zeros first:
    `7200 : 80 = 720 : 8 = 90`, `36 000 : 900 = 360 : 9 = 40`. Otherwise the table fact, then the
    zeros: `48 : 6 = 8 → 4800 : 6 = 800`.
- **Remainder:** a division `N = q × d + r` with `q ∈ [3, 40]`, `r ∈ [1, d − 1]` and `N ≤ 1000`,
  in a context. The question is one of three, each equally likely, and the context is picked
  among those that ask it:

  | Context  | Prompt                                                                    | Asks | `d` | Suffix |
  |----------|---------------------------------------------------------------------------|------|-----|--------|
  | busjes   | `230 leerlingen gaan met busjes van 8 plaatsen. Hoeveel busjes zijn er nodig?` | up | `[6, 50]` | `busjes` |
  | tafels   | `Aan een tafel passen 6 gasten. Hoeveel tafels zijn er nodig voor 75 gasten?` | up | `[4, 12]` | `tafels` |
  | dozen    | `In een doos passen 12 eieren. Hoeveel volle dozen maak je van 200 eieren?` | down | `[6, 30]` | `dozen` |
  | dozen    | `In een doos passen 12 eieren. Je vult zoveel mogelijk dozen met 200 eieren. Hoeveel eieren houd je over?` | rest | `[6, 30]` | `eieren` |
  | kaartjes | `Een kaartje kost € 7. Hoeveel kaartjes koop je voor € 100?`               | down | `[3, 25]` | `kaartjes` |
  | kaartjes | `Een kaartje kost € 7. Je koopt zoveel mogelijk kaartjes voor € 100. Hoeveel geld houd je over?` | rest | `[3, 25]` | prefix `€` |

  - The answer is `q + 1` (up), `q` (down) or `r` (rest).
  - Explanation: the division with its remainder, then the conclusion:
    `230 : 8 = 28 rest 6 → 29 busjes`, `200 : 12 = 16 rest 8 → 16 dozen`,
    `200 = 16 × 12 + 8 → 8 eieren over`, `100 = 14 × 7 + 2 → € 2 over`.
- Answers are whole numbers. The de-duplication key is the calculation itself, with the factors
  of a product in ascending order, as in §5.9; for the remainder form it is context, question,
  `N` and `d`.

### 5.16 Negative numbers (`negativeNumbers`)

Part of the set Getalbegrip. The minus sign is typed with the `−` key of the number keypad (§6),
which toggles the sign of the whole number.

There are three forms, each picked with equal probability:

| Form             | Example                                                               | Answer |
|------------------|-----------------------------------------------------------------------|--------|
| Add / subtract   | `−4 − (−6) = ?`, `3 − 8 = ?`, `−7 + 12 = ?`                           | 2, −5, 5 |
| Multiply / divide | `−6 × 4 = ?`, `−24 : (−3) = ?`                                       | −24, 8 |
| Temperature      | `Het is −5 °C. Het wordt 8 graden warmer. Hoeveel graden is het dan?` | 3 |

- Negative literals are written as in §5.8: in parentheses, except as the first term.
- **Add / subtract** (each 50%): `a, b ∈ [−20, 20] \ {0}`. At least one of `a`, `b` or the answer
  is negative, so `5 + 7` never occurs. The answer is not 0.
- **Multiply / divide** (each 50%): `|x|, |y| ∈ [2, 12]` with at least one of them negative. A
  division is written as `(x × y) : y`, so it is always exact.
- **Temperature** (each 50%):
  - *change:* a start temperature in `[−15, 15]`, `n ∈ [2, 20]` degrees `warmer` or `kouder`,
    the result in `[−20, 25]`. The start or the result is below zero. Suffix `°C`.
  - *difference:* `'s Nachts is het −7 °C, overdag 4 °C. Hoeveel graden is het verschil?` Night
    in `[−20, 5]`, day in `[−10, 30]`, the night colder than the day and at least one of them
    below zero. Suffix `graden`.
- Explanations:
  - subtracting a negative number: `−4 − (−6) = −4 + 6 = 2`; adding one:
    `5 + (−8) = 5 − 8 = −3`
  - crossing zero, split at zero: `3 − 8 = 3 − 3 − 5 = −5`, `−7 + 12 = −7 + 7 + 5 = 5`
  - otherwise the sum itself: `−4 − 6 = −10`
  - multiply / divide: the sum without signs, then the sign rule:
    `6 × 4 = 24; één negatief getal → −24`, `24 : 3 = 8; twee negatieve getallen → 8`
  - temperature: the sum with the explanation above, e.g. `−5 + 8 = −5 + 5 + 3 = 3`, and for the
    difference `4 − (−7) = 4 + 7 = 11`

### 5.17 Rounding (`rounding`)

Part of the set Getalbegrip. Rounding follows the Dutch school rule: the first digit that is
dropped decides; 5 or more rounds up, less than 5 rounds down. Only positive numbers occur.

Prompt: `Rond 4386 af op honderdtallen`, `Rond 3,746 af op 1 decimaal`. Seven places, each
equally likely:

| Place          | Prompt ends in          | Source number                                | Example            |
|----------------|-------------------------|----------------------------------------------|--------------------|
| tens           | `op tientallen`         | `[101, 9999]`                                | `4386 → 4390`      |
| hundreds       | `op honderdtallen`      | `[1001, 99 999]`                             | `4386 → 4400`      |
| thousands      | `op duizendtallen`      | `[10 001, 999 999]`                          | `48 512 → 49 000`  |
| millions       | `op miljoenen`          | `[1 000 001, 99 999 999]`                    | `2 456 789 → 2 000 000` |
| whole number   | `op een heel getal`     | `(0, 1000)` with 1 or 2 decimals             | `12,5 → 13`        |
| 1 decimal      | `op 1 decimaal`         | `(0, 100)` with 2 or 3 decimals              | `3,746 → 3,7`      |
| 2 decimals     | `op 2 decimalen`        | `(0, 100)` with 3 decimals                   | `0,385 → 0,39`     |

- The source number is never already rounded: at least one dropped digit is not 0. The answer is
  never 0.
- The first dropped digit is 5 in at least 20% of the exercises (the rule's edge case). In at
  least another 15%,
  rounding up carries over a 9 (`3970 → 4000` on hundreds, `2,96 → 3,0` on 1 decimal).
- The answer is the full number (`2 000 000`, not `2 miljoen`). Any equal value is correct, so
  `3` counts for `3,0`; the expected answer is shown with the asked number of decimals (`3,0`).
- Explanation: the two neighbours, the decisive digit and the result:
  `4386 ligt tussen 4300 en 4400; het eerste cijfer dat wegvalt is 8 → 4400`,
  `3,746 ligt tussen 3,7 en 3,8; het eerste cijfer dat wegvalt is 4 → 3,7`.

### 5.18 Powers and roots (`powersRoots`)

Part of the set Getalbegrip. Extends `squares` (§5.7), which stays in Getallen & delers. The
scaled roots below can overlap with it (`√400 = 20`); that is fine, the topics are in different
sets.

There are four forms, each picked with equal probability:

| Form              | Example                                | Answer |
|-------------------|----------------------------------------|--------|
| Whole-number power | `2⁵ = ?`, `(−3)³ = ?`, `7⁰ = ?`       | 32, −27, 1 |
| Decimal power     | `0,3² = ?`, `0,2³ = ?`, `1,5² = ?`     | 0,09, 0,008, 2,25 |
| Negative exponent | `10⁻³ = ?`, `0,001 = 10ⁿ. n = ?`       | 0,001, −3 |
| Root              | `∛64 = ?`, `√0,49 = ?`, `√6400 = ?`    | 4, 0,7, 80 |

- **Whole-number power:**
  - 70%: a positive base with exponent ≥ 3: base 2 with exponent `[3, 10]`, 3 with `[3, 5]`, 4
    and 5 with `[3, 4]`, 6 to 9 with 3, and 10 with `[3, 6]`. The (base, exponent) pair is drawn
    uniformly from these 23 pairs.
  - 20%: a negative base `(−b)ⁿ` with `b ∈ [2, 5]`, `n ∈ [2, 4]` and `bⁿ ≤ 125`: 10 pairs, from
    `(−2)²` to `(−5)³`. The base is always written in parentheses (§5.8).
  - 10%: exponent 0 or 1 with a base in `[2, 20]`.
- **Decimal power:** a base `0,1` to `0,9` with exponent 2 or 3, a base `0,01` to `0,09` with
  exponent 2, or a base `1,1`, `1,2`, `1,5`, `2,5` or `3,5` with exponent 2. Each of these three
  groups is equally likely.
- **Negative exponent:** base 10 only, `n ∈ [1, 6]`. Two questions, each 50%: `10⁻ⁿ = ?` with a
  decimal answer, or `0,001 = 10ⁿ. n = ?` with a negative whole-number answer. Negative
  exponents with other bases (`2⁻³ = 1/8`) are left out; *Breuken & kommagetallen* does not add
  them either.
- **Root** (each 50%):
  - cube root `∛n³` with `n ∈ [2, 10]`
  - square root of a scaled square: `√m²` with `m = k : 10` or `m = k × 10` and
    `k ∈ [2, 15] \ {10}`, so `√0,49`, `√1,44`, `√6400` and `√14 400`
- Explanations:
  - `2⁵ = 2 × 2 × 2 × 2 × 2 = 32`, `(−3)³ = (−3) × (−3) × (−3) = −27`
  - `7⁰ = 1: elk getal (behalve 0) tot de macht 0 is 1`, `7¹ = 7`
  - `0,3² = 0,3 × 0,3 = 0,09`
  - `10⁻³ = 1 : 10³ = 1 : 1000 = 0,001`, and for the exponent question
    `0,001 = 1 : 1000 = 1 : 10³ = 10⁻³`
  - `∛64 = 4, want 4 × 4 × 4 = 64`, `√0,49 = 0,7, want 0,7 × 0,7 = 0,49`
- The exponent question skips the factor-of-ten tip, like §5.14.

### 5.19 Scientific notation (`scientificNotation`)

Part of the set Getalbegrip. A number in scientific notation is `c × 10ⁿ` with `1 ≤ c < 10`.
Large numbers with names (`miljard`) stay in `numberUnits` (§5.14).

There are three forms, each picked with equal probability:

| Form             | Prompt                                             | Answer        | Answer kind |
|------------------|----------------------------------------------------|---------------|-------------|
| To notation      | `Schrijf in wetenschappelijke notatie: 4 500 000`  | `4,5 × 10⁶`   | `scientific` |
| To number        | `4,5 × 10⁻³ = ?`                                   | `0,0045`      | `number`    |
| Normalise        | `Schrijf in wetenschappelijke notatie: 450 × 10⁴`  | `4,5 × 10⁶`   | `scientific` |

- `c` has 1 to 3 significant digits. `c = 1` occurs; a prompt then writes just `10⁶` (as in
  §5.14), and the expected answer is `1 × 10⁶`. The exponent `n ∈ [−6, −1] ∪ [2, 9]`, so a written-out number has at most 10 digits
  (`3 210 000 000`, `0,00000125`).
- **Normalise:** the prompt shows `m × 10ᵏ` with `m = c × 10ˢ`, `s ∈ {−2, −1, 1, 2, 3}` and
  `k ≠ 0`, e.g. `450 × 10⁴` or `0,3 × 10⁻²`. The result exponent `n = k + s` is in the range
  above.
- **Judging a `scientific` answer:** correct when the value is equal **and** the form is
  `c × 10ⁿ` with `1 ≤ c < 10`. `10⁶` alone counts as `1 × 10⁶`. Trailing zeros in `c` are
  allowed (`4,50 × 10⁶`). An equal value in another form (`45 × 10⁵`, `4500000`) is wrong and
  gets a tip (§3.4.1).
- The expected answer is shown as `4,5 × 10⁶`.
- Explanations:
  - to notation: `4 500 000 = 4,5 × 1 000 000 = 4,5 × 10⁶`,
    `0,000045 = 4,5 × 0,00001 = 4,5 × 10⁻⁵`
  - to number: `4,5 × 10⁻³ = 4,5 × 0,001 = 0,0045`
  - normalise: `450 × 10⁴ = 4,5 × 10² × 10⁴ = 4,5 × 10⁶`,
    `0,3 × 10⁻² = 3 × 10⁻¹ × 10⁻² = 3 × 10⁻³`

### 5.20 Fraction conversion (`fractionConversion`)

Part of the set Breuken & kommagetallen. Converting between fraction, decimal and percentage, for
the fractions that are worth knowing by heart.

- **Fractions:** `p/q` in lowest terms with `0 < p < q` and `q ∈ {2, 4, 5, 8, 10, 20, 25, 50}`.
  Fraction ↔ percentage also uses `q ∈ {3, 6}`: `1/3`, `2/3`, `1/6` and `5/6`
  (`33 1/3%`, `66 2/3%`, `16 2/3%`, `83 1/3%`). `q` is drawn uniformly, then `p`.

There are six directions, each picked with equal probability:

| Direction             | Prompt                          | Answer   | Answer kind |
|-----------------------|---------------------------------|----------|-------------|
| fraction → decimal    | `Schrijf als kommagetal: 3/8`   | `0,375`  | number      |
| decimal → fraction    | `Schrijf als breuk: 0,375`      | `3/8`    | fraction, simplest form, no decimal |
| fraction → percentage | `3/8 = ?%`                      | `37,5`   | fraction, any equal value |
| percentage → fraction | `Schrijf als breuk: 37,5%`      | `3/8`    | fraction, simplest form, no decimal |
| decimal → percentage  | `0,375 = ?%`                    | `37,5`   | number      |
| percentage → decimal  | `Schrijf als kommagetal: 37,5%` | `0,375`  | number      |

- A percentage prompt uses a decimal comma (`37,5%`), or a mixed number for thirds and sixths
  (`33 1/3%`, drawn stacked). The `%` answers have the suffix `%`.
- Fraction → percentage always uses the fraction keypad, as in §5.12, so the breuk key does not
  give away the thirds. Any equal value is correct (`37,5`, `75/2`); the expected answer is
  `37,5` or `33 1/3`.
- Explanations:
  - fraction → decimal, via the smallest power of ten the denominator divides:
    `3/8 = 375/1000 = 0,375`, `7/20 = 35/100 = 0,35`
  - decimal → fraction, the other way round: `0,375 = 375/1000 = 3/8`, `0,7 = 7/10`
  - fraction → percentage: `3/8 = 0,375 = 37,5%`; thirds and sixths via 100%:
    `1/3 = 100% : 3 = 33 1/3%`, `5/6 = 5 × 16 2/3% = 83 1/3%`
  - percentage → fraction: `37,5% = 0,375 = 375/1000 = 3/8`, `33 1/3% = 100% : 3 = 1/3`,
    `66 2/3% = 2 × 33 1/3% = 2/3`
  - decimal → percentage: `0,375 = 0,375 × 100% = 37,5%`
  - percentage → decimal: `37,5% = 37,5 : 100 = 0,375`
- The de-duplication key is the direction and the fraction.

### 5.21 Fraction arithmetic (`fractionArithmetic`)

Part of the set Breuken & kommagetallen. A **proper fraction** below is `p/q` in lowest terms
with `0 < p < q` and `q ∈ [2, 12]`.

There are four groups, each picked with equal probability, with two forms each (50% each,
unless stated otherwise):

| Group                 | Form              | Example                               | Answer          | Answer kind |
|-----------------------|-------------------|---------------------------------------|-----------------|-------------|
| Simplify, equivalent  | simplify          | `Vereenvoudig 18/24`                  | `3/4`           | fraction, simplest form, no decimal |
|                       | equivalent        | `3/4 = ?/12`                          | `9`             | number      |
| Add, subtract         | add / subtract    | `2/3 + 1/4 = ?`, `3 1/2 − 1 3/4 = ?`  | `11/12`, `1 3/4` | fraction, simplest form, decimal allowed |
| Multiply, divide      | multiply / divide | `3/4 × 2/5 = ?`, `2/3 : 4/9 = ?`      | `3/10`, `1 1/2` | fraction, simplest form, decimal allowed |
| Part of a number      | part              | `3/4 van 24 = ?`                      | `18`            | number      |
|                       | back to the whole | `3/4 is 18. Hoeveel is het geheel?`   | `24`            | number      |

- **Simplify:** the answer `p/q` is in lowest terms with `q ∈ [2, 12]`: a proper fraction in
  80%, and an improper one with `q < p < 2q` in 20% (`Vereenvoudig 15/12` → `5/4` or `1 1/4`).
  The prompt multiplies both by `k ∈ [2, 10]`, with both terms at most 100.
  - Explanation: `18/24 = 3/4 (teller en noemer : 6)`, improper: `15/12 = 5/4 = 1 1/4 (teller
    en noemer : 3)`.
- **Equivalent:** a proper fraction `p/q` and `kp/kq` with `k ∈ [2, 10]` and `kq ≤ 100`. Four
  variants, each equally likely: `3/4 = ?/12`, `3/4 = 9/?`, `9/12 = ?/4` and `9/12 = 3/?`. The
  `?` is drawn as a slot of the stacked fraction (§8).
  - Explanation: `3/4 = 9/12 (teller en noemer × 3)`, `9/12 = 3/4 (teller en noemer : 3)`.
- **Add / subtract** (each 50%): two proper fractions with different denominators whose LCM is at
  most 36. In 30% both terms are mixed numbers with whole parts in `[1, 5]`. A difference is
  positive; with mixed numbers the first whole part is larger than the second.
  - Explanation: make the denominators equal (the LCM), then add, simplify and take out the
    wholes as needed: `2/3 + 1/4 = 8/12 + 3/12 = 11/12`, `1/6 + 1/3 = 1/6 + 2/6 = 3/6 = 1/2`,
    `2/3 + 3/4 = 8/12 + 9/12 = 17/12 = 1 5/12`. Mixed numbers keep their wholes:
    `2 2/3 + 1 3/4 = 2 8/12 + 1 9/12 = 3 17/12 = 4 5/12`, and a subtraction that needs it
    exchanges one whole: `3 1/2 − 1 3/4 = 3 2/4 − 1 3/4 = 2 6/4 − 1 3/4 = 1 3/4`.
- **Multiply / divide** (each 50%):
  - multiply: two proper fractions (60%, `3/4 × 2/5`), or a whole number `n ∈ [2, 12]` and a
    proper fraction in either order (40%, `6 × 2/3`)
  - divide: two different proper fractions (60%, `2/3 : 4/9`), a proper fraction by a whole
    number `n ∈ [2, 12]` (20%, `3/4 : 3`), or a whole number by a proper fraction (20%,
    `6 : 2/3`)
  - Explanation: numerator times numerator and denominator times denominator; dividing is
    multiplying by the inverse. Simplify and take out the wholes at the end:
    `3/4 × 2/5 = 6/20 = 3/10`, `6 × 2/3 = 12/3 = 4`, `2/3 : 4/9 = 2/3 × 9/4 = 18/12 = 3/2 = 1 1/2`,
    `3/4 : 3 = 3/4 × 1/3 = 3/12 = 1/4`, `6 : 2/3 = 6 × 3/2 = 18/2 = 9`.
- **Part of a number:** a proper fraction `p/q` and a whole `N = q × m` with `m ∈ [2, 12]`.
  - part: `3/4 van 24 = ?`, answer `p × m`. Explanation: `1/4 van 24 = 24 : 4 = 6 → 3/4 = 3 × 6
    = 18` (for `p = 1` only the first part).
  - back to the whole: `3/4 is 18. Hoeveel is het geheel?`, answer `N`. Explanation:
    `3/4 = 18 → 1/4 = 18 : 3 = 6 → 4/4 = 4 × 6 = 24`, or `1/4 = 6 → 4/4 = 4 × 6 = 24`.
- Fraction answers may be improper or whole (`6 × 2/3 = 4`); see §6 for what counts as the
  simplest form. The de-duplication key is the form and its numbers.

### 5.22 Decimal arithmetic (`decimalArithmetic`)

Part of the set Breuken & kommagetallen. The four operations with decimals, the way they are done
mentally.

There are three forms, each picked with equal probability:

| Form             | Example                                    | Answer        |
|------------------|--------------------------------------------|---------------|
| Add / subtract   | `4,7 + 0,35 = ?`, `5 − 0,25 = ?`           | 5,05, 4,75    |
| Multiply         | `0,3 × 0,4 = ?`, `0,25 × 8 = ?`            | 0,12, 2       |
| Divide           | `2,5 : 0,05 = ?`, `0,36 : 4 = ?`           | 50, 0,09      |

- **Add / subtract** (each 50%): two positive numbers below 100 with 0 to 2 decimals and at most
  3 significant digits, written without trailing zeros. Their numbers of decimals differ, so the
  commas must be aligned. The sum is below 100; the difference is positive.
  - Explanation: the commas aligned with trailing zeros: `4,70 + 0,35 = 5,05`,
    `5,00 − 0,25 = 4,75`.
- **Multiply:** `p × 10⁻ⁱ` and `q × 10⁻ʲ` with `p ∈ {2, …, 9, 11, 12, 15, 25}`, `q ∈ [2, 9]`,
  `i, j ∈ [0, 2]` and `i + j ∈ [1, 3]`, in random order.
  - Explanation: the product without commas, then the decimals:
    `3 × 4 = 12; 1 + 1 = 2 decimalen → 0,12`, `25 × 4 = 100; 2 + 0 = 2 decimalen → 1`,
    `7 × 6 = 42; 0 + 1 = 1 decimaal → 4,2`.
- **Divide:** the quotient `p × 10ˢ` and the divisor `q × 10ᵗ` with `p, q ∈ [2, 12] \ {10}`,
  `s ∈ [−2, 1]` and `t ∈ [−2, 0]`. The dividend is their product. The dividend or the divisor
  is not whole; dividend, divisor and quotient have at most 3 decimals, and the dividend is
  below 1000.
  - Explanation: a decimal divisor is made whole first, `2,5 : 0,05 = 250 : 5 = 50 (beide
    × 100)`; with a whole divisor, the table fact, then the comma: `36 : 4 = 9 → 0,36 : 4 = 0,09`.
- The de-duplication key is the calculation, with the factors of a product in ascending order.

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

- Every answer kind has its own input model: keys, key reducer, validation and display.
- The input field shows a pretty-printed version as you type: `×`, `:`, and `^2` rendered as
  a superscript. The feedback and the results show the given answer the same way.
- `OK` is disabled only while the input is empty.
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
  keys are left out, and `−` is always the operator. It, the scientific keypad and the kladblok
  keypad (§3.6) are the only keypads with 4 columns; all other keypads keep 3. Five rows, the same height as the other
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
  the expression keypad, but four rows, because it has fewer keys. The keypad is therefore one row lower than
  the others and the prompt sits a little lower; empty grid cells to keep five rows are not
  worth it:

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
- Units are shown next to the input field, and the user never types them. `€` is a fixed
  prefix (`€ 45`); other units (`%`, `cm³`, …) are a fixed suffix.
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

`checkRewrite(original, rewritten, property | 'any') → { valid, detected: Property[], reason }`

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
5. If the required property is among the detected ones (or `'any'` and at least one is
   detected), the step is valid. If another property is detected: reason `otherProperty`.
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
    Strings keep the text form `a/b` (and the glyph `½` in `12½%`). Only the UI renders them
    stacked, with a hidden `/` so screen readers still read a fraction.
  - mixed numbers show the whole part at normal height next to the stacked fraction: `12½%`
    is rendered as `12` with a stacked `1/2`
  - an expected answer with an improper value is a mixed number: `1 5/12` (§6)
  - a `?` can take the place of the numerator or the denominator (`3/4 = ?/12`); it is drawn
    stacked like a digit
  - a whole number directly followed by one space and a fraction always reads as a mixed number
    (`3 1/2`). Text must therefore never put a number, a space and a fraction side by side when
    they are not a mixed number, and never put a decimal next to `/` (`37,5/100`): both would be
    drawn wrong.
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

None at the moment.

## 12. Roadmap (not in v1)

### 12.1 v2 — PABO mental arithmetic and basic knowledge

v2 covers the PABO tests: the RWT (landelijke reken- en wiskundetoets, year 1, replaced the
Wiscat in 2024) and the LKT (landelijke kennistoets, year 3). Both test these domains: whole
numbers; ratios, percentages, fractions and decimals; measurement and geometry; relations and
statistics. The LKT adds number systems, figurate numbers and problem solving with heuristics.
v2 only covers what can be practised as mental arithmetic or basic knowledge with a typed
answer. Prompts describe figures in words; there are no pictures.

The sets are built in this order, one implementation plan each. The topic details are decided
in each set's own spec iteration.

1. **Getalbegrip** — done, specified in §5.15–§5.19.
2. **Breuken & kommagetallen** — done, specified in §5.20–§5.22.
3. **Verhoudingen** (v2 part)
   - `percentChange`: increase and decrease, VAT (21% and 9%), reasoning back to 100%, and
     the percentage of a change.
   - `scale`: map scale ↔ real distance, and finding the scale.
   - Infrastructure: none; uses the `€` prefix and the unit suffix.
4. **Meten** (v2 part)
   - `speed`: distance, time and speed, and km/u ↔ m/s.
   - Infrastructure: compound units in the conversion engine (§5.10).
5. **Meetkunde** (new set)
   - `perimeterArea`: perimeter and area of a square, rectangle, triangle, parallelogram,
     trapezium and circle (`π ≈ 3,14`, with numbers that can be done mentally).
   - `solids`: volume and surface area of a cube, a box and a cylinder.
   - `pythagoras`: the missing side of a right-angled triangle, using Pythagorean triples and
     their multiples.
   - `angles`: angle sums in triangles and polygons, the angle of a regular polygon, and the
     angle between the hands of a clock.
6. **Verbanden & statistiek** (new set)
   - `statistics`: mean, median, mode and range of a short list, and the missing value for a
     given mean.
   - `sequences`: arithmetic and geometric sequences, and figurate numbers (triangular and
     square numbers): the next term or the n-th term.
   - `formulas`: substituting into a formula, and the start value and slope of a linear
     relation given as a table.
   - `equations`: linear equations in one unknown with an integer solution: `3x + 5 = 20`.
   - `probability`: simple probabilities as a fraction (dice, marbles).
   - Depends on negative numbers (set 1) and fraction answers (set 2).
7. **Talstelsels** (new set; LKT)
   - `numberSystems`: binary, base 5 and hexadecimal ↔ decimal.
   - `romanNumerals`: Roman numerals ↔ decimal.
   - Infrastructure: a text answer kind with letter keys (`A`–`F`, `I V X L C D M`).
8. **Heuristieken** (new set; LKT)
   - Short generated puzzles with a number as the answer. The explanation names the
     heuristic.
   - `systematicCounting`: combinations and handshakes.
   - `workingBackwards`: `Ik denk aan een getal…` and money left over.
   - `guessAndCheck`: chickens and rabbits, and two numbers from their sum and difference.
   - `simplifyProblem`: Gauss sums, counting numbers with a property, and figure patterns
     described in words (`figuur n heeft 3n + 1 lucifers`).
   - Infrastructure: long prompts must leave the keypad on screen (§3.3).
   - This set comes last because it combines the skills of the other sets.

Why this order: Getalbegrip is the largest domain in the RWT mental-arithmetic part and needs
little new infrastructure. Its negative numbers are needed later. Fractions and decimals come
next because percentages, scale, probability and statistics build on them. The remaining sets
build on both. Talstelsels and Heuristieken are LKT-only and come last.

### 12.2 v3 — multiple choice and calculator problems

- A multiple-choice answer kind. It serves:
  - mathematical language and concepts, such as the properties of quadrilaterals and
    triangles, absolute versus relative, and mean versus median
  - estimating (`welk antwoord ligt het dichtst bij`)
  - comparing and ordering
- Calculator problems: word problems at the level of the RWT calculator part and the LKT
  part 2, with larger numbers. These replace the earlier plan for the set *Toepassingen*.

### 12.3 Out of scope until further notice

- Anything that needs pictures:
  - reading graphs, tables and diagrams
  - spatial geometry: views, nets and cube buildings
  - symmetry and coordinates
  - measuring angles
- Didactics (part of the LKT).

### 12.4 Optional later

An "Alles gemengd" set, and topic toggles on the setup screen.
