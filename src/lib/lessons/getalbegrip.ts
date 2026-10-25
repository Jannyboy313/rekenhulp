import type { Lesson } from './types';

/** Lesstof for Getalbegrip (lesstof spec §7.5). */
export const NUMBER_SENSE_LESSON: Lesson = {
  setId: 'getalbegrip',
  topics: [
    {
      id: 'mentalOperations',
      title: 'Hoofdrekenen met grote getallen',
      summary: 'Rijgen en rekenen met nullen',
      blocks: [
        { type: 'text', text: 'Tel op of trek af in stappen, het grootste deel eerst.' },
        {
          type: 'worked',
          lines: [
            '6347 + 2800 = 6347 + 2000 + 800 = 8347 + 800 = 9147',
            '15\u{202f}213 − 470 = 15\u{202f}213 − 400 − 70 = 14\u{202f}813 − 70 = 14\u{202f}743',
          ],
        },
        {
          type: 'text',
          text: 'Vermenigvuldigen: eerst de tafel, dan de nullen erachter. Delen: streep eerst evenveel nullen weg.',
        },
        {
          type: 'worked',
          lines: [
            '28 × 500 = 28 × 5 × 100 = 140 × 100 = 14\u{202f}000',
            '7200 : 80 = 720 : 8 = 90',
          ],
        },
        { type: 'tip', text: 'Streep bij delen evenveel nullen weg in beide getallen.' },
      ],
    },
    {
      id: 'remainder',
      title: 'Delen met rest',
      summary: 'Naar boven, naar beneden of de rest',
      blocks: [
        {
          type: 'worked',
          title: '230 leerlingen, busjes van 8',
          lines: ['230 = 28 × 8 + 6'],
        },
        {
          type: 'text',
          text: '28 busjes en 6 leerlingen over; die 6 moeten ook mee, dus 29 busjes.',
        },
        { type: 'worked', title: '200 eieren, dozen van 12', lines: ['200 = 16 × 12 + 8'] },
        {
          type: 'table',
          head: ['Vraag', 'Antwoord'],
          rows: [
            ['Hoeveel busjes nodig?', 'naar boven: 29'],
            ['Hoeveel volle dozen?', 'naar beneden: 16'],
            ['Hoeveel eieren over?', 'de rest: 8'],
          ],
        },
        { type: 'tip', text: 'Moet wat overblijft ook mee, rond dan naar boven af.' },
      ],
    },
    {
      id: 'negativeNumbers',
      title: 'Negatieve getallen',
      summary: 'Door nul heen en de tekenregels',
      blocks: [
        { type: 'text', text: 'Ga je door nul heen, splits dan bij nul.' },
        { type: 'worked', lines: ['3 − 8 = 3 − 3 − 5 = −5', '−7 + 12 = −7 + 7 + 5 = 5'] },
        { type: 'worked', lines: ['−4 − (−6) = −4 + 6 = 2', '5 + (−8) = 5 − 8 = −3'] },
        {
          type: 'table',
          head: ['× of : met', 'Uitkomst'],
          rows: [
            ['twee positieve getallen', 'positief'],
            ['twee negatieve getallen', 'positief'],
            ['één negatief getal', 'negatief'],
          ],
        },
        { type: 'worked', lines: ['−6 × 4 = −24', '−24 : (−3) = 8'] },
        {
          type: 'worked',
          title: 'Verschil tussen −7 °C en 4 °C',
          lines: ['4 − (−7) = 4 + 7 = 11'],
        },
        { type: 'tip', text: 'Min een negatief getal is plus: −4 − (−6) = −4 + 6.' },
      ],
    },
    {
      id: 'rounding',
      title: 'Afronden',
      summary: 'Het eerste cijfer dat wegvalt beslist',
      blocks: [
        {
          type: 'text',
          text: 'Is het eerste cijfer dat wegvalt 5 of meer, rond dan naar boven af; anders naar beneden. Noem eerst de twee buren: 4386 ligt tussen 4300 en 4400, het eerste cijfer dat wegvalt is 8, dus 4400.',
        },
        {
          type: 'table',
          head: ['Getal', 'Afronden op', 'Uitkomst'],
          rows: [
            ['4386', 'tientallen', '4390'],
            ['4386', 'honderdtallen', '4400'],
            ['48\u{202f}512', 'duizendtallen', '49\u{202f}000'],
            ['3970', 'honderdtallen', '4000'],
            ['12,5', 'een heel getal', '13'],
            ['3,746', '1 decimaal', '3,7'],
            ['2,96', '1 decimaal', '3,0'],
            ['0,385', '2 decimalen', '0,39'],
          ],
        },
        {
          type: 'tip',
          text: 'Alleen het eerste cijfer dat wegvalt telt: 3,746 op 1 decimaal is 3,7.',
        },
      ],
    },
    {
      id: 'powers',
      title: 'Machten',
      summary: 'Herhaald vermenigvuldigen',
      blocks: [
        {
          type: 'worked',
          lines: ['2⁵ = 2 × 2 × 2 × 2 × 2 = 32', '(−3)³ = (−3) × (−3) × (−3) = −27'],
        },
        {
          type: 'text',
          text: 'Een even aantal mintekens geeft plus, een oneven aantal min. 7¹ = 7, en elk getal (behalve 0) tot de macht 0 is 1.',
        },
        { type: 'worked', lines: ['0,3² = 0,3 × 0,3 = 0,09', '0,2³ = 0,2 × 0,2 × 0,2 = 0,008'] },
        {
          type: 'text',
          text: 'De uitkomst heeft evenveel decimalen als alle factoren samen.',
        },
        {
          type: 'table',
          head: ['Macht', 'Uitkomst'],
          rows: [
            ['2³', '8'],
            ['2⁴', '16'],
            ['2⁵', '32'],
            ['2⁶', '64'],
            ['2⁷', '128'],
            ['2⁸', '256'],
            ['2⁹', '512'],
            ['2¹⁰', '1024'],
            ['3³', '27'],
            ['3⁴', '81'],
            ['3⁵', '243'],
          ],
        },
        {
          type: 'tip',
          text: 'Een macht is herhaald vermenigvuldigen: 2⁵ = 2 × 2 × 2 × 2 × 2, niet 2 × 5.',
        },
      ],
    },
    {
      id: 'negativeExponents',
      title: 'Negatieve exponenten',
      summary: '10⁻³ = 0,001',
      blocks: [
        {
          type: 'text',
          text: '10⁻³ = 1 : 10³ = 1 : 1000 = 0,001. Elke stap omlaag is : 10.',
        },
        { type: 'worked', lines: ['1 : 10³ = 1 : 1000 = 0,001'] },
        {
          type: 'table',
          head: ['Macht', 'Getal'],
          rows: [
            ['10³', '1000'],
            ['10²', '100'],
            ['10¹', '10'],
            ['10⁰', '1'],
            ['10⁻¹', '0,1'],
            ['10⁻²', '0,01'],
            ['10⁻³', '0,001'],
            ['10⁻⁶', '0,000001'],
          ],
        },
        {
          type: 'text',
          text: 'De exponent telt de plaatsen waarover de komma schuift: 0,001 = 10⁻³ (3 plaatsen, niet de 2 nullen na de komma).',
        },
        {
          type: 'tip',
          text: 'Een negatieve exponent maakt geen negatief getal: 10⁻³ = 1 : 1000.',
        },
      ],
    },
    {
      id: 'roots',
      title: 'Wortels',
      summary: 'Derdemachtswortels en geschaalde wortels',
      blocks: [
        { type: 'text', text: '∛64 = 4, want 4 × 4 × 4 = 64.' },
        {
          type: 'table',
          head: ['n', 'n³'],
          rows: [2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => [`${n}`, `${n ** 3}`]),
        },
        {
          type: 'text',
          text: 'Een wortel van een geschaald kwadraat: √0,49 = 0,7 (de helft van de decimalen) en √6400 = 80 (de helft van de nullen).',
        },
        {
          type: 'worked',
          lines: ['0,7 × 0,7 = 0,49', '80 × 80 = 6400', '120 × 120 = 14\u{202f}400'],
        },
        {
          type: 'tip',
          text: '∛27 is het getal dat 3 keer met zichzelf vermenigvuldigd 27 geeft, niet 27 : 3.',
        },
      ],
    },
    {
      id: 'scientificNotation',
      title: 'Wetenschappelijke notatie',
      summary: 'Getal van 1 tot 10 keer een macht van 10',
      blocks: [
        {
          type: 'text',
          text: 'Een getal c × 10ⁿ met c minstens 1 en kleiner dan 10. Tel de plaatsen waarover de komma schuift: een getal van 10 of meer krijgt een positieve exponent, een getal onder 1 een negatieve.',
        },
        {
          type: 'worked',
          lines: ['4\u{202f}500\u{202f}000 = 4,5 × 1\u{202f}000\u{202f}000 = 4,5 × 10⁶'],
        },
        { type: 'worked', lines: ['0,000045 = 4,5 × 0,00001'] },
        { type: 'text', text: '0,00001 = 10⁻⁵, dus 0,000045 = 4,5 × 10⁻⁵.' },
        { type: 'worked', lines: ['450 × 10⁴ = 4,5 × 10² × 10⁴ = 4,5 × 10⁶'] },
        {
          type: 'text',
          text: 'Het getal vóór × 10 wordt 100 keer kleiner, dus de exponent wordt 2 groter.',
        },
        { type: 'tip', text: 'Tel de plaatsen waarover de komma schuift, niet de nullen.' },
      ],
    },
  ],
};
