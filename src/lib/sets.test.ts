import { describe, expect, it } from 'vitest';
import {
  choosesTables,
  DEFAULT_SESSION_SIZE,
  describeSetTopicRows,
  forLevel,
  FRACTIONS_SET,
  GEOMETRY_SET,
  hasDeep,
  HEURISTICS_SET,
  MEASUREMENT_SET,
  NUMBER_SENSE_SET,
  NUMBER_SYSTEMS_SET,
  NUMBERS_SET,
  OPERATIONS_SET,
  PRACTICE_SETS,
  PROPORTIONS_SET,
  RELATIONS_SET,
  SESSION_SIZES,
  splitTopicLabel,
  TABLES_SET,
} from './sets';
import { DEEP_FIXTURE_SET } from './setFixture';
import { TOPIC_LABELS } from './topics';
import type { Level, PracticeSet } from './types';

describe('splitTopicLabel', () => {
  it.each([
    ['Lengte (mm t/m km)', { name: 'Lengte', detail: 'mm t/m km' }],
    [
      'Machten en wortels (2⁵, 0,3², 10⁻³, ∛64)',
      { name: 'Machten en wortels', detail: '2⁵, 0,3², 10⁻³, ∛64' },
    ],
    [
      'Procenten (deel, percentage, korting/verhoging, terug naar 100%)',
      { name: 'Procenten', detail: 'deel, percentage, korting/verhoging, terug naar 100%' },
    ],
    [
      'Omzetten tussen breuk, kommagetal en procent',
      { name: 'Omzetten tussen breuk, kommagetal en procent' },
    ],
    ['KGV (kleinste gemene veelvoud)', { name: 'KGV', detail: 'kleinste gemene veelvoud' }],
    ['Tafels van 2 t/m 15 (zonder 10)', { name: 'Tafels van 2 t/m 15', detail: 'zonder 10' }],
  ])('splits %s', (label, expected) => {
    expect(splitTopicLabel(label)).toEqual(expected);
  });

  it('gives every topic label a name and no leftover opening parenthesis', () => {
    for (const label of Object.values(TOPIC_LABELS)) {
      const { name, detail } = splitTopicLabel(label);
      expect(name.length).toBeGreaterThan(0);
      expect(detail ?? '').not.toContain(' (');
    }
  });
});

describe('describeSetTopicRows', () => {
  it('adds the tables row last at size 15 and drops it at size 5', () => {
    expect(describeSetTopicRows(MEASUREMENT_SET, 15).at(-1)).toEqual({ name: '15% tafels' });
    expect(describeSetTopicRows(MEASUREMENT_SET, 5).map((r) => r.name)).not.toContain('15% tafels');
  });

  it('gives Tafels one row', () => {
    expect(describeSetTopicRows(TABLES_SET)).toEqual([
      { name: 'Tafels van 2 t/m 15', detail: 'zonder 10' },
    ]);
  });
});

