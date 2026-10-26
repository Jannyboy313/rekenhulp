import type { Lesson } from './types';

/** Lesstof for Meten (lesstof spec §7.2). */
export const MEASUREMENT_LESSON: Lesson = {
  setId: 'meten',
  topics: [
    {
      id: 'metric',
      title: 'Lengte en gewicht',
      summary: 'Voorvoegsels en de komma verschuiven',
      blocks: [
        {
          type: 'table',
          head: ['Voorvoegsel', 'Betekent', 'Voorbeeld'],
          rows: [
            ['kilo', '1000', '1 km = 1000 m'],
            ['hecto', '100', '1 hl = 100 L'],
            ['deca', '10', '1 dam = 10 m'],
            ['deci', '0,1', '1 dm = 0,1 m'],
            ['centi', '0,01', '1 cl = 0,01 L'],
            ['milli', '0,001', '1 mg = 0,001 g'],
          ],
        },
        {
          type: 'table',
          head: ['Eenheid', 'Is'],
          rows: [
            ['1 km', '1000 m'],
            ['1 m', '10 dm = 100 cm = 1000 mm'],
            ['1 ton', '1000 kg'],
            ['1 kg', '1000 g'],
            ['1 g', '1000 mg'],
          ],
        },
        {
          type: 'text',
          text: 'Naar een kleinere eenheid wordt het getal groter: vermenigvuldig. Naar een grotere eenheid wordt het kleiner: deel. Elke factor 10 verschuift de komma één plaats.',
        },
        { type: 'worked', title: '3,5 km naar m', lines: ['3,5 × 1000 = 3500'] },
        { type: 'worked', title: '250 g naar kg', lines: ['250 : 1000 = 0,25'] },
        { type: 'worked', title: '47 mm naar dm', lines: ['47 : 100 = 0,47'] },
        {
          type: 'tip',
          text: 'Een kleinere eenheid past vaker, dus het getal wordt groter. Bepaal eerst de richting.',
        },
      ],
    },
    {
      id: 'area',
      title: 'Oppervlakte',
      summary: 'Elke stap ×100',
      blocks: [
        {
          type: 'text',
          text: '1 m² is een vierkant van 10 dm bij 10 dm, dus 1 m² = 100 dm². Elke stap is ×100: de komma verschuift twee plaatsen.',
        },
        { type: 'worked', title: '1 m² in cm²', lines: ['100 × 100 = 10\u{202f}000'] },
        {
          type: 'table',
          head: ['Eenheid', 'Is'],
          rows: [
            ['1 cm²', '100 mm²'],
            ['1 dm²', '100 cm²'],
            ['1 m²', '100 dm²'],
            ['1 are', '100 m² (10 m bij 10 m)'],
            ['1 ha', '100 are = 10\u{202f}000 m² (100 m bij 100 m)'],
            ['1 km²', '100 ha'],
          ],
        },
        {
          type: 'worked',
          title: '2,5 ha naar m²',
          lines: ['2,5 × 10\u{202f}000 = 25\u{202f}000'],
        },
        { type: 'worked', title: '350 cm² naar dm²', lines: ['350 : 100 = 3,5'] },
        { type: 'tip', text: 'Bij oppervlakte is elke stap ×100 (10 × 10), niet ×10.' },
      ],
    },
    {
      id: 'volume',
      title: 'Inhoud',
      summary: 'Kubieke eenheden en liters',
      blocks: [
        {
          type: 'text',
          text: '1 dm³ is een kubus van 10 bij 10 bij 10 cm, dus 1 dm³ = 1000 cm³. Elke kubieke stap is ×1000: de komma verschuift drie plaatsen.',
        },
        {
          type: 'text',
          text: 'Liters gaan zoals lengte: ml → cl → dl → L, elke stap ×10. En 1 hl = 100 L.',
        },
        {
          type: 'table',
          head: ['Kubiek', 'Liter'],
          rows: [
            ['1 cm³', '1 ml'],
            ['1 dm³', '1 L'],
            ['1 m³', '1000 L'],
          ],
        },
        { type: 'text', text: '1 L = 1 dm³ = 1000 cm³:' },
        { type: 'worked', title: '3,5 L naar cm³', lines: ['3,5 × 1000 = 3500'] },
        { type: 'worked', title: '0,4 m³ naar L', lines: ['0,4 × 1000 = 400'] },
        { type: 'worked', title: '250 ml naar dl', lines: ['250 : 100 = 2,5'] },
        { type: 'tip', text: 'Bij kubieke eenheden is elke stap ×1000 (10 × 10 × 10), niet ×10.' },
      ],
    },
    {
      id: 'largeNumbers',
      title: 'Grote getallen',
      summary: 'Miljoen, miljard, biljoen',
      blocks: [
        {
          type: 'table',
          head: ['Naam', 'Macht'],
          rows: [
            ['duizend', '10³'],
            ['miljoen', '10⁶'],
            ['miljard', '10⁹'],
            ['biljoen', '10¹²'],
            ['biljard', '10¹⁵'],
            ['triljoen', '10¹⁸'],
            ['triljard', '10²¹'],
            ['quadriljoen', '10²⁴'],
          ],
        },
        { type: 'text', text: 'Elke volgende naam is ×1000: de exponent gaat 3 omhoog.' },
        {
          type: 'text',
          text: 'Bij vermenigvuldigen tel je de exponenten van 10 op: 10² × 10⁶ = 10⁸.',
        },
        {
          type: 'worked',
          title: '250 miljoen als macht van 10',
          lines: ['250 × 10⁶ = 2,5 × 10² × 10⁶ = 2,5 × 10⁸'],
        },
        { type: 'worked', title: '3,5 biljoen in miljard', lines: ['3,5 × 1000 = 3500'] },
        { type: 'worked', title: '2,5 × 10⁹ in miljoen', lines: ['2,5 × 10⁹ = 2500 × 10⁶'] },
        { type: 'tip', text: 'Een biljoen is 10¹²; 10⁹ is een miljard (Engels: billion).' },
      ],
    },
    {
      id: 'time',
      title: 'Tijd',
      summary: 'Rekenen met 60 en 24',
      blocks: [
        {
          type: 'text',
          text: 'Tijd is niet tientallig: 1 min = 60 s, 1 uur = 60 min = 3600 s en 1 dag = 24 uur.',
        },
        {
          type: 'table',
          head: ['Deel van een uur', 'Minuten'],
          rows: [
            ['0,1', '6'],
            ['0,2', '12'],
            ['1/4 = 0,25', '15'],
            ['1/3', '20'],
            ['1/2 = 0,5', '30'],
            ['3/4 = 0,75', '45'],
          ],
        },
        {
          type: 'worked',
          title: '2,25 uur naar min',
          lines: ['2,25 × 60 = 2 × 60 + 0,25 × 60 = 120 + 15 = 135'],
        },
        {
          type: 'worked',
          title: '2,25 uur naar min, met breuken',
          lines: ['2,25 = 2 + 1/4', '1/4 × 60 = 60 : 4 = 15', '2 × 60 + 15 = 135'],
        },
        {
          type: 'text',
          text: '0,25 uur is een kwartier: 1/4 van 60 min.',
        },
        { type: 'worked', title: '150 min naar uur', lines: ['150 : 60 = 2,5'] },
        {
          type: 'text',
          text: '150 min = 120 min + 30 min: 2 uur en een half uur.',
        },
        { type: 'worked', title: '3,5 dag naar uur', lines: ['3,5 × 24 = 72 + 12 = 84'] },
        {
          type: 'tip',
          text: '0,5 uur is 30 min, niet 50 min. En 30 min is 0,5 uur, niet 0,3 uur.',
        },
      ],
    },
    {
      id: 'speed',
      title: 'Snelheid',
      summary: 'Afstand, tijd en km/u',
      blocks: [
        {
          type: 'text',
          text: 'km/u is de afstand in één uur. Afstand = snelheid × tijd, met de tijd in uren. Zonder formule: maak een verhoudingstabel naar 60 min.',
        },
        {
          type: 'table',
          head: ['Tijd', 'Afstand'],
          rows: [
            ['20 min', '6 km'],
            ['60 min', '18 km'],
          ],
        },
        {
          type: 'text',
          text: 'Drie keer zo lang is drie keer zo ver, dus 18 km/u.',
        },
        { type: 'worked', title: '6 km in 20 min', lines: ['60 : 20 = 3', '6 × 3 = 18'] },
        {
          type: 'worked',
          title: '80 km/u, hoeveel km in 45 min',
          lines: ['80 × 3/4 = 80 : 4 × 3 = 60'],
        },
        {
          type: 'worked',
          title: '5 km/u, hoe lang over 2 km',
          lines: ['60 : 5 = 12', '2 × 12 = 24'],
        },
        { type: 'text', text: '1 km duurt 12 min, dus 2 km duurt 24 min.' },
        {
          type: 'tip',
          text: 'km/u is per uur: reken eerst uit hoeveel km je in 60 min aflegt.',
        },
      ],
    },
    {
      id: 'metersPerSecond',
      title: 'km/u en m/s',
      summary: 'Keer of gedeeld door 3,6',
      blocks: [
        { type: 'text', text: '1 m/s is 3600 m per uur, dat is 3,6 km/u.' },
        { type: 'worked', title: '1 m/s in km/u', lines: ['1 × 3600 : 1000 = 3,6'] },
        {
          type: 'text',
          text: '3,6 = 18/5, dus ×3,6 is eerst :5 en dan ×18, en :3,6 is eerst :18 en dan ×5.',
        },
        {
          type: 'worked',
          title: '15 m/s naar km/u',
          lines: ['15 × 3,6 = 15 : 5 × 18 = 3 × 18 = 54'],
        },
        {
          type: 'worked',
          title: '72 km/u naar m/s',
          lines: ['72 : 3,6 = 72 : 18 × 5 = 4 × 5 = 20'],
        },
        {
          type: 'table',
          head: ['m/s', 'km/u'],
          rows: [5, 10, 15, 20, 25, 30, 35, 40].map((ms) => [`${ms}`, `${(ms * 18) / 5}`]),
        },
        { type: 'tip', text: 'Naar m/s wordt het getal kleiner: deel door 3,6.' },
      ],
    },
  ],
};
