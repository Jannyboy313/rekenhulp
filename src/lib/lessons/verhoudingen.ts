import { SLOT } from '../slot';
import type { Lesson } from './types';

/** Lesstof for Verhoudingen (lesstof spec §7.3). */
export const PROPORTIONS_LESSON: Lesson = {
  setId: 'verhoudingen',
  topics: [
    {
      id: 'percentages',
      title: 'Procenten',
      summary: 'Via 1%, 10%, 25% en 50%',
      blocks: [
        {
          type: 'text',
          text: 'Procent betekent honderdste. Reken via een percentage dat je meteen ziet.',
        },
        {
          type: 'table',
          head: ['Procent', 'Breuk', 'Reken'],
          rows: [
            ['1%', '1/100', ': 100'],
            ['5%', '1/20', '10% : 2'],
            ['10%', '1/10', ': 10'],
            ['12,5%', '1/8', ': 8'],
            ['20%', '1/5', ': 5'],
            ['25%', '1/4', ': 4'],
            ['50%', '1/2', ': 2'],
          ],
        },
        { type: 'worked', title: '30% van 80', lines: ['80 : 10 = 8', '3 × 8 = 24'] },
        {
          type: 'worked',
          title: '15% van 80',
          lines: ['80 : 10 = 8', '8 : 2 = 4', '8 + 4 = 12'],
        },
        { type: 'text', text: '10% is 8 en 5% is 4, dus 15% is 12.' },
        {
          type: 'worked',
          title: '30 is hoeveel procent van 120',
          lines: ['30 : 120 = 1/4 = 25/100'],
        },
        { type: 'text', text: 'Reken deel : geheel en vermenigvuldig met 100: 25%.' },
        {
          type: 'text',
          text: 'Of met een verhoudingstabel: 120 hoort bij 100%. 120 : 4 = 30, dus 100% : 4 = 25%.',
        },
        {
          type: 'table',
          head: ['Getal', 'Procent'],
          rows: [
            ['120', '100%'],
            ['30', '25%'],
          ],
        },
        {
          type: 'worked',
          title: '20% is 14, hoeveel is 100%',
          lines: ['14 : 2 = 7', '10 × 7 = 70'],
        },
        { type: 'text', text: '20% is 14, dus 10% is 7 en 100% is 70.' },
        { type: 'tip', text: 'Deel : geheel is nog geen percentage; × 100 geeft het percentage.' },
      ],
    },
    {
      id: 'priceChange',
      title: 'Korting, verhoging en btw',
      summary: 'De nieuwe en de oude prijs',
      blocks: [
        {
          type: 'text',
          text: 'Bij korting trek je het bedrag af; bij een verhoging en bij btw tel je het op.',
        },
        {
          type: 'worked',
          title: '€\u{a0}60 na 25% korting',
          lines: ['60 : 4 = 15', '60 − 15 = 45'],
        },
        {
          type: 'worked',
          title: '€\u{a0}60 na 25% korting, in één keer',
          lines: ['3/4 × 60 = 60 : 4 × 3 = 45'],
        },
        { type: 'text', text: 'Na 25% korting betaal je 75%, dat is 3/4 van de prijs.' },
        {
          type: 'worked',
          title: '€\u{a0}80 met 21% btw',
          lines: [
            '80 : 10 = 8',
            '2 × 8 = 16',
            '80 : 100 = 0,80',
            '16 + 0,80 = 16,80',
            '80 + 16,80 = 96,80',
          ],
        },
        { type: 'text', text: '21% is 20% + 1%.' },
        {
          type: 'text',
          text: 'Terug naar de oude prijs: na 25% korting is de nieuwe prijs 75%; met 21% btw is de prijs 121%.',
        },
        {
          type: 'worked',
          title: 'Na 25% korting €\u{a0}60, oude prijs',
          lines: ['60 : 3 = 20', '4 × 20 = 80'],
        },
        { type: 'text', text: '75% is 60, dus 25% is 20 en 100% is 80.' },
        {
          type: 'worked',
          title: '€\u{a0}96,80 met 21% btw, zonder btw',
          lines: ['96,80 : 121 = 0,80', '100 × 0,80 = 80'],
        },
        {
          type: 'tip',
          text: 'De korting is een percentage van de oude prijs, niet van de nieuwe.',
        },
      ],
    },
    {
      id: 'percentChange',
      title: 'Procentuele verandering',
      summary: 'Stijging of daling in procenten',
      blocks: [
        {
          type: 'text',
          text: 'Reken eerst de verandering uit: nieuw − oud, of oud − nieuw. Neem die verandering dan als percentage van de oude waarde.',
        },
        {
          type: 'worked',
          title: '€\u{a0}80 naar €\u{a0}92',
          lines: ['92 − 80 = 12', '12 : 80 = 15/100'],
        },
        { type: 'text', text: 'Dat is 15% stijging.' },
        {
          type: 'worked',
          title: '400 naar 340 bezoekers',
          lines: ['400 − 340 = 60', '60 : 400 = 15/100'],
        },
        { type: 'text', text: 'Dat is 15% daling.' },
        { type: 'text', text: 'Of neem de nieuwe waarde als percentage van de oude.' },
        {
          type: 'worked',
          title: 'Nieuw als percentage van oud',
          lines: ['92 : 80 = 115/100', '340 : 400 = 85/100'],
        },
        {
          type: 'text',
          text: '115% is 15% meer dan 100%: 15% stijging. 85% is 15% minder: 15% daling.',
        },
        {
          type: 'tip',
          text: 'Reken met de oude waarde: de stijging is een percentage van 80, niet van 92.',
        },
      ],
    },
    {
      id: 'ratios',
      title: 'Verhoudingen',
      summary: 'Beide getallen met hetzelfde getal',
      blocks: [
        {
          type: 'text',
          text: 'Bij een verhouding vermenigvuldig of deel je beide getallen met hetzelfde getal.',
        },
        { type: 'worked', title: `3 : 5 = 12 : ${SLOT}`, lines: ['12 : 3 = 4', '5 × 4 = 20'] },
        {
          type: 'table',
          head: ['Personen', 'Pasta (g)'],
          rows: [
            ['4', '300'],
            ['2', '150'],
            ['6', '450'],
          ],
        },
        {
          type: 'text',
          text: 'Een verhoudingstabel gaat via een tussenstap die beide getallen bereiken, hier 2 personen.',
        },
        {
          type: 'worked',
          title: 'Verdeel 60 in de verhouding 2 : 3',
          lines: ['2 + 3 = 5', '60 : 5 = 12', '3 × 12 = 36'],
        },
        {
          type: 'text',
          text: 'Samen 5 delen, 1 deel is 12; het grootste deel is 3 delen.',
        },
        {
          type: 'tip',
          text: 'Bij een verhouding vermenigvuldig of deel je beide getallen met hetzelfde getal; het verschil blijft niet gelijk.',
        },
      ],
    },
    {
      id: 'ratioProblems',
      title: 'Deel van het geheel en mengen',
      summary: 'Tel eerst de delen op',
      blocks: [
        {
          type: 'text',
          text: 'Jongens : meisjes = 2 : 3 vergelijkt twee groepen. De hele klas is 2 + 3 = 5 delen.',
        },
        {
          type: 'worked',
          title: 'Jongens : meisjes = 2 : 3, deel jongens',
          lines: ['2/5 = 40/100'],
        },
        { type: 'text', text: 'Het deel jongens is 2/5, dat is 40%.' },
        {
          type: 'worked',
          title: 'Siroop : water = 1 : 6, siroop in 350 ml limonade',
          lines: ['1 + 6 = 7', '350 : 7 = 50'],
        },
        {
          type: 'text',
          text: 'Of met een verhoudingstabel: van 7 delen naar 350 ml is × 50, dus siroop is 1 × 50 = 50 ml.',
        },
        {
          type: 'table',
          head: ['Siroop', 'Water', 'Limonade'],
          rows: [
            ['1 deel', '6 delen', '7 delen'],
            ['50 ml', '300 ml', '350 ml'],
          ],
        },
        {
          type: 'worked',
          title: 'Cement : zand = 2 : 5, zand bij 100 kg cement',
          lines: ['100 : 2 = 50', '5 × 50 = 250'],
        },
        {
          type: 'tip',
          text: '2 : 3 is jongens tegenover meisjes. Het geheel is 2 + 3 = 5 delen, dus 2/5.',
        },
      ],
    },
    {
      id: 'perUnit',
      title: 'Prijs per eenheid',
      summary: 'Een tussenstap via 100 g, 1 L of 1 uur',
      blocks: [
        {
          type: 'text',
          text: 'Is geen van de hoeveelheden een veelvoud van de andere, reken dan via een handige eenheid.',
        },
        {
          type: 'table',
          head: ['Kaas', 'Prijs'],
          rows: [
            ['1,5 kg', '€\u{a0}12'],
            ['100 g', '€\u{a0}0,80'],
            ['400 g', '€\u{a0}3,20'],
          ],
        },
        { type: 'text', text: '1,5 kg = 1500 g, dat is 15 keer 100 g.' },
        {
          type: 'worked',
          title: '1,5 kg kost €\u{a0}12, wat kost 400 g',
          lines: ['12 : 15 = 0,80', '4 × 0,80 = 3,20'],
        },
        {
          type: 'text',
          text: 'Of in kleine stappen met een verhoudingstabel: : 3, dan : 5, dan × 4.',
        },
        {
          type: 'table',
          head: ['Kaas', 'Prijs'],
          rows: [
            ['1,5 kg', '€\u{a0}12'],
            ['500 g', '€\u{a0}4'],
            ['100 g', '€\u{a0}0,80'],
            ['400 g', '€\u{a0}3,20'],
          ],
        },
        {
          type: 'tip',
          text: 'Controleer de richting: 400 g is minder dan 1,5 kg, dus het kost minder dan €\u{a0}12.',
        },
      ],
    },
    {
      id: 'scale',
      title: 'Schaal',
      summary: '1 cm op de kaart is … in het echt',
      blocks: [
        {
          type: 'text',
          text: 'Schaal 1 : 25\u{202f}000 betekent: 1 cm op de kaart is 25\u{202f}000 cm in het echt. Reken dat om naar m of km: 1 m = 100 cm en 1 km = 100\u{202f}000 cm.',
        },
        {
          type: 'table',
          head: ['Schaal', '1 cm is'],
          rows: [
            ['1 : 100', '1 m'],
            ['1 : 1000', '10 m'],
            ['1 : 25\u{202f}000', '250 m'],
            ['1 : 50\u{202f}000', '500 m'],
            ['1 : 100\u{202f}000', '1 km'],
            ['1 : 1\u{202f}000\u{202f}000', '10 km'],
          ],
        },
        {
          type: 'worked',
          title: 'Schaal 1 : 25\u{202f}000, 4 cm op de kaart in km',
          lines: ['25\u{202f}000 : 100\u{202f}000 = 0,25', '4 × 0,25 = 1'],
        },
        {
          type: 'text',
          text: 'Of met een verhoudingstabel: eerst × 4, pas daarna omrekenen naar km.',
        },
        {
          type: 'table',
          head: ['Kaart', 'In het echt'],
          rows: [
            ['1 cm', '25\u{202f}000 cm'],
            ['4 cm', '100\u{202f}000 cm = 1 km'],
          ],
        },
        {
          type: 'worked',
          title: 'Schaal 1 : 50\u{202f}000, 3 km op de kaart in cm',
          lines: ['50\u{202f}000 : 100\u{202f}000 = 0,5', '3 : 0,5 = 6'],
        },
        {
          type: 'worked',
          title: '4 cm op de kaart is 2 km, schaal',
          lines: ['2 × 100\u{202f}000 = 200\u{202f}000', '200\u{202f}000 : 4 = 50\u{202f}000'],
        },
        { type: 'tip', text: 'Reken in dezelfde eenheid: 1 km = 100\u{202f}000 cm.' },
      ],
    },
  ],
};
