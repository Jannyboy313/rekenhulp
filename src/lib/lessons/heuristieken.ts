import type { Lesson } from './types';

/** Lesstof for Heuristieken (lesstof spec §7.10). */
export const HEURISTICS_LESSON: Lesson = {
  setId: 'heuristieken',
  topics: [
    {
      id: 'systematicCounting',
      title: 'Systematisch tellen',
      summary: 'Combinaties, handdrukken en volgordes',
      blocks: [
        {
          type: 'text',
          text: 'Past elke keuze bij elke andere keuze, dan vermenigvuldig je.',
        },
        {
          type: 'table',
          head: ['Broek', 'Combinaties'],
          rows: [
            ['broek 1', 'trui 1, 2, 3 of 4'],
            ['broek 2', 'trui 1, 2, 3 of 4'],
            ['broek 3', 'trui 1, 2, 3 of 4'],
          ],
        },
        { type: 'text', text: '3 rijen van 4 combinaties.' },
        { type: 'worked', title: '3 broeken en 4 truien', lines: ['3 × 4 = 12'] },
        {
          type: 'worked',
          title: 'Menu met 3 voorgerechten, 4 hoofdgerechten en 2 nagerechten',
          lines: ['3 × 4 × 2 = 24'],
        },
        {
          type: 'worked',
          title: '6 gasten geven elkaar een hand',
          lines: ['6 × 5 : 2 = 30 : 2 = 15'],
        },
        {
          type: 'text',
          text: 'Elke gast geeft 5 handen, maar zo tel je elke handdruk twee keer.',
        },
        {
          type: 'worked',
          title: 'Hetzelfde, alleen nieuwe handdrukken',
          lines: ['5 + 4 + 3 + 2 + 1 = 15'],
        },
        {
          type: 'text',
          text: 'De 1e gast geeft 5 handen, de 2e nog 4 nieuwe, de 3e nog 3, enzovoort.',
        },
        { type: 'worked', title: '4 kinderen in een rij', lines: ['4 × 3 × 2 × 1 = 24'] },
        {
          type: 'worked',
          title: '1e, 2e en 3e plaats uit 6 kinderen',
          lines: ['6 × 5 × 4 = 120'],
        },
        {
          type: 'table',
          head: ['Rij van 3 kinderen'],
          rows: [['ABC'], ['ACB'], ['BAC'], ['BCA'], ['CAB'], ['CBA']],
        },
        { type: 'text', text: '6 rijen, en 3 × 2 × 1 = 6.' },
        {
          type: 'tip',
          text: 'Past elke keuze bij elke andere keuze, vermenigvuldig dan: 3 × 4, niet 3 + 4.',
        },
      ],
    },
    {
      id: 'workingBackwards',
      title: 'Terugrekenen',
      summary: 'Van het eind naar het begin',
      blocks: [
        {
          type: 'text',
          text: 'Begin bij het eind en draai elke bewerking om, in omgekeerde volgorde.',
        },
        {
          type: 'table',
          head: ['Bewerking', 'Terug'],
          rows: [
            ['keer 3', 'delen door 3'],
            ['delen door 2', 'keer 2'],
            ['7 erbij', '7 eraf'],
            ['de helft uitgeven', 'keer 2'],
            ['een kwart uitgeven', ': 3 × 4'],
          ],
        },
        {
          type: 'worked',
          title: 'Keer 3, plus 7, gedeeld door 2 geeft 14',
          lines: ['14 × 2 = 28', '28 − 7 = 21', '21 : 3 = 7'],
        },
        { type: 'worked', title: 'Controle', lines: ['(7 × 3 + 7) : 2 = 28 : 2 = 14'] },
        { type: 'text', text: 'Of probeer een getal en verbeter het (slim proberen).' },
        {
          type: 'worked',
          title: 'Hetzelfde, proberen met 5',
          lines: ['(5 × 3 + 7) : 2 = 22 : 2 = 11'],
        },
        {
          type: 'text',
          text: '11 is te klein, dus probeer een groter getal; met 7 kom je op 14.',
        },
        {
          type: 'worked',
          title: 'De helft aan kleren, € 6 aan een lunch, € 9 over',
          lines: ['9 + 6 = 15', '15 × 2 = 30'],
        },
        {
          type: 'worked',
          title: 'Eerst € 6, dan de helft van wat je over hebt, € 9 over',
          lines: ['9 × 2 = 18', '18 + 6 = 24'],
        },
        { type: 'text', text: 'De volgorde maakt uit.' },
        {
          type: 'worked',
          title: 'Een derde aan kleren, dan € 5 aan een lunch, € 15 over',
          lines: ['15 + 5 = 20', '20 : 2 × 3 = 30'],
        },
        {
          type: 'text',
          text: 'Na een derde uitgeven is € 20 nog 2/3 van wat je had.',
        },
        {
          type: 'tip',
          text: 'Werk van achter naar voren en doe telkens het omgekeerde: × wordt :, + wordt −.',
        },
      ],
    },
    {
      id: 'guessAndCheck',
      title: 'Slim proberen',
      summary: 'Gok, controleer en verbeter',
      blocks: [
        {
          type: 'text',
          text: 'Doe een gok, kijk hoeveel je ernaast zit en reken uit wat één verandering doet.',
        },
        {
          type: 'table',
          head: ['Kippen', 'Konijnen', 'Poten'],
          rows: [
            ['10', '0', '20'],
            ['8', '2', '24'],
            ['6', '4', '28'],
          ],
        },
        {
          type: 'worked',
          title: '10 koppen en 28 poten, eerst allemaal kippen',
          lines: ['10 × 2 = 20', '28 − 20 = 8', '8 : 2 = 4'],
        },
        {
          type: 'text',
          text: 'Elk konijn heeft 2 poten meer, dus 4 konijnen en 6 kippen.',
        },
        { type: 'worked', title: 'Controle', lines: ['6 × 2 + 4 × 4 = 12 + 16 = 28'] },
        {
          type: 'worked',
          title: 'Samen 50, verschil 14',
          lines: ['50 : 2 = 25', '14 : 2 = 7', '25 + 7 = 32', '25 − 7 = 18'],
        },
        {
          type: 'text',
          text: 'Begin bij twee gelijke getallen en schuif elk de helft van het verschil op.',
        },
        {
          type: 'worked',
          title: 'Hetzelfde, eerst het verschil eraf',
          lines: ['(50 − 14) : 2 = 36 : 2 = 18', '18 + 14 = 32'],
        },
        {
          type: 'tip',
          text: 'Lees wat gevraagd is: de konijnen of de kippen, het grootste of het kleinste getal.',
        },
      ],
    },
    {
      id: 'simplifySums',
      title: 'Vereenvoudigen: optellen en tellen',
      summary: 'Eerst een klein geval',
      blocks: [
        {
          type: 'text',
          text: 'Probeer dezelfde vraag met kleine getallen, zie het patroon en gebruik het.',
        },
        { type: 'worked', title: '1 + 2 + 3 + 4, in paren', lines: ['1 + 4 + 2 + 3 = 2 × 5 = 10'] },
        { type: 'worked', title: '1 tot en met 40, in paren', lines: ['20 × 41 = 820'] },
        { type: 'text', text: '1 + 40, 2 + 39, … zijn 20 paren van 41.' },
        {
          type: 'worked',
          title: '1 tot en met 40, via het gemiddelde',
          lines: ['(1 + 40) : 2 × 40 = 20,5 × 40 = 820'],
        },
        { type: 'worked', title: 'Van 37 tot en met 82', lines: ['82 − 37 + 1 = 46'] },
        {
          type: 'text',
          text: 'Klein geval: 3 tot en met 5 zijn 3 getallen, niet 5 − 3 = 2.',
        },
        { type: 'worked', title: 'Hetzelfde, door weg te laten', lines: ['82 − 36 = 46'] },
        { type: 'text', text: '1 tot en met 82, zonder 1 tot en met 36.' },
        {
          type: 'worked',
          title: 'Deelbaar door 7, van 1 tot en met 100',
          lines: ['14 × 7 = 98', '15 × 7 = 105'],
        },
        { type: 'text', text: '105 is te groot, dus 14 getallen.' },
        {
          type: 'worked',
          title: 'Pad van 40 m, om de 5 m een paaltje',
          lines: ['40 : 5 = 8', '8 + 1 = 9'],
        },
        {
          type: 'text',
          text: 'Klein geval: een pad van 10 m heeft 2 stukken en 3 paaltjes.',
        },
        {
          type: 'tip',
          text: 'Tel het begin en het eind allebei mee: van 37 tot en met 82 zijn 82 − 37 + 1 getallen.',
        },
      ],
    },
    {
      id: 'figurePatterns',
      title: 'Vereenvoudigen: figuurpatronen',
      summary: 'Hoeveel komt er per figuur bij',
      blocks: [
        {
          type: 'table',
          head: ['Figuur', 'Lucifers'],
          rows: [
            ['1', '4'],
            ['2', '7'],
            ['3', '10'],
            ['20', '61'],
          ],
        },
        { type: 'worked', title: 'Figuur 20', lines: ['4 + 19 × 3 = 4 + 57 = 61'] },
        {
          type: 'text',
          text: 'Elke figuur heeft 3 lucifers meer; van figuur 1 naar 20 zijn 19 stappen.',
        },
        {
          type: 'text',
          text: 'Of via figuur 0: de figuur vóór figuur 1 zou 4 − 3 = 1 lucifer hebben.',
        },
        { type: 'worked', lines: ['1 + 20 × 3 = 1 + 60 = 61'] },
        {
          type: 'worked',
          title: 'Welke figuur heeft 61 lucifers',
          lines: ['(61 − 4) : 3 + 1 = 57 : 3 + 1 = 20'],
        },
        {
          type: 'table',
          head: ['Patroon', 'Erbij per figuur', 'Figuur 1'],
          rows: [
            ['vierkantjes van lucifers', '3', '4'],
            ['driehoekjes van lucifers', '2', '3'],
            ['tafels met stoelen', '2', '4'],
          ],
        },
        { type: 'tip', text: 'Van figuur 1 naar figuur 20 zijn 19 stappen, geen 20.' },
      ],
    },
  ],
};