describe('practice sets', () => {
  it('offers the implemented sets in roadmap order', () => {
    expect(PRACTICE_SETS.map((set) => set.id)).toEqual([
      'tafels',
      'meten',
      'verhoudingen',
      'getallen',
      'bewerkingen',
      'getalbegrip',
      'breuken',
      'meetkunde',
      'verbanden',
      'talstelsels',
      'heuristieken',
    ]);
  });

  it('makes Verbanden & statistiek six equally weighted topics with 15% tables', () => {
    expect(RELATIONS_SET.id).toBe('verbanden');
    expect(RELATIONS_SET.name).toBe('Verbanden & statistiek');
    expect(RELATIONS_SET.description).toBe('Statistiek, rijen, formules, vergelijkingen en kans');
    expect(RELATIONS_SET.tablesPercent).toBe(15);
    expect(RELATIONS_SET.topics).toEqual([
      { topic: 'statistics', weight: 1 },
      { topic: 'percentagePoints', weight: 1 },
      { topic: 'sequences', weight: 1 },
      { topic: 'formulas', weight: 1 },
      { topic: 'equations', weight: 1 },
      { topic: 'probability', weight: 1 },
    ]);
  });

  it('makes Meetkunde seven equally weighted topics with 15% tables', () => {
    expect(GEOMETRY_SET.name).toBe('Meetkunde');
    expect(GEOMETRY_SET.description).toBe('Omtrek, oppervlakte, inhoud, hoeken en vormen');
    expect(GEOMETRY_SET.tablesPercent).toBe(15);
    expect(GEOMETRY_SET.topics).toEqual([
      { topic: 'perimeterArea', weight: 1 },
      { topic: 'solids', weight: 1 },
      { topic: 'pythagoras', weight: 1 },
      { topic: 'angles', weight: 1 },
      { topic: 'symmetry', weight: 1 },
      { topic: 'shapeProperties', weight: 1 },
      { topic: 'solidNames', weight: 1 },
    ]);
  });

  it('makes Breuken & kommagetallen three equally weighted topics with 15% tables', () => {
    expect(FRACTIONS_SET.name).toBe('Breuken & kommagetallen');
    expect(FRACTIONS_SET.tablesPercent).toBe(15);
    expect(FRACTIONS_SET.topics).toEqual([
      { topic: 'fractionConversion', weight: 1 },
      { topic: 'fractionArithmetic', weight: 1 },
      { topic: 'decimalArithmetic', weight: 1 },
    ]);
  });

  it('makes Getalbegrip five equally weighted topics with 15% tables', () => {
    expect(NUMBER_SENSE_SET.name).toBe('Getalbegrip');
    expect(NUMBER_SENSE_SET.tablesPercent).toBe(15);
    expect(NUMBER_SENSE_SET.topics).toEqual([
      { topic: 'mentalOperations', weight: 1 },
      { topic: 'negativeNumbers', weight: 1 },
      { topic: 'rounding', weight: 1 },
      { topic: 'powersRoots', weight: 1 },
      { topic: 'scientificNotation', weight: 1 },
    ]);
  });

  it('makes Bewerkingen three topics, properties at half weight, with 15% tables', () => {
    expect(OPERATIONS_SET.name).toBe('Bewerkingen');
    expect(OPERATIONS_SET.tablesPercent).toBe(15);
    expect(OPERATIONS_SET.topics).toEqual([
      { topic: 'orderOfOperations', weight: 2 },
      { topic: 'properties', weight: 1 },
      { topic: 'smartCalculation', weight: 2 },
    ]);
  });

  it('makes Getallen & delers six equally weighted topics with 15% tables', () => {
    expect(NUMBERS_SET.name).toBe('Getallen & delers');
    expect(NUMBERS_SET.tablesPercent).toBe(15);
    expect(NUMBERS_SET.topics).toEqual([
      { topic: 'lcm', weight: 1 },
      { topic: 'gcd', weight: 1 },
      { topic: 'prime', weight: 1 },
      { topic: 'factorization', weight: 1 },
      { topic: 'divisibility', weight: 1 },
      { topic: 'squares', weight: 1 },
    ]);
  });

  it('makes Verhoudingen five equally weighted topics with 15% tables', () => {
    expect(PROPORTIONS_SET.name).toBe('Verhoudingen');
    expect(PROPORTIONS_SET.description).toBe('Procenten, promille, verhoudingen en schaal');
    expect(PROPORTIONS_SET.tablesPercent).toBe(15);
    expect(PROPORTIONS_SET.topics).toEqual([
      { topic: 'percentages', weight: 1 },
      { topic: 'ratios', weight: 1 },
      { topic: 'percentChange', weight: 1 },
      { topic: 'scale', weight: 1 },
      { topic: 'ratioProblems', weight: 1 },
      { topic: 'permille', weight: 1 },
      { topic: 'proportionConcepts', weight: 1 },
    ]);
  });

  it('makes Meten eleven equally weighted topics with 15% tables', () => {
    expect(MEASUREMENT_SET.name).toBe('Meten');
    expect(MEASUREMENT_SET.description).toBe('Eenheden, klok, grote getallen en snelheid');
    expect(MEASUREMENT_SET.tablesPercent).toBe(15);
    expect(MEASUREMENT_SET.topics).toEqual([
      { topic: 'volume', weight: 1 },
      { topic: 'area', weight: 1 },
      { topic: 'length', weight: 1 },
      { topic: 'mass', weight: 1 },
      { topic: 'time', weight: 1 },
      { topic: 'numberUnits', weight: 1 },
      { topic: 'speed', weight: 1 },
      { topic: 'calendar', weight: 1 },
      { topic: 'dataSize', weight: 1 },
      { topic: 'clock', weight: 1 },
      { topic: 'measureSense', weight: 1 },
    ]);
  });

  it('makes Tafels a pure tables set', () => {
    expect(TABLES_SET.name).toBe('Tafels');
    expect(TABLES_SET.tablesPercent).toBe(100);
    expect(TABLES_SET.topics).toEqual([]);
  });

  it('offers the session sizes from the spec with 15 as default', () => {
    expect(SESSION_SIZES).toEqual([5, 10, 15, 25, 50]);
    expect(DEFAULT_SESSION_SIZE).toBe(15);
  });
});

