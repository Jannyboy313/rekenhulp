# Tafels: topics

Part of the design spec (`../2026-10-05-rekenhulp-design.md`, §5). The § numbers are those of the
spec; its §5 holds the index and the rules shared by several sets.

### 5.1 Multiplication tables (`tables`)

- Factors `a, b ∈ {2, …, 15} \ {10}` (13 values each, 169 combinations)
  - No table of 1, so ×1 never occurs.
  - No table of 10. The exclusion applies to both factors, so `7 × 10` and `70 : 10` never
    occur either.
- **Chosen tables** (Tafels set only, §3.2): at least one factor is a chosen table; the other
  factor is any value of the range. "Tafel van 7" thus covers `7 × 13`, `13 × 7`, `91 : 13`,
  `91 : 7` and the missing-factor forms. The pair `(a, b)` is drawn uniformly from the range and
  redrawn until one factor is chosen, so every allowed pair is equally likely and choosing all
  tables gives exactly the distribution above. With exactly one table chosen, the division and
  missing-factor forms always give that table and ask for the other factor (`91 : 7 = ?`,
  `? × 7 = 91`, `7 × ? = 91`, never `91 : 13 = ?` or `13 × ? = 91`): otherwise the answer would
  always be the chosen table. Its square (`7 × 7`) is the only exception. Even so there are
  enough unique keys for 50 exercises across the three forms (25 product, 13 per other form).
- There are three forms; the product form is the focus:
  - product (50%): `13 × 7 = ?`
  - division (25%): `91 : 7 = ?`, where the dividend is always `a × b`
  - missing factor (25%): `? × 7 = 91` or `13 × ? = 91`, each side equally likely
- Answer: integer.
