import type { Lesson } from './types';

/** Lesstof for Verbanden & statistiek (lesstof spec §7.8). */
export const RELATIONS_LESSON: Lesson = {
  setId: 'verbanden',
  topics: [
    {
      id: 'mean',
      title: 'Gemiddelde',
      summary: 'Alles optellen, delen door het aantal',
      blocks: [
        { type: 'text', text: 'Tel alle getallen op en deel door hoeveel getallen het zijn.' },
        {
          type: 'worked',
          title: 'Cijfers 8, 9, 6, 9, 8',
          lines: ['(8 + 9 + 6 + 9 + 8) : 5 = 40 : 5 = 8'],
        },
        {
          type: 'text',
          text: 'Of kies een rond getal als gok, schrijf elk getal als verschil met die gok en verdeel het totale verschil.',
        },
        {
          type: 'worked',
          title: 'Cijfers 8, 9, 6, 9, 8, vanaf 7',
          lines: ['7 + (1 + 2 − 1 + 2 + 1) : 5 = 7 + 5 : 5 = 8'],
        },
        {
          type: 'worked',
          title: 'Gemiddeld een 7 bij 4 cijfers, je hebt 6, 8 en 5',
          lines: ['4 × 7 = 28', '28 − 6 − 8 − 5 = 9'],
        },
        { type: 'text', text: 'Samen moeten de 4 cijfers 28 zijn.' },
        { type: 'worked', title: 'Hetzelfde, vanaf 7', lines: ['7 − (−1 + 1 − 2) = 7 + 2 = 9'] },
        {
          type: 'text',
          text: '6, 8 en 5 liggen samen 2 onder de 7, dus het laatste cijfer moet 2 boven de 7 liggen.',
        },
        { type: 'tip', text: 'Deel de som nog door het aantal getallen.' },
      ],
    },
    {
      id: 'median',
      title: 'Mediaan, modus en spreidingsbreedte',
      summary: 'Eerst op volgorde',
      blocks: [
        {
          type: 'table',
          head: ['Maat', 'Wat'],
          rows: [
            ['mediaan', 'het middelste getal op volgorde'],
            ['modus', 'het getal dat het vaakst voorkomt'],
            ['spreidingsbreedte', 'hoogste − laagste'],
          ],
        },
        {
          type: 'table',
          head: ['Getallen', 'Op volgorde', 'Mediaan'],
          rows: [
            ['4, −2, 3, 0, 5, 1, −4', '−4, −2, 0, 1, 3, 4, 5', '1'],
            ['8, 6, 10, 7, 5, 9', '5, 6, 7, 8, 9, 10', '7,5'],
          ],
        },
        {
          type: 'text',
          text: 'Bij een even aantal getallen zijn er twee middelste; de mediaan is hun gemiddelde.',
        },
        { type: 'worked', title: 'Twee middelste getallen 7 en 8', lines: ['(7 + 8) : 2 = 7,5'] },
        {
          type: 'text',
          text: 'Zonder alles te sorteren: streep steeds het laagste en het hoogste getal weg, tot er één of twee over zijn.',
        },
        { type: 'text', text: 'De modus van 2, 0, 3, 1, 2 is 2 (2 keer).' },
        {
          type: 'worked',
          title: 'Spreidingsbreedte van −4 °C tot 5 °C',
          lines: ['5 − (−4) = 5 + 4 = 9'],
        },
        {
          type: 'tip',
          text: 'Zet de getallen eerst op volgorde; de mediaan is het middelste getal.',
        },
      ],
    },
    {
      id: 'percentagePoints',
      title: 'Procentpunten',
      summary: 'Verschil tussen twee percentages',
      blocks: [
        {
          type: 'text',
          text: 'Het verschil tussen twee percentages is in procentpunten. De verandering als percentage van het oude percentage is in procent.',
        },
        {
          type: 'worked',
          title: 'De rente gaat van 4% naar 5%',
          lines: ['5 − 4 = 1', '1 : 4 = 25/100'],
        },
        { type: 'text', text: 'Dat is 1 procentpunt, en 25% stijging.' },
        {
          type: 'worked',
          title: 'De rente is 4% en stijgt met 25%',
          lines: ['4 : 4 = 1', '4 + 1 = 5'],
        },
        { type: 'text', text: '25% van 4 is 1 procentpunt, dus de rente wordt 5%.' },
        { type: 'worked', title: 'Hetzelfde, in één keer', lines: ['4 × 5/4 = 5'] },
        { type: 'text', text: 'Je krijgt 125% van 4, dat is 5/4 van 4.' },
        {
          type: 'table',
          head: ['Van', 'Naar', 'Procentpunt', 'Procent'],
          rows: [
            ['4%', '5%', '1', '25% stijging'],
            ['8%', '6%', '2', '25% daling'],
            ['50%', '75%', '25', '50% stijging'],
          ],
        },
        {
          type: 'tip',
          text: 'Procentpunten is het verschil tussen de percentages: 5 − 4 = 1.',
        },
      ],
    },
    {
      id: 'sequences',
      title: 'Rijen',
      summary: 'Het volgende en het n-de getal',
      blocks: [
        {
          type: 'text',
          text: 'Een rekenkundige rij telt er steeds hetzelfde getal bij op, een meetkundige rij vermenigvuldigt steeds met hetzelfde getal.',
        },
        { type: 'worked', title: '3, 7, 11, 15', lines: ['15 + 4 = 19'] },
        { type: 'worked', title: '3, 6, 12, 24', lines: ['24 × 2 = 48'] },
        { type: 'worked', title: '160, 80, 40, 20', lines: ['20 : 2 = 10'] },
        {
          type: 'worked',
          title: '20e getal van 3, 7, 11, 15',
          lines: ['3 + 19 × 4 = 3 + 76 = 79'],
        },
        { type: 'text', text: 'Van het 1e naar het 20e getal zijn 19 stappen.' },
        {
          type: 'text',
          text: 'Of via het 0e getal: het getal vóór het eerste is 3 − 4 = −1, dus het 20e getal is −1 plus 20 stappen.',
        },
        { type: 'worked', lines: ['−1 + 20 × 4 = −1 + 80 = 79'] },
        {
          type: 'table',
          head: ['n', 'Driehoeksgetal', 'Kwadraatgetal'],
          rows: [
            ['1', '1', '1'],
            ['2', '3', '4'],
            ['3', '6', '9'],
            ['4', '10', '16'],
            ['5', '15', '25'],
            ['6', '21', '36'],
            ['7', '28', '49'],
            ['8', '36', '64'],
          ],
        },
        {
          type: 'worked',
          title: '8e driehoeksgetal',
          lines: ['1 + 2 + 3 + 4 + 5 + 6 + 7 + 8 = 8 × 9 : 2 = 36'],
        },
        { type: 'worked', title: '15e kwadraatgetal', lines: ['15 × 15 = 225'] },
        { type: 'tip', text: 'Van het 1e naar het 20e getal zijn 19 stappen, geen 20.' },
      ],
    },
    {
      id: 'formulas',
      title: 'Formules',
      summary: 'Invullen, hellingsgetal en startgetal',
      blocks: [
        {
          type: 'text',
          text: 'Vul het getal in en volg de volgorde van bewerkingen; 3x betekent 3 × x.',
        },
        {
          type: 'worked',
          title: 'Taxi: 4 + 2,50 × aantal km, rit van 12 km',
          lines: ['4 + 2,50 × 12 = 4 + 30 = 34'],
        },
        {
          type: 'worked',
          title: 'y = 3x − 4 bij x = −2',
          lines: ['3 × (−2) − 4 = −6 − 4 = −10'],
        },
        {
          type: 'text',
          text: 'In de tabel van een formule y = ax + b verandert y bij elke stap van x evenveel. Het hellingsgetal is die verandering per 1, het startgetal is y bij x = 0.',
        },
        {
          type: 'table',
          head: ['x', 'y'],
          rows: [
            ['2', '11'],
            ['4', '17'],
            ['6', '23'],
            ['8', '29'],
          ],
        },
        { type: 'worked', title: 'Hellingsgetal', lines: ['(17 − 11) : (4 − 2) = 6 : 2 = 3'] },
        { type: 'worked', title: 'Startgetal', lines: ['11 − 2 × 3 = 11 − 6 = 5'] },
        {
          type: 'text',
          text: 'Van x = 2 terug naar x = 0 zijn 2 stappen van 3; de formule is y = 3x + 5.',
        },
        {
          type: 'text',
          text: 'Of maak de tabel naar achteren langer: x = 0 is één x-stap van 2 vóór x = 2, dus y wordt 6 kleiner: 11 − 6 = 5.',
        },
        {
          type: 'tip',
          text: 'Het startgetal is y bij x = 0, niet bij de eerste x van de tabel.',
        },
      ],
    },
    {
      id: 'equations',
      title: 'Vergelijkingen',
      summary: 'Aan beide kanten hetzelfde doen',
      blocks: [
        {
          type: 'text',
          text: 'Een vergelijking is een balans: doe aan beide kanten hetzelfde tot x alleen staat.',
        },
        {
          type: 'table',
          head: ['Stap', 'Vergelijking'],
          rows: [
            ['begin', '3x + 5 = 20'],
            ['− 5', '3x = 15'],
            [': 3', 'x = 5'],
          ],
        },
        { type: 'worked', lines: ['20 − 5 = 15', '15 : 3 = 5'] },
        { type: 'worked', title: 'Controle', lines: ['3 × 5 + 5 = 15 + 5 = 20'] },
        {
          type: 'text',
          text: 'Of reken terug: x gaat × 3 en + 5 naar 20. Draai dat om vanaf het eind: 20 − 5 = 15 en 15 : 3 = 5.',
        },
        {
          type: 'table',
          head: ['Stap', 'Vergelijking'],
          rows: [
            ['begin', '4(x − 2) = 12'],
            [': 4', 'x − 2 = 3'],
            ['+ 2', 'x = 5'],
          ],
        },
        { type: 'worked', lines: ['12 : 4 = 3', '3 + 2 = 5'] },
        {
          type: 'text',
          text: 'Of werk eerst de haakjes weg: 4x − 8 = 12, dan 4x = 20.',
        },
        { type: 'worked', lines: ['12 + 8 = 20', '20 : 4 = 5'] },
        {
          type: 'table',
          head: ['Stap', 'Vergelijking'],
          rows: [
            ['begin', '5x + 3 = 2x + 18'],
            ['− 2x', '3x + 3 = 18'],
            ['− 3', '3x = 15'],
            [': 3', 'x = 5'],
          ],
        },
        { type: 'worked', title: 'Controle', lines: ['5 × 5 + 3 = 28 = 2 × 5 + 18'] },
        {
          type: 'tip',
          text: 'Doe aan beide kanten hetzelfde: haal 5 weg, dan 3x = 20 − 5.',
        },
      ],
    },
    {
      id: 'probability',
      title: 'Kans',
      summary: 'Gunstig gedeeld door mogelijk',
      blocks: [
        {
          type: 'text',
          text: 'Zijn alle uitkomsten even waarschijnlijk, dan is de kans het aantal uitkomsten dat je wilt gedeeld door alle uitkomsten. Een kans ligt tussen 0 en 1.',
        },
        { type: 'worked', title: 'Even getal met een dobbelsteen', lines: ['3/6 = 1/2'] },
        { type: 'text', text: '2, 4 en 6 zijn 3 van de 6 uitkomsten.' },
        {
          type: 'table',
          head: ['Gebeurtenis', 'Kans'],
          rows: [
            ['een 6', '1/6'],
            ['een even getal', '1/2'],
            ['een oneven getal', '1/2'],
            ['meer dan 4', '1/3'],
            ['minder dan 3', '1/3'],
            ['meer dan 2', '2/3'],
            ['een 5 of een 6', '1/3'],
            ['geen 6', '5/6'],
            ['een veelvoud van 3', '1/3'],
          ],
        },
        {
          type: 'worked',
          title: '3 rode, 5 blauwe en 2 groene knikkers, kans op blauw',
          lines: ['5 : (3 + 5 + 2) = 5 : 10 = 1/2'],
        },
        { type: 'worked', title: 'Kans op niet rood', lines: ['(5 + 2) : 10 = 7/10'] },
        { type: 'worked', title: 'Kans op niet rood, via rood', lines: ['1 − 3/10 = 7/10'] },
        {
          type: 'text',
          text: 'Rood of niet rood is zeker, kans 1; trek de kans op rood daarvan af.',
        },
        { type: 'tip', text: 'Deel door het totaal aantal knikkers: 3 + 5 + 2 = 10.' },
      ],
    },
  ],
};