describe('choosesTables', () => {
  it('is true for the Tafels set only', () => {
    expect(PRACTICE_SETS.filter(choosesTables)).toEqual([TABLES_SET]);
  });
});

/** The rows joined back into their original labels, so each set's full text stays covered. */
function rowLabels(set: PracticeSet, size?: number): string[] {
  return describeSetTopicRows(set, size).map(({ name, detail }) =>
    detail ? `${name} (${detail})` : name,
  );
}

describe('describeSetTopicRows per set', () => {
  it('describes the Tafels set', () => {
    expect(rowLabels(TABLES_SET)).toEqual(['Tafels van 2 t/m 15 (zonder 10)']);
  });

  it('appends the mixed-in tables share for other sets', () => {
    const mixed: PracticeSet = {
      ...TABLES_SET,
      topics: [{ topic: 'tables', weight: 1 }],
      tablesPercent: 15,
    };
    expect(rowLabels(mixed)).toEqual(['Tafels van 2 t/m 15 (zonder 10)', '15% tafels']);
  });

  it('omits the mixed-in tables share for sessions below 10 exercises', () => {
    const mixed: PracticeSet = {
      ...TABLES_SET,
      topics: [{ topic: 'tables', weight: 1 }],
      tablesPercent: 15,
    };
    expect(rowLabels(mixed, 5)).toEqual(['Tafels van 2 t/m 15 (zonder 10)']);
  });

  it('describes the Meten set', () => {
    expect(rowLabels(MEASUREMENT_SET)).toEqual([
      'Inhoud (ml t/m kl, mm³ t/m m³, cc, kuub)',
      'Oppervlakte (mm² t/m km², ca, are, ha)',
      'Lengte (mm t/m km)',
      'Gewicht (mg t/m ton)',
      'Tijd (s, min, uur, dag)',
      'Grote getallen (duizend t/m quadriljoen, ton)',
      'Snelheid (afstand, tijd, km/u en m/s)',
      'Kalender (etmaal t/m millennium)',
      'Geheugen (kB t/m TB)',
      'Klok (kijken en tijdsduur)',
      'Maatgevoel (referenties, meetinstrumenten, eenheden)',
      '15% tafels',
    ]);
  });

  it('describes the Getallen & delers set', () => {
    expect(rowLabels(NUMBERS_SET)).toEqual([
      'KGV (kleinste gemene veelvoud)',
      'GGD (grootste gemene deler)',
      'Priemgetal of niet (11 t/m 199)',
      'Ontbinden in priemfactoren (12 t/m 200)',
      'Deelbaarheid door 2 t/m 15 (zonder 10)',
      'Kwadraten en wortels (2² t/m 25²)',
      '15% tafels',
    ]);
  });

  it('describes the Bewerkingen set', () => {
    expect(rowLabels(OPERATIONS_SET)).toEqual([
      'Volgorde van bewerkingen (ook met negatieve getallen)',
      'Eigenschappen (commutatief, associatief, distributief)',
      'Handig rekenen (compenseren, aanvullen, splitsen, verdubbelen en halveren)',
      '15% tafels',
    ]);
  });

  it('describes the Getalbegrip set', () => {
    expect(rowLabels(NUMBER_SENSE_SET)).toEqual([
      'Hoofdrekenen met grote getallen (ook delen met rest)',
      'Negatieve getallen (ook temperatuur)',
      'Afronden (tientallen t/m miljoenen, decimalen)',
      'Machten en wortels (2⁵, 0,3², 10⁻³, ∛64)',
      'Wetenschappelijke notatie (4,5 × 10⁶)',
      '15% tafels',
    ]);
  });

  it('describes the Breuken & kommagetallen set', () => {
    expect(rowLabels(FRACTIONS_SET)).toEqual([
      'Omzetten tussen breuk, kommagetal en procent',
      'Rekenen met breuken (ook gemengde getallen en deel van een getal)',
      'Rekenen met kommagetallen (0,3 × 0,4, 2,5 : 0,05)',
      '15% tafels',
    ]);
  });

  it('describes the Verbanden & statistiek set', () => {
    expect(rowLabels(RELATIONS_SET)).toEqual([
      'Statistiek (gemiddelde, mediaan, modus, spreidingsbreedte)',
      'Procentpunten (procentpunt of procent)',
      'Rijen (volgende getal, n-de getal, driehoeksgetallen)',
      'Formules (invullen, startgetal en hellingsgetal)',
      'Vergelijkingen (x oplossen)',
      'Kans (dobbelsteen, knikkers)',
      '15% tafels',
    ]);
  });

  it('describes the Meetkunde set', () => {
    expect(rowLabels(GEOMETRY_SET)).toEqual([
      'Omtrek en oppervlakte (vierkant t/m cirkel)',
      'Inhoud en oppervlakte (kubus, balk, cilinder, liters)',
      'Pythagoras (schuine zijde en rechthoekszijde)',
      'Hoeken (driehoek, veelhoek, klok)',
      'Symmetrie (assen, draaien, puntsymmetrie)',
      'Eigenschappen van vierhoeken en driehoeken (ja/nee)',
      'Ruimtefiguren (namen, vlakken, ribben)',
      '15% tafels',
    ]);
  });

  it('describes the Verhoudingen set', () => {
    expect(rowLabels(PROPORTIONS_SET)).toEqual([
      'Procenten (deel, percentage, korting/verhoging, terug naar 100%)',
      'Verhoudingen (ontbrekend getal, herschalen, verdelen)',
      'Procentuele verandering (stijging en daling, btw, oude prijs)',
      'Schaal (kaart en tekening, schaal bepalen)',
      'Verhoudingsverhaaltjes (deel van het geheel, mengen, per eenheid)',
      'Promille (‰ van, ‰ ↔ % ↔ kommagetal)',
      'Begrippen (absoluut, relatief, 1 op de n)',
      '15% tafels',
    ]);
  });
});

