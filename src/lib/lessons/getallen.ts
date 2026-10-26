import type { Lesson } from './types';

/** Lesstof for Getallen & delers (lesstof spec §7.1). */
export const NUMBERS_LESSON: Lesson = {
  setId: 'getallen',
  topics: [
    {
      id: 'digitRules',
      title: 'Deelbaarheid aan de cijfers',
      summary: '2, 3, 4, 5, 8, 9 en 11',
      blocks: [
        {
          type: 'table',
          head: ['Deler', 'Kijk naar', 'Deelbaar als'],
          rows: [
            ['2', 'laatste cijfer', 'even'],
            ['5', 'laatste cijfer', '0 of 5'],
            ['4', 'laatste twee cijfers', 'deelbaar door 4'],
            ['8', 'laatste drie cijfers', 'deelbaar door 8'],
            ['3', 'cijfersom', 'deelbaar door 3'],
            ['9', 'cijfersom', 'deelbaar door 9'],
            ['11', 'alternerende som', '0 of een veelvoud van 11, ook negatief'],
          ],
        },
        {
          type: 'text',
          text: 'De alternerende som begint links met +, daarna om en om − en +.',
        },
        { type: 'worked', title: '2718 en 9', lines: ['2 + 7 + 1 + 8 = 18', '2718 = 9 × 302'] },
        { type: 'worked', title: '9174 en 11', lines: ['9 − 1 + 7 − 4 = 11', '9174 = 11 × 834'] },
        {
          type: 'tip',
          text: 'Twijfel je over een cijfersom? Neem er nog eens de cijfersom van: 18 → 1 + 8 = 9.',
        },
      ],
    },
    {
      id: 'combinedRules',
      title: 'Deelbaarheid door 6, 12, 14 en 15',
      summary: 'Twee regels tegelijk',
      blocks: [
        {
          type: 'text',
          text: 'Splits de deler in twee factoren zonder gemeenschappelijke deler en controleer allebei.',
        },
        {
          type: 'table',
          head: ['Deler', 'Factoren'],
          rows: [
            ['6', '2 × 3'],
            ['12', '3 × 4'],
            ['14', '2 × 7'],
            ['15', '3 × 5'],
          ],
        },
        {
          type: 'text',
          text: '1246 is even, maar de cijfersom 1 + 2 + 4 + 6 = 13 is niet deelbaar door 3. Dus 1246 is niet deelbaar door 6.',
        },
        {
          type: 'tip',
          text: '12 = 2 × 6 werkt niet: 2 en 6 delen de factor 2. 18 is deelbaar door 2 en door 6, maar niet door 12.',
        },
      ],
    },
    {
      id: 'chunking',
      title: 'Deelbaarheid door 7 en 13',
      summary: 'Happen in veelvouden',
      blocks: [
        {
          type: 'text',
          text: 'Voor 7 en 13 is er geen cijferregel. Haal er grote veelvouden af die je kent (7 × 300 = 2100, 7 × 80 = 560) tot er een kleine rest over is.',
        },
        {
          type: 'worked',
          title: '2716 en 7',
          lines: ['2716 = 2100 + 560 + 56', '2716 : 7 = 300 + 80 + 8 = 388'],
        },
        {
          type: 'text',
          text: '2718 = 2100 + 560 + 56 + 2: rest 2, dus 2718 is niet deelbaar door 7.',
        },
        {
          type: 'worked',
          title: '1859 en 13',
          lines: ['1859 = 1300 + 520 + 39', '1859 : 13 = 100 + 40 + 3 = 143'],
        },
      ],
    },
    {
      id: 'primes',
      title: 'Priemgetallen',
      summary: 'Precies twee delers',
      blocks: [
        {
          type: 'text',
          text: 'Een priemgetal heeft precies twee delers: 1 en zichzelf. 1 is geen priemgetal; 2 is het enige even priemgetal.',
        },
        {
          type: 'text',
          text: 'Test een getal door te delen door de priemgetallen waarvan het kwadraat niet groter is. Voor 151 zijn dat 2, 3, 5, 7 en 11, want 13² = 169 is groter dan 151. Geen ervan deelt 151, dus 151 is priem.',
        },
        { type: 'text', text: 'De priemgetallen tot 100:' },
        {
          type: 'table',
          head: ['Getallen', 'Priemgetallen'],
          rows: [
            ['0–9', '2, 3, 5, 7'],
            ['10–19', '11, 13, 17, 19'],
            ['20–29', '23, 29'],
            ['30–39', '31, 37'],
            ['40–49', '41, 43, 47'],
            ['50–59', '53, 59'],
            ['60–69', '61, 67'],
            ['70–79', '71, 73, 79'],
            ['80–89', '83, 89'],
            ['90–99', '97'],
          ],
        },
        {
          type: 'text',
          text: 'Deze getallen onder 200 zijn niet deelbaar door 2, 3 of 5 en lijken daardoor priem, maar zijn het niet:',
        },
        {
          type: 'table',
          head: ['Getal', 'Ontbinding'],
          rows: [
            ['49', '7²'],
            ['77', '7 × 11'],
            ['91', '7 × 13'],
            ['119', '7 × 17'],
            ['121', '11²'],
            ['133', '7 × 19'],
            ['143', '11 × 13'],
            ['161', '7 × 23'],
            ['169', '13²'],
            ['187', '11 × 17'],
          ],
        },
        {
          type: 'tip',
          text: 'Onder 200 is een getal dat niet deelbaar is door 2, 3 of 5 priem, tenzij het in deze tabel staat.',
        },
      ],
    },
    {
      id: 'factorization',
      title: 'Ontbinden in priemfactoren',
      summary: 'De deelladder',
      blocks: [
        {
          type: 'text',
          text: 'Deel steeds door het kleinste priemgetal dat past, tot er een priemgetal over is. Schrijf factoren die vaker voorkomen als macht.',
        },
        {
          type: 'worked',
          title: '84',
          lines: ['84 = 2 × 42 = 2 × 2 × 21 = 2 × 2 × 3 × 7 = 2² × 3 × 7'],
        },
        {
          type: 'worked',
          title: '180, met een makkelijke splitsing',
          lines: ['180 = 18 × 10 = 2 × 9 × 2 × 5 = 2² × 3² × 5'],
        },
        {
          type: 'tip',
          text: '1 is geen priemfactor. Controleer je ontbinding door terug te vermenigvuldigen.',
        },
      ],
    },
    {
      id: 'gcd',
      title: 'GGD',
      summary: 'Grootste gemeenschappelijke deler',
      blocks: [
        {
          type: 'text',
          text: 'De GGD is het grootste getal waar allebei door deelbaar zijn. Hij is hoogstens het kleinste getal.',
        },
        {
          type: 'text',
          text: 'Met priemfactoren: neem de priemgetallen die in allebei zitten, elk met de laagste macht.',
        },
        {
          type: 'worked',
          title: '84 en 126',
          lines: ['84 = 2² × 3 × 7', '126 = 2 × 3² × 7', '2 × 3 × 7 = 42'],
        },
        {
          type: 'worked',
          title: '24, 36, 60 en 90',
          lines: ['24 = 2³ × 3', '36 = 2² × 3²', '60 = 2² × 3 × 5', '90 = 2 × 3² × 5', '2 × 3 = 6'],
        },
        {
          type: 'text',
          text: 'Bij meer getallen telt een priemgetal alleen mee als het in álle getallen zit. 2 en 3 zitten in alle vier, elk minstens één keer. 5 zit niet in 24 en 36, dus valt weg.',
        },
        {
          type: 'text',
          text: 'Sneller: de GGD deelt ook het verschil. 126 − 84 = 42 en 42 deelt 84, dus GGD = 42. Deelt het verschil niet, herhaal dan met het kleinste getal en het verschil: 120 en 72 → verschil 48; 72 en 48 → verschil 24; 24 deelt 48, dus GGD = 24.',
        },
        {
          type: 'tip',
          text: 'Deelt het kleinste getal het grootste, dan is het de GGD. Geen gemeenschappelijke priemfactor? Dan is de GGD 1.',
        },
      ],
    },
    {
      id: 'lcm',
      title: 'KGV',
      summary: 'Kleinste gemeenschappelijke veelvoud',
      blocks: [
        {
          type: 'text',
          text: 'Het KGV is het kleinste getal dat door allebei deelbaar is. Het is minstens het grootste getal.',
        },
        {
          type: 'text',
          text: 'Optellen: loop de veelvouden van het grootste getal af tot het kleinste erin past. 12 en 18 → 18 nee, 36 ja.',
        },
        {
          type: 'text',
          text: 'Met priemfactoren: neem elk priemgetal dat voorkomt, met de hoogste macht.',
        },
        {
          type: 'worked',
          title: '12 en 18, met priemfactoren',
          lines: ['12 = 2² × 3', '18 = 2 × 3²', '2² × 3² = 36'],
        },
        {
          type: 'worked',
          title: '12 en 18, via de GGD',
          lines: ['12 × 18 : 6 = 216 : 6 = 36'],
        },
        {
          type: 'worked',
          title: '24, 36, 60 en 90',
          lines: [
            '24 = 2³ × 3',
            '36 = 2² × 3²',
            '60 = 2² × 3 × 5',
            '90 = 2 × 3² × 5',
            '2³ × 3² × 5 = 8 × 9 × 5 = 360',
          ],
        },
        {
          type: 'text',
          text: 'Elk priemgetal dat in één of meer getallen zit telt mee, dus 5 ook: 2 tot de derde (24), 3 tot de tweede (36 en 90), 5 één keer. Via de GGD werkt alleen bij twee getallen.',
        },
        {
          type: 'table',
          head: ['GGD', 'KGV'],
          rows: [
            ['deler van allebei', 'veelvoud van allebei'],
            ['hoogstens het kleinste getal', 'minstens het grootste getal'],
            ['laagste macht van gedeelde priemen', 'hoogste macht van alle priemen'],
          ],
        },
        {
          type: 'tip',
          text: 'Is de GGD 1, dan is het KGV het product: KGV van 8 en 15 = 8 × 15 = 120.',
        },
      ],
    },
    {
      id: 'squares',
      title: 'Kwadraten en wortels',
      summary: '11² tot en met 25²',
      blocks: [
        {
          type: 'table',
          head: ['n', 'n²'],
          rows: Array.from({ length: 15 }, (_, i) => [`${i + 11}`, `${(i + 11) ** 2}`]),
        },
        {
          type: 'worked',
          title: 'Tientallen afsplitsen',
          lines: [
            '17² = 17 × 10 + 17 × 7 = 170 + 119 = 289',
            '23² = 23 × 20 + 23 × 3 = 460 + 69 = 529',
          ],
        },
        {
          type: 'text',
          text: 'Eindigt het getal op 5: vermenigvuldig het tiental met één meer, maal 100, plus 25.',
        },
        {
          type: 'worked',
          title: 'Eindigt op 5',
          lines: ['15² = 1 × 2 × 100 + 25 = 225', '25² = 2 × 3 × 100 + 25 = 625'],
        },
        {
          type: 'text',
          text: 'Wortels: √529 ligt tussen 20 en 30, want 20² = 400 en 30² = 900. Een kwadraat dat op 9 eindigt, heeft een wortel die op 3 of 7 eindigt. 25² = 625 is te groot, dus √529 = 23.',
        },
        {
          type: 'table',
          head: ['Kwadraat eindigt op', 'Wortel eindigt op'],
          rows: [
            ['1', '1 of 9'],
            ['4', '2 of 8'],
            ['5', '5'],
            ['6', '4 of 6'],
            ['9', '3 of 7'],
            ['0', '0'],
          ],
        },
      ],
    },
  ],
};
