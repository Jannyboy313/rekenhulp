import type { Lesson } from './types';

/** Lesstof for Breuken & kommagetallen (lesstof spec §7.6). */
export const FRACTIONS_LESSON: Lesson = {
  setId: 'breuken',
  topics: [
    {
      id: 'conversion',
      title: 'Breuk, kommagetal en procent',
      summary: 'Omzetten via 10, 100 of 1000',
      blocks: [
        {
          type: 'text',
          text: 'Een breuk is een deling: 3/8 = 3 : 8. Maak de noemer 10, 100 of 1000.',
        },
        { type: 'worked', lines: ['3/8 = 375/1000 = 0,375', '7/20 = 35/100 = 0,35'] },
        {
          type: 'text',
          text: 'Procent betekent honderdste: × 100 geeft het percentage, : 100 gaat terug.',
        },
        { type: 'worked', lines: ['0,375 × 100 = 37,5', '37,5 : 100 = 0,375'] },
        { type: 'tip', text: '3/8 betekent 3 : 8, niet 3,8.' },
      ],
    },
    {
      id: 'knownFractions',
      title: 'Breuken om te kennen',
      summary: 'Van 1/2 tot 1/50, derden en zesden',
      blocks: [
        {
          type: 'table',
          head: ['Breuk', 'Kommagetal', 'Procent'],
          rows: [
            ['1/2', '0,5', '50%'],
            ['1/4', '0,25', '25%'],
            ['3/4', '0,75', '75%'],
            ['1/5', '0,2', '20%'],
            ['1/8', '0,125', '12,5%'],
            ['3/8', '0,375', '37,5%'],
            ['1/10', '0,1', '10%'],
            ['1/20', '0,05', '5%'],
            ['1/25', '0,04', '4%'],
            ['1/50', '0,02', '2%'],
            ['1/3', '—', '33 1/3%'],
            ['2/3', '—', '66 2/3%'],
            ['1/6', '—', '16 2/3%'],
            ['5/6', '—', '83 1/3%'],
          ],
        },
        {
          type: 'text',
          text: 'Derden en zesden zijn geen eindige kommagetallen (0,333…). Reken via 100%: 100% : 3 = 33 1/3%, en 5/6 = 5 × 16 2/3% = 83 1/3%.',
        },
        { type: 'tip', text: '2/3 is geen eindig kommagetal: schrijf het als breuk.' },
      ],
    },
    {
      id: 'simplify',
      title: 'Vereenvoudigen en gelijknamig',
      summary: 'Teller en noemer met hetzelfde getal',
      blocks: [
        { type: 'worked', title: 'Teller en noemer : 6', lines: ['18/24 = 3/4'] },
        { type: 'worked', title: 'Teller en noemer × 3', lines: ['3/4 = 9/12'] },
        { type: 'text', text: 'Naar een gemengd getal: haal de helen eruit.' },
        { type: 'worked', lines: ['17/12 = 12/12 + 5/12 = 1 + 5/12'] },
        { type: 'text', text: 'Dus 17/12 = 1 5/12.' },
        {
          type: 'tip',
          text: 'Vermenigvuldig of deel teller en noemer met hetzelfde getal; het verschil blijft niet gelijk.',
        },
      ],
    },
    {
      id: 'addSubtract',
      title: 'Optellen en aftrekken',
      summary: 'Eerst de noemers gelijk',
      blocks: [
        {
          type: 'text',
          text: 'Maak de noemers gelijk (de KGV) en tel daarna alleen de tellers op of trek ze af.',
        },
        {
          type: 'worked',
          lines: ['2/3 + 1/4 = 8/12 + 3/12 = 11/12', '2/3 + 3/4 = 8/12 + 9/12 = 17/12'],
        },
        { type: 'text', text: '17/12 = 1 5/12.' },
        {
          type: 'text',
          text: 'Gemengde getallen houden hun helen. Is de breuk te klein om af te trekken, wissel dan 1 geheel om: 3 1/2 − 1 3/4 = 3 2/4 − 1 3/4 = 2 6/4 − 1 3/4 = 1 3/4.',
        },
        {
          type: 'tip',
          text: 'Maak eerst de noemers gelijk; tel daarna alleen de tellers op.',
        },
      ],
    },
    {
      id: 'multiplyDivide',
      title: 'Vermenigvuldigen en delen',
      summary: 'Delen is keer het omgekeerde',
      blocks: [
        {
          type: 'text',
          text: 'Teller × teller en noemer × noemer; vereenvoudig aan het eind.',
        },
        { type: 'worked', lines: ['3/4 × 2/5 = 6/20 = 3/10', '6 × 2/3 = 12/3 = 4'] },
        { type: 'text', text: 'Bij 6 × 2/3 gaat alleen de teller keer 6.' },
        {
          type: 'worked',
          lines: ['2/3 : 4/9 = 2/3 × 9/4 = 18/12 = 3/2', '3/4 : 3 = 3/4 × 1/3 = 3/12 = 1/4'],
        },
        { type: 'tip', text: 'Delen door 4/9 is keer het omgekeerde: × 9/4.' },
      ],
    },
    {
      id: 'partOf',
      title: 'Deel van een getal',
      summary: '3/4 van 24 en terug naar het geheel',
      blocks: [
        { type: 'worked', title: '3/4 van 24', lines: ['24 : 4 = 6', '3 × 6 = 18'] },
        { type: 'text', text: '1/4 van 24 is 6; 3/4 is 3 keer zoveel.' },
        { type: 'worked', title: '3/4 is 18, het geheel', lines: ['18 : 3 = 6', '4 × 6 = 24'] },
        { type: 'text', text: '3/4 is 18, dus 1/4 is 6 en 4/4 is 24.' },
        { type: 'tip', text: 'Is 18 zelf al 3/4, reken dan terug: eerst 1/4, dan 4/4.' },
      ],
    },
    {
      id: 'decimals',
      title: 'Rekenen met kommagetallen',
      summary: "Komma's onder elkaar, decimalen tellen",
      blocks: [
        {
          type: 'text',
          text: "Bij optellen en aftrekken zet je de komma's onder elkaar; vul aan met nullen.",
        },
        { type: 'worked', lines: ['4,70 + 0,35 = 5,05', '5,00 − 0,25 = 4,75'] },
        {
          type: 'text',
          text: 'Vermenigvuldig zonder komma en geef de uitkomst evenveel decimalen als beide getallen samen.',
        },
        { type: 'worked', title: '0,3 × 0,4', lines: ['3 × 4 = 12', '0,3 × 0,4 = 0,12'] },
        { type: 'text', text: '1 + 1 = 2 decimalen.' },
        {
          type: 'text',
          text: 'Delen door een kommagetal: maak eerst de deler heel, door beide getallen met dezelfde macht van 10 te vermenigvuldigen.',
        },
        { type: 'worked', lines: ['2,5 : 0,05 = 250 : 5 = 50', '0,36 : 4 = 0,09'] },
        { type: 'text', text: '36 : 4 = 9, dus 0,36 : 4 = 0,09.' },
        { type: 'tip', text: 'De uitkomst heeft evenveel decimalen als beide getallen samen.' },
      ],
    },
  ],
};
