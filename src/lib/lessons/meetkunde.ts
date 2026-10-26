import type { Lesson } from './types';

/** Lesstof for Meetkunde (lesstof spec §7.7). */
export const GEOMETRY_LESSON: Lesson = {
  setId: 'meetkunde',
  topics: [
    {
      id: 'perimeterArea',
      title: 'Omtrek en oppervlakte',
      summary: 'Vierkant, rechthoek, driehoek, trapezium',
      blocks: [
        {
          type: 'table',
          head: ['Figuur', 'Oppervlakte', 'Omtrek'],
          rows: [
            ['vierkant', 'z × z', '4 × z'],
            ['rechthoek', 'l × b', '2 × (l + b)'],
            ['driehoek', 'basis × hoogte : 2', 'de zijden samen'],
            ['parallellogram', 'basis × hoogte', '2 × (basis + schuine zijde)'],
            ['trapezium', '(a + b) : 2 × hoogte', 'de zijden samen'],
          ],
        },
        {
          type: 'text',
          text: 'De hoogte staat loodrecht op de basis; een schuine zijde is niet de hoogte.',
        },
        { type: 'worked', title: 'Driehoek, basis 8 cm, hoogte 5 cm', lines: ['8 × 5 : 2 = 20'] },
        {
          type: 'worked',
          title: 'Omtrek rechthoek 12 cm bij 5 cm',
          lines: ['2 × (12 + 5) = 2 × 17 = 34'],
        },
        {
          type: 'worked',
          title: 'Trapezium, zijden 6 cm en 10 cm, hoogte 4 cm',
          lines: ['(6 + 10) : 2 × 4 = 8 × 4 = 32'],
        },
        {
          type: 'text',
          text: 'Of splits het trapezium in een rechthoek van 6 bij 4 en twee driehoeken met samen een basis van 10 − 6 = 4 en hoogte 4.',
        },
        { type: 'worked', lines: ['6 × 4 + 4 × 4 : 2 = 24 + 8 = 32'] },
        { type: 'text', text: 'Reken eerst om naar dezelfde eenheid: 80 cm = 0,8 m.' },
        { type: 'worked', title: 'Tafelblad 1,6 m bij 80 cm, in m²', lines: ['1,6 × 0,8 = 1,28'] },
        {
          type: 'text',
          text: 'Een ontbrekende zijde: een rechthoek van 48 cm² en 6 cm breed is 48 : 6 lang; een rechthoek met omtrek 34 cm en een zijde van 5 cm heeft als andere zijde 34 : 2 − 5.',
        },
        { type: 'worked', lines: ['48 : 6 = 8', '34 : 2 − 5 = 12'] },
        { type: 'tip', text: 'Een driehoek is de helft van een rechthoek: deel nog door 2.' },
      ],
    },
    {
      id: 'circle',
      title: 'De cirkel',
      summary: 'Straal, diameter en π = 3,14',
      blocks: [
        {
          type: 'table',
          head: ['Wat', 'Formule'],
          rows: [
            ['diameter', '2 × straal'],
            ['omtrek', 'π × diameter'],
            ['oppervlakte', 'π × straal × straal'],
          ],
        },
        { type: 'worked', title: 'Omtrek, diameter 10 cm', lines: ['3,14 × 10 = 31,4'] },
        {
          type: 'worked',
          title: 'Oppervlakte, straal 5 cm',
          lines: ['3,14 × 5 × 5 = 3,14 × 25 = 78,5'],
        },
        {
          type: 'worked',
          title: 'Oppervlakte, diameter 10 cm',
          lines: ['10 : 2 = 5', '3,14 × 5 × 5 = 78,5'],
        },
        { type: 'tip', text: 'De straal is de helft van de diameter.' },
      ],
    },
    {
      id: 'solids',
      title: 'Ruimtefiguren',
      summary: 'Inhoud, oppervlakte en liters',
      blocks: [
        {
          type: 'table',
          head: ['Figuur', 'Inhoud', 'Oppervlakte'],
          rows: [
            ['kubus', 'z × z × z', '6 × z × z'],
            ['balk', 'l × b × h', '2 × (l × b + l × h + b × h)'],
            ['cilinder', 'π × straal × straal × hoogte', '—'],
          ],
        },
        {
          type: 'worked',
          title: 'Inhoud balk 8 bij 5 bij 3 cm',
          lines: ['8 × 5 × 3 = 40 × 3 = 120'],
        },
        {
          type: 'worked',
          title: 'Oppervlakte van die balk',
          lines: ['2 × (8 × 5 + 8 × 3 + 5 × 3) = 2 × (40 + 24 + 15) = 2 × 79 = 158'],
        },
        {
          type: 'worked',
          title: 'Cilinder, straal 5 cm, hoogte 4 cm',
          lines: ['3,14 × 5 × 5 × 4 = 3,14 × 100 = 314'],
        },
        { type: 'text', text: 'Reken liters in dm: 60 cm = 6 dm, 30 cm = 3 dm en 40 cm = 4 dm.' },
        {
          type: 'worked',
          title: 'Aquarium 60 bij 30 bij 40 cm, in liters',
          lines: ['6 × 3 × 4 = 72'],
        },
        { type: 'tip', text: 'Reken liters in dm: 1 dm³ = 1 L.' },
      ],
    },
    {
      id: 'pythagoras',
      title: 'Stelling van Pythagoras',
      summary: 'Kwadraten optellen of aftrekken',
      blocks: [
        {
          type: 'text',
          text: 'In een rechthoekige driehoek is het kwadraat van de schuine zijde (de langste zijde, tegenover de rechte hoek) gelijk aan de kwadraten van de rechthoekszijden samen.',
        },
        {
          type: 'worked',
          title: 'Schuine zijde bij 6 en 8',
          lines: ['6² + 8² = 36 + 64 = 100'],
        },
        { type: 'text', text: '√100 = 10.' },
        {
          type: 'worked',
          title: 'Rechthoekszijde bij 13 en 5',
          lines: ['13² − 5² = 169 − 25 = 144'],
        },
        { type: 'text', text: '√144 = 12.' },
        {
          type: 'table',
          head: ['a', 'b', 'c'],
          rows: [
            ['3', '4', '5'],
            ['6', '8', '10'],
            ['9', '12', '15'],
            ['12', '16', '20'],
            ['15', '20', '25'],
            ['5', '12', '13'],
            ['8', '15', '17'],
            ['7', '24', '25'],
          ],
        },
        {
          type: 'tip',
          text: 'Tel de kwadraten op voor de schuine zijde, trek ze af voor een rechthoekszijde, en neem daarna de wortel.',
        },
      ],
    },
    {
      id: 'angles',
      title: 'Hoeken',
      summary: 'Driehoek en veelhoek',
      blocks: [
        {
          type: 'text',
          text: 'De hoeken van een driehoek zijn samen 180°. Een gelijkbenige driehoek heeft twee gelijke basishoeken.',
        },
        {
          type: 'worked',
          lines: ['180 − 50 − 70 = 60', '(180 − 40) : 2 = 70', '180 − 2 × 70 = 40'],
        },
        { type: 'text', text: 'Een n-hoek kun je verdelen in n − 2 driehoeken.' },
        { type: 'worked', title: 'Zeshoek', lines: ['(6 − 2) × 180 = 720'] },
        { type: 'worked', title: 'Regelmatige achthoek', lines: ['(8 − 2) × 180 : 8 = 135'] },
        {
          type: 'text',
          text: 'Of via de buitenhoek: loop je om de figuur heen, dan draai je samen 360°. Bij een regelmatige veelhoek is elke draai even groot, en binnenhoek + buitenhoek = 180°.',
        },
        {
          type: 'worked',
          title: 'Regelmatige achthoek, via de buitenhoek',
          lines: ['360 : 8 = 45', '180 − 45 = 135'],
        },
        {
          type: 'table',
          head: ['Veelhoek', 'Samen', 'Eén hoek, regelmatig'],
          rows: [
            ['vierhoek', '360°', '90°'],
            ['vijfhoek', '540°', '108°'],
            ['zeshoek', '720°', '120°'],
            ['achthoek', '1080°', '135°'],
            ['tienhoek', '1440°', '144°'],
            ['twaalfhoek', '1800°', '150°'],
          ],
        },
        {
          type: 'tip',
          text: 'Een zeshoek kun je verdelen in 6 − 2 = 4 driehoeken: 4 × 180°.',
        },
      ],
    },
    {
      id: 'clock',
      title: 'De klok',
      summary: 'Elk uur is 30°',
      blocks: [
        { type: 'worked', title: 'Om 4 uur', lines: ['360 : 12 = 30', '4 × 30 = 120'] },
        {
          type: 'text',
          text: 'Bij een half uur staat de grote wijzer op de 6 en de kleine halverwege twee uren. Om half 4 (3:30) staat de kleine wijzer halverwege de 3 en de 4: 2,5 uur van de 6.',
        },
        { type: 'worked', title: 'Om half 4', lines: ['2,5 × 30 = 75'] },
        {
          type: 'text',
          text: 'Of via de minuten: de grote wijzer draait 6° per minuut (360 : 60), de kleine 0,5° (30 : 60). Reken beide standen vanaf de 12 uit en trek ze af.',
        },
        {
          type: 'worked',
          title: 'Om half 4, via de minuten',
          lines: ['30 × 6 = 180', '3 × 30 + 30 × 0,5 = 90 + 15 = 105', '180 − 105 = 75'],
        },
        {
          type: 'text',
          text: 'Na 6 uur tel je de andere kant om: om 9 uur is de hoek 3 × 30 = 90°.',
        },
        { type: 'tip', text: 'Om half 4 staat de kleine wijzer halverwege de 3 en de 4.' },
      ],
    },
    {
      id: 'symmetry',
      title: 'Symmetrie',
      summary: 'Spiegelen, draaien en puntsymmetrie',
      blocks: [
        {
          type: 'text',
          text: 'Langs een symmetrieas valt de figuur bij vouwen op zichzelf. De draaihoek is de kleinste draai waarna hij weer op zichzelf valt. Puntsymmetrisch is hij als dat na een halve draai (180°) gebeurt.',
        },
        {
          type: 'table',
          head: ['Figuur', 'Assen', 'Draaihoek', 'Puntsymmetrisch'],
          rows: [
            ['vierkant', '4', '90°', 'ja'],
            ['rechthoek (geen vierkant)', '2', '180°', 'ja'],
            ['ruit (geen vierkant)', '2', '180°', 'ja'],
            ['parallellogram (geen rechthoek of ruit)', '0', '180°', 'ja'],
            ['vlieger (geen ruit)', '1', '—', 'nee'],
            ['gelijkbenig trapezium (geen rechthoek)', '1', '—', 'nee'],
            ['gelijkzijdige driehoek', '3', '120°', 'nee'],
            ['gelijkbenige driehoek (niet gelijkzijdig)', '1', '—', 'nee'],
            ['regelmatige vijfhoek', '5', '72°', 'nee'],
            ['regelmatige zeshoek', '6', '60°', 'ja'],
            ['regelmatige achthoek', '8', '45°', 'ja'],
            ['regelmatige tienhoek', '10', '36°', 'ja'],
            ['regelmatige twaalfhoek', '12', '30°', 'ja'],
          ],
        },
        { type: 'worked', title: 'Regelmatige vijfhoek', lines: ['360 : 5 = 72'] },
        {
          type: 'tip',
          text: 'Een regelmatige n-hoek heeft n symmetrieassen en een draaihoek van 360° : n; hij is puntsymmetrisch als n even is.',
        },
      ],
    },
    {
      id: 'quadrilaterals',
      title: 'Vierhoeken',
      summary: 'Eigenschappen en wie is wat',
      blocks: [
        {
          type: 'text',
          text: 'De definities zijn ruim: een trapezium heeft minstens één paar evenwijdige zijden, een vlieger een diagonaal die symmetrieas is. X is een Y als X altijd alle eigenschappen van Y heeft.',
        },
        {
          type: 'table',
          head: ['Figuur', 'Altijd'],
          rows: [
            ['vierkant', 'alles van de rechthoek en de ruit'],
            [
              'rechthoek',
              'vier rechte hoeken, overstaande zijden evenwijdig, diagonalen even lang en ze delen elkaar middendoor',
            ],
            [
              'ruit',
              'vier gelijke zijden, overstaande zijden evenwijdig, een diagonaal is symmetrieas, diagonalen loodrecht en ze delen elkaar middendoor',
            ],
            ['parallellogram', 'overstaande zijden evenwijdig, diagonalen delen elkaar middendoor'],
            ['trapezium', 'minstens twee zijden evenwijdig'],
            ['vlieger', 'een diagonaal is symmetrieas, diagonalen loodrecht'],
          ],
        },
        {
          type: 'table',
          head: ['Figuur', 'Is ook een'],
          rows: [
            ['vierkant', 'rechthoek, ruit, parallellogram, trapezium, vlieger'],
            ['rechthoek', 'parallellogram, trapezium'],
            ['ruit', 'parallellogram, trapezium, vlieger'],
            ['parallellogram', 'trapezium'],
            ['trapezium', '—'],
            ['vlieger', '—'],
          ],
        },
        { type: 'tip', text: 'Elk vierkant is ook een rechthoek en een ruit.' },
      ],
    },
    {
      id: 'triangles',
      title: 'Driehoeken',
      summary: 'Soorten en welke bestaan',
      blocks: [
        {
          type: 'table',
          head: ['Soort', 'Betekent'],
          rows: [
            ['scherphoekig', 'alle hoeken kleiner dan 90°'],
            ['rechthoekig', 'één hoek van 90°'],
            ['stomphoekig', 'één hoek groter dan 90°'],
            ['gelijkbenig', 'minstens twee zijden even lang'],
            ['gelijkzijdig', 'drie zijden even lang, alle hoeken 60°'],
          ],
        },
        {
          type: 'text',
          text: 'De hoeken zijn samen 180°, dus een driehoek heeft hoogstens één rechte of stompe hoek. Elke gelijkzijdige driehoek is ook gelijkbenig.',
        },
        {
          type: 'text',
          text: 'De twee kortste zijden samen moeten langer zijn dan de langste: met 2, 3 en 6 cm bestaat er geen driehoek (2 + 3 is kleiner dan 6), met 3, 4 en 6 cm wel.',
        },
        {
          type: 'tip',
          text: 'De twee kortste zijden samen moeten langer zijn dan de langste.',
        },
      ],
    },
  ],
};
