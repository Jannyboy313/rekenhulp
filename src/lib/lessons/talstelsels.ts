import type { Lesson } from './types';

/** Lesstof for Talstelsels (lesstof spec §7.9). */
export const NUMBER_SYSTEMS_LESSON: Lesson = {
  setId: 'talstelsels',
  topics: [
    {
      id: 'toDecimal',
      title: 'Naar een gewoon getal',
      summary: 'Cijfer keer plaatswaarde',
      blocks: [
        {
          type: 'text',
          text: 'Net als in het tientallig stelsel, maar elke plaats naar links is keer het grondtal in plaats van keer 10. Een stelsel met grondtal 5 gebruikt de cijfers 0 tot en met 4; het zestientallig stelsel gebruikt A tot en met F voor 10 tot en met 15.',
        },
        {
          type: 'table',
          head: ['Stelsel', 'Plaatswaarden, van rechts'],
          rows: [
            ['tientallig', '1, 10, 100, 1000'],
            ['tweetallig', '1, 2, 4, 8, 16, 32'],
            ['vijftallig', '1, 5, 25, 125'],
            ['zestientallig', '1, 16, 256'],
          ],
        },
        {
          type: 'table',
          head: ['Cijfer', 'Waarde'],
          rows: [
            ['A', '10'],
            ['B', '11'],
            ['C', '12'],
            ['D', '13'],
            ['E', '14'],
            ['F', '15'],
          ],
        },
        {
          type: 'worked',
          title: 'Tweetallig 1011',
          lines: ['1 × 8 + 0 × 4 + 1 × 2 + 1 × 1 = 8 + 2 + 1 = 11'],
        },
        {
          type: 'worked',
          title: 'Vijftallig 243',
          lines: ['2 × 25 + 4 × 5 + 3 × 1 = 50 + 20 + 3 = 73'],
        },
        {
          type: 'worked',
          title: 'Zestientallig B4, B = 11',
          lines: ['11 × 16 + 4 × 1 = 176 + 4 = 180'],
        },
        {
          type: 'text',
          text: 'Of reken van links naar rechts: keer het grondtal, dan het volgende cijfer erbij.',
        },
        {
          type: 'worked',
          title: 'Tweetallig 1011, van links naar rechts',
          lines: ['((1 × 2 + 0) × 2 + 1) × 2 + 1 = (2 × 2 + 1) × 2 + 1 = 5 × 2 + 1 = 11'],
        },
        {
          type: 'worked',
          title: 'Vijftallig 243, van links naar rechts',
          lines: ['(2 × 5 + 4) × 5 + 3 = 14 × 5 + 3 = 73'],
        },
        {
          type: 'tip',
          text: 'Begin rechts met plaatswaarde 1; elke plaats naar links is keer het grondtal.',
        },
      ],
    },
    {
      id: 'fromDecimal',
      title: 'Vanuit een gewoon getal',
      summary: 'De grootste plaatswaarde eerst',
      blocks: [
        {
          type: 'text',
          text: 'Neem de grootste plaatswaarde die past, zo vaak als die past, en ga verder met wat over is. Een plaats waar niets in past krijgt een 0.',
        },
        {
          type: 'worked',
          title: '11 in het tweetallig stelsel',
          lines: ['11 = 8 + 2 + 1 = 1 × 8 + 0 × 4 + 1 × 2 + 1 × 1'],
        },
        { type: 'text', text: 'Dus 1011.' },
        {
          type: 'worked',
          title: '73 in het vijftallig stelsel',
          lines: ['73 = 2 × 25 + 23 = 2 × 25 + 4 × 5 + 3'],
        },
        { type: 'text', text: 'Dus 243.' },
        {
          type: 'worked',
          title: '180 in het zestientallig stelsel',
          lines: ['180 = 11 × 16 + 4'],
        },
        { type: 'text', text: '11 = B, dus B4.' },
        {
          type: 'text',
          text: 'Of deel steeds door het grondtal. De resten, van de laatste naar de eerste gelezen, zijn de cijfers.',
        },
        {
          type: 'worked',
          title: '73 in het vijftallig stelsel, door te delen',
          lines: ['73 = 14 × 5 + 3', '14 = 2 × 5 + 4'],
        },
        {
          type: 'text',
          text: '2 : 5 = 0 rest 2. De resten van onder naar boven geven 243.',
        },
        {
          type: 'tip',
          text: 'Een plaats waar niets in past krijgt een 0: 8 is tweetallig 1000.',
        },
      ],
    },
    {
      id: 'romanNumerals',
      title: 'Romeinse cijfers',
      summary: 'Zeven tekens en de aftrekregel',
      blocks: [
        {
          type: 'table',
          head: ['Teken', 'Waarde'],
          rows: [
            ['I', '1'],
            ['V', '5'],
            ['X', '10'],
            ['L', '50'],
            ['C', '100'],
            ['D', '500'],
            ['M', '1000'],
          ],
        },
        {
          type: 'text',
          text: 'Schrijf per plaats, van groot naar klein, met hoogstens drie dezelfde tekens op een rij. Een kleiner teken vóór een groter teken trek je af, alleen in deze zes paren:',
        },
        {
          type: 'table',
          head: ['Paar', 'Waarde'],
          rows: [
            ['IV', '4'],
            ['IX', '9'],
            ['XL', '40'],
            ['XC', '90'],
            ['CD', '400'],
            ['CM', '900'],
          ],
        },
        {
          type: 'worked',
          title: 'MCMXCIV = M + CM + XC + IV',
          lines: ['1000 + 900 + 90 + 4 = 1994'],
        },
        {
          type: 'text',
          text: 'Of teken voor teken: lees van links, trek een teken af als het volgende groter is en tel het anders op.',
        },
        {
          type: 'worked',
          title: 'MCMXCIV, teken voor teken',
          lines: ['1000 − 100 + 1000 − 10 + 100 − 1 + 5 = 1994'],
        },
        {
          type: 'worked',
          title: '2024 met Romeinse cijfers',
          lines: ['2024 = 2000 + 20 + 4'],
        },
        { type: 'text', text: 'MM + XX + IV = MMXXIV.' },
        {
          type: 'tip',
          text: 'Een kleiner teken vóór een groter teken trek je af: IV = 4, niet 6.',
        },
      ],
    },
  ],
};