describe('Talstelsels set', () => {
  it('has two equally weighted topics with 15% tables', () => {
    expect(NUMBER_SYSTEMS_SET.id).toBe('talstelsels');
    expect(NUMBER_SYSTEMS_SET.name).toBe('Talstelsels');
    expect(NUMBER_SYSTEMS_SET.description).toBe(
      'Tweetallig (binair), vijftallig, zestientallig (hexadecimaal) en Romeinse cijfers',
    );
    expect(NUMBER_SYSTEMS_SET.tablesPercent).toBe(15);
    expect(NUMBER_SYSTEMS_SET.topics).toEqual([
      { topic: 'numberSystems', weight: 1 },
      { topic: 'romanNumerals', weight: 1 },
    ]);
  });

  it('describes its topics and the tables share', () => {
    expect(rowLabels(NUMBER_SYSTEMS_SET, 15)).toEqual([
      'Talstelsels (tweetallig/binair, vijftallig, zestientallig/hexadecimaal)',
      'Romeinse cijfers (tot 100 en jaartallen)',
      '15% tafels',
    ]);
  });
});

describe('Heuristieken set', () => {
  it('is the last practice set, four equally weighted topics with 15% tables', () => {
    expect(PRACTICE_SETS.at(-1)).toBe(HEURISTICS_SET);
    expect(HEURISTICS_SET.id).toBe('heuristieken');
    expect(HEURISTICS_SET.name).toBe('Heuristieken');
    expect(HEURISTICS_SET.description).toBe(
      'Systematisch tellen, terugrekenen, proberen en vereenvoudigen',
    );
    expect(HEURISTICS_SET.tablesPercent).toBe(15);
    expect(HEURISTICS_SET.topics).toEqual([
      { topic: 'systematicCounting', weight: 1 },
      { topic: 'workingBackwards', weight: 1 },
      { topic: 'guessAndCheck', weight: 1 },
      { topic: 'simplifyProblem', weight: 1 },
    ]);
  });

  it('describes its topics and the tables share', () => {
    expect(rowLabels(HEURISTICS_SET, 15)).toEqual([
      'Systematisch tellen (combinaties, handdrukken, volgordes)',
      'Terugrekenen (ik denk aan een getal, geld over)',
      'Slim proberen (kippen en konijnen, som en verschil)',
      'Vereenvoudigen (Gauss, tellen, figuurpatronen)',
      '15% tafels',
    ]);
  });
});

