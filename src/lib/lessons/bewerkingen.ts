import type { Lesson } from './types';

/** Lesstof for Bewerkingen (lesstof spec §7.4). */
export const OPERATIONS_LESSON: Lesson = {
  setId: 'bewerkingen',
  topics: [
    {
      id: 'orderOfOperations',
      title: 'Volgorde van bewerkingen',
      summary: 'Haakjes, machten, × en :, + en −',
      blocks: [
        {
          type: 'table',
          head: ['Stap', 'Wat'],
          rows: [
            ['1', 'haakjes'],
            ['2', 'machten'],
            ['3', '× en :, van links naar rechts'],
            ['4', '+ en −, van links naar rechts'],
          ],
        },
        {
          type: 'text',
          text: '× en : zijn even sterk, net als + en −. Het ezelsbruggetje "Meneer Van Dale Wacht Op Antwoord" zet je op het verkeerde been: daarin komt × vóór :.',
        },
        {
          type: 'worked',
          lines: [
            '3 × (8 − 2) + 4 = 3 × 6 + 4 = 18 + 4 = 22',
            '24 : 4 × 2 = 6 × 2 = 12',
            '20 − 8 + 2 = 12 + 2 = 14',
            '(2 + 3)² − 4 × 5 = 5² − 4 × 5 = 25 − 20 = 5',
          ],
        },
        { type: 'text', text: 'Een negatief grondtal staat tussen haakjes: (−4)² = 16.' },
        { type: 'worked', lines: ['(−4)² − 10 = 16 − 10 = 6'] },
        { type: 'tip', text: '× en : zijn even sterk: reken die van links naar rechts.' },
      ],
    },
    {
      id: 'swapGroup',
      title: 'Commutatief en associatief',
      summary: 'Wisselen en anders groeperen',
      blocks: [
        {
          type: 'table',
          head: ['Eigenschap', 'Wat mag', 'Voorbeeld'],
          rows: [
            ['commutatief', 'de volgorde wisselen', '38 + 57 + 62 = 38 + 62 + 57'],
            ['associatief', 'de haakjes verschuiven', '(17 + 25) + 75 = 17 + (25 + 75)'],
          ],
        },
        {
          type: 'text',
          text: 'Beide gelden alleen voor + en ×, nooit voor − en :. Want 10 − 4 ≠ 4 − 10 en (16 : 4) : 2 ≠ 16 : (4 : 2).',
        },
        { type: 'text', text: 'Zoek een paar dat samen 100 of 1000 maakt:' },
        {
          type: 'worked',
          lines: [
            '25 × 37 × 4 = 25 × 4 × 37 = 100 × 37 = 3700',
            '(17 + 25) + 75 = 17 + (25 + 75) = 17 + 100 = 117',
          ],
        },
        {
          type: 'tip',
          text: 'Wisselen en anders groeperen mag alleen bij + en ×, nooit bij − en :.',
        },
      ],
    },
    {
      id: 'distributive',
      title: 'Distributief',
      summary: 'Verdelen over + en −',
      blocks: [
        {
          type: 'text',
          text: 'a × (b + c) = a × b + a × c, en andersom: een gemeenschappelijke factor buiten haakjes brengen.',
        },
        {
          type: 'worked',
          lines: [
            '7 × 98 = 7 × 100 − 7 × 2 = 700 − 14 = 686',
            '6 × (40 + 3) = 6 × 40 + 6 × 3 = 240 + 18 = 258',
            '7 × 13 + 7 × 87 = 7 × (13 + 87) = 7 × 100 = 700',
          ],
        },
        { type: 'tip', text: 'Pas één eigenschap per stap toe.' },
      ],
    },
    {
      id: 'compensation',
      title: 'Compenseren',
      summary: 'Rond af en verbeter',
      blocks: [
        {
          type: 'text',
          text: 'Maak één getal rond en verbeter daarna wat je te veel hebt opgeteld of afgetrokken.',
        },
        {
          type: 'worked',
          lines: [
            '398 + 247 = 400 + 247 − 2 = 647 − 2 = 645',
            '5003 − 2998 = 5003 − 3000 + 2 = 2003 + 2 = 2005',
          ],
        },
        {
          type: 'text',
          text: 'Bij 5003 − 3000 trek je 2 te veel af, dus tel je 2 weer op.',
        },
        { type: 'text', text: 'Dezelfde sommen kun je ook zonder afronden maken.' },
        {
          type: 'worked',
          title: '398 + 247, in stappen',
          lines: ['398 + 247 = 398 + 200 + 47 = 598 + 47 = 645'],
        },
        {
          type: 'worked',
          title: '5003 − 2998, door aan te vullen',
          lines: ['2998 + 2 = 3000', '3000 + 2003 = 5003', '2 + 2003 = 2005'],
        },
        {
          type: 'text',
          text: 'Liggen de getallen dicht bij elkaar, vul dan aan van het kleinste naar het grootste.',
        },
        { type: 'tip', text: '398 = 400 − 2, dus compenseer met − 2, niet met + 2.' },
      ],
    },
    {
      id: 'complement',
      title: 'Aanvullen tot 100 en 1000',
      summary: 'Wat mist er nog',
      blocks: [
        { type: 'text', text: 'Tel op vanaf het kleinste getal tot het ronde getal.' },
        {
          type: 'worked',
          title: '1000 − 463',
          lines: ['463 + 7 = 470', '470 + 30 = 500', '500 + 500 = 1000', '7 + 30 + 500 = 537'],
        },
        {
          type: 'text',
          text: 'Sneller: de cijfers vullen aan tot 9, het laatste tot 10. Van 463 naar 537: 4 + 5 = 9, 6 + 3 = 9 en 3 + 7 = 10.',
        },
        { type: 'tip', text: 'Controleer door op te tellen: 463 + 537 = 1000.' },
      ],
    },
    {
      id: 'splitting',
      title: 'Handig vermenigvuldigen en delen',
      summary: '× 25, × 50, × 125, : 4 en : 5',
      blocks: [
        {
          type: 'table',
          head: ['Som', 'Handig'],
          rows: [
            ['× 25', ': 4 × 100'],
            ['× 50', ': 2 × 100'],
            ['× 125', ': 8 × 1000'],
            [': 4', ': 2 : 2'],
            [': 8', ': 2 : 2 : 2'],
            [': 5', '× 2 : 10'],
            [': 25', '× 4 : 100'],
          ],
        },
        {
          type: 'worked',
          lines: [
            '48 × 25 = 48 : 4 × 100 = 12 × 100 = 1200',
            '16 × 125 = 16 : 8 × 1000 = 2 × 1000 = 2000',
            '72 : 4 = 72 : 2 : 2 = 36 : 2 = 18',
            '340 : 5 = 340 × 2 : 10 = 680 : 10 = 68',
          ],
        },
        {
          type: 'text',
          text: 'Verdubbelen en halveren werkt als de ene factor op 5 eindigt en de andere even is.',
        },
        { type: 'worked', lines: ['35 × 18 = 70 × 9 = 630'] },
        {
          type: 'tip',
          text: 'Verdubbel de factor die op 5 eindigt en halveer de andere: 35 × 18 = 70 × 9.',
        },
      ],
    },
  ],
};