describe('levels', () => {
  it('gives the sets with a v3 step a Verdieping (spec §12.2 step 4)', () => {
    expect(PRACTICE_SETS.filter(hasDeep)).toEqual([
      MEASUREMENT_SET,
      PROPORTIONS_SET,
      NUMBERS_SET,
      OPERATIONS_SET,
      GEOMETRY_SET,
    ]);
  });

  it('lists the four Getallen & delers Verdieping topics and the Opfrisser share', () => {
    expect(NUMBERS_SET.description).toBe('KGV, GGD, priemgetallen, deelbaarheid en kwadraten');
    expect(NUMBERS_SET.deep).toEqual([
      { topic: 'lcmGcdProblems', weight: 1 },
      { topic: 'divisors', weight: 1 },
      { topic: 'missingDigit', weight: 1 },
      { topic: 'remainders', weight: 1 },
    ]);
    const names = (size: number) =>
      describeSetTopicRows(forLevel(NUMBERS_SET, 'deep'), size).map((row) => row.name);
    const topics = [
      'KGV en GGD in context',
      'Delers',
      'Ontbrekend cijfer en deelbaarheid',
      'Restpuzzels',
    ];
    expect(names(15)).toEqual([...topics, '20% opfrisser']);
    expect(names(5)).toEqual(topics);
  });

  it('lists the four Verhoudingen Verdieping topics and the Opfrisser share, without a tables row', () => {
    const names = (size: number) =>
      describeSetTopicRows(forLevel(PROPORTIONS_SET, 'deep'), size).map((row) => row.name);
    const topics = [
      'Procentenproblemen',
      'Vergroten en verkleinen',
      'Verhoudingen vergelijken',
      'Redeneren met verhoudingen',
    ];
    expect(names(15)).toEqual([...topics, '20% opfrisser']);
    expect(names(5)).toEqual(topics);
    expect(PROPORTIONS_SET.deep).toEqual([
      { topic: 'percentProblems', weight: 1 },
      { topic: 'enlargement', weight: 1 },
      { topic: 'compareRatios', weight: 1 },
      { topic: 'ratioReasoning', weight: 1 },
    ]);
  });

  it('keeps the seven Opfrisser topics of Verhoudingen and its tables share at Opfrisser level', () => {
    expect(forLevel(PROPORTIONS_SET, 'quick')).toBe(PROPORTIONS_SET);
    const deep = forLevel(PROPORTIONS_SET, 'deep');
    expect(deep.tablesPercent).toBe(0);
    expect(deep.quickShare).toEqual({ percent: 20, topics: PROPORTIONS_SET.topics });
    expect(PROPORTIONS_SET.topics).toHaveLength(7);
  });

  it('lists the four Meten Verdieping topics and the Opfrisser share, without a tables row', () => {
    const names = (size: number) =>
      describeSetTopicRows(forLevel(MEASUREMENT_SET, 'deep'), size).map((row) => row.name);
    const topics = [
      'Samengestelde grootheden',
      'Rekenen met maten',
      'Rekenen met tijd',
      'Schatten',
    ];
    expect(names(15)).toEqual([...topics, '20% opfrisser']);
    expect(names(5)).toEqual(topics);
    expect(MEASUREMENT_SET.deep).toEqual([
      { topic: 'compoundUnits', weight: 1 },
      { topic: 'measureProblems', weight: 1 },
      { topic: 'timeCalc', weight: 1 },
      { topic: 'estimating', weight: 1 },
    ]);
  });

  it('lists the four Bewerkingen Verdieping topics at weight 1 and keeps the card description', () => {
    const rows = describeSetTopicRows(forLevel(OPERATIONS_SET, 'deep'), 15).map((row) => row.name);
    expect(rows).toEqual([
      'Haakjes plaatsen',
      'Afleiden',
      'Meerstapsopgaven',
      'Handig rekenen+',
      '20% opfrisser',
    ]);
    expect(OPERATIONS_SET.deep).toEqual([
      { topic: 'bracketPlacement', weight: 1 },
      { topic: 'derivedFacts', weight: 1 },
      { topic: 'multiStepProblems', weight: 1 },
      { topic: 'smartCalculationDeep', weight: 1 },
    ]);
    expect(forLevel(OPERATIONS_SET, 'deep').tablesPercent).toBe(0);
    expect(OPERATIONS_SET.description).toBe(
      'Volgorde van bewerkingen, eigenschappen en handig rekenen',
    );
  });

  it('lists the four Meetkunde Verdieping topics and the Opfrisser share, without a tables row', () => {
    const names = (size: number) =>
      describeSetTopicRows(forLevel(GEOMETRY_SET, 'deep'), size).map((row) => row.name);
    const topics = [
      'Kwadratisch en kubisch vergroten',
      'Oppervlakte van ruimtefiguren',
      'Samengestelde figuren',
      'Redeneren met hoeken',
    ];
    expect(names(15)).toEqual([...topics, '20% opfrisser']);
    expect(names(5)).toEqual(topics);
    expect(GEOMETRY_SET.deep).toEqual([
      { topic: 'scalingSolids', weight: 1 },
      { topic: 'surfaceArea', weight: 1 },
      { topic: 'compositeShapes', weight: 1 },
      { topic: 'angleReasoning', weight: 1 },
    ]);
    expect(hasDeep(GEOMETRY_SET)).toBe(true);
    expect(forLevel(GEOMETRY_SET, 'quick')).toBe(GEOMETRY_SET);
    const deep = forLevel(GEOMETRY_SET, 'deep');
    expect(deep.tablesPercent).toBe(0);
    expect(deep.quickShare).toEqual({ percent: 20, topics: GEOMETRY_SET.topics });
    expect(GEOMETRY_SET.description).toBe('Omtrek, oppervlakte, inhoud, hoeken en vormen');
  });

  it('knows the fixture has a Verdieping, but not an empty one or one for Tafels', () => {
    expect(hasDeep(DEEP_FIXTURE_SET)).toBe(true);
    expect(hasDeep({ ...DEEP_FIXTURE_SET, deep: [] })).toBe(false);
    expect(hasDeep({ ...TABLES_SET, deep: [{ topic: 'lcm', weight: 1 }] })).toBe(false);
  });

  it('returns the set itself for Opfrisser and for a set without Verdieping', () => {
    expect(forLevel(DEEP_FIXTURE_SET, 'quick')).toBe(DEEP_FIXTURE_SET);
    expect(forLevel(NUMBER_SENSE_SET, 'deep')).toBe(NUMBER_SENSE_SET);
    const empty = { ...DEEP_FIXTURE_SET, deep: [] };
    expect(forLevel(empty, 'deep')).toBe(empty);
  });

  it('swaps in the Verdieping topics with a 20% Opfrisser share and no tables share', () => {
    const deep = forLevel(DEEP_FIXTURE_SET, 'deep');
    expect(deep.id).toBe(DEEP_FIXTURE_SET.id);
    expect(deep.name).toBe(DEEP_FIXTURE_SET.name);
    expect(deep.topics).toEqual(DEEP_FIXTURE_SET.deep);
    expect(deep.tablesPercent).toBe(0);
    expect(deep.quickShare).toEqual({ percent: 20, topics: DEEP_FIXTURE_SET.topics });
    expect(forLevel(DEEP_FIXTURE_SET, 'quick').quickShare).toBeUndefined();
  });

  it('lists the topics of the chosen level', () => {
    const names = (level: Level) =>
      describeSetTopicRows(forLevel(DEEP_FIXTURE_SET, level), 15).map((row) => row.name);
    expect(names('quick')).toEqual(['Priemgetal of niet', '15% tafels']);
    expect(names('deep')).toEqual(['KGV', 'GGD', '20% opfrisser']);
  });
});
