import type { Generator, Topic } from '../types';
import { generateAngleReasoning } from './angleReasoning';
import { generateAngles } from './angles';
import { generateArithmeticWords } from './arithmeticWords';
import { generateBetweenNumbers } from './betweenNumbers';
import { generateBracketPlacement } from './bracketPlacement';
import { generateCalcCircle } from './calcCircle';
import { generateCalcVolume } from './calcVolume';
import { generateCalendar } from './calendar';
import { generateClock } from './clock';
import { generateCompareFractions } from './compareFractions';
import { generateCompareRatios } from './compareRatios';
import { generateCompositeShapes } from './compositeShapes';
import { generateCompoundUnits } from './compoundUnits';
import { generateDataSize } from './dataSize';
import { generateDecimalArithmetic } from './decimalArithmetic';
import { generateDecimalNames } from './decimalNames';
import { generateDecimalProblems } from './decimalProblems';
import { generateDerivedFacts } from './derivedFacts';
import { generateDivisibility } from './divisibility';
import { generateDivisors } from './divisors';
import { generateEnlargement } from './enlargement';
import { generateEquations } from './equations';
import { generateEstimateCalc } from './estimateCalc';
import { generateEstimating } from './estimating';
import { generateFormulas } from './formulas';
import { generateFractionArithmetic } from './fractionArithmetic';
import { generateFractionConcepts } from './fractionConcepts';
import { generateFractionConversion } from './fractionConversion';
import { generateFractionProblems } from './fractionProblems';
import { generateLcmGcdProblems } from './lcmGcdProblems';
import { generateMeasureProblems } from './measureProblems';
import { generateMeasureSense } from './measureSense';
import { generateMissingDigit } from './missingDigit';
import { generateMixedNotation } from './mixedNotation';
import {
  generateArea,
  generateLength,
  generateMass,
  generateTime,
  generateVolume,
} from './measurement';
import { generateMentalOperations } from './mentalOperations';
import { generateMultiStepProblems } from './multiStepProblems';
import { generateNegativeContexts } from './negativeContexts';
import { generateNegativeNumbers } from './negativeNumbers';
import { generateNumberOrder } from './numberOrder';
import { generateNumberUnits } from './numberUnits';
import { generateFactorization, generateGcd, generateLcm, generatePrime } from './numberTheory';
import { generateOrderOfOperations } from './orderOfOperations';
import { generatePercentages } from './percentages';
import { generatePercentagePoints } from './percentagePoints';
import { generatePercentChange } from './percentChange';
import { generatePercentProblems } from './percentProblems';
import { generatePermille } from './permille';
import { generateProportionConcepts } from './proportionConcepts';
import { generatePerimeterArea } from './perimeterArea';
import { generatePowerCalc } from './powerCalc';
import { generatePowersRoots } from './powersRoots';
import { generateProbability } from './probability';
import { generateProperties } from './properties';
import { generatePythagoras } from './pythagoras';
import { generateRatioProblems } from './ratioProblems';
import { generateRatioReasoning } from './ratioReasoning';
import { generateRatios } from './ratios';
import { generateRemainders } from './remainders';
import { generateRounding } from './rounding';
import { generateRoundingReasoning } from './roundingReasoning';
import { generateScale } from './scale';
import { generateScalingSolids } from './scalingSolids';
import { generateNumberSystems } from './numberSystems';
import { generateRomanNumerals } from './romanNumerals';
import { generateScientificNotation } from './scientificNotation';
import { generateSequences } from './sequences';
import { generateShapeProperties } from './shapeProperties';
import { generateSimplifyProblem } from './simplifyProblem';
import { generateSmartCalculation } from './smartCalculation';
import { generateSmartCalculationDeep } from './smartCalculationDeep';
import { generateSolidNames } from './solidNames';
import { generateSolids } from './solids';
import { generateSpeed } from './speed';
import { generateSurfaceArea } from './surfaceArea';
import { generateSquares } from './squares';
import { generateStatistics } from './statistics';
import { generateSymmetry } from './symmetry';
import { generateGuessAndCheck } from './guessAndCheck';
import { generateSystematicCounting } from './systematicCounting';
import { generateWorkingBackwards } from './workingBackwards';
import { generateTwoDice } from './twoDice';
import { generateStatisticsReasoning } from './statisticsReasoning';
import { generateStatisticsProblems } from './statisticsProblems';
import { generateFormulaProblems } from './formulaProblems';
import { generateBaseArithmetic } from './baseArithmetic';
import { generateBaseReasoning } from './baseReasoning';
import { generateHexBinary } from './hexBinary';
import { generateRomanCalc } from './romanCalc';
import { generateCountingCases } from './countingCases';
import { generateBackwardsProblems } from './backwardsProblems';
import { generateTwoUnknowns } from './twoUnknowns';
import { generateSimplifyDeep } from './simplifyDeep';
import { generateTables } from './tables';
import { generateTimeCalc } from './timeCalc';

export const GENERATORS: Record<Topic, Generator> = {
  tables: generateTables,
  volume: generateVolume,
  area: generateArea,
  length: generateLength,
  mass: generateMass,
  time: generateTime,
  speed: generateSpeed,
  numberUnits: generateNumberUnits,
  calendar: generateCalendar,
  dataSize: generateDataSize,
  clock: generateClock,
  measureSense: generateMeasureSense,
  compoundUnits: generateCompoundUnits,
  measureProblems: generateMeasureProblems,
  timeCalc: generateTimeCalc,
  estimating: generateEstimating,
  percentages: generatePercentages,
  ratios: generateRatios,
  percentChange: generatePercentChange,
  scale: generateScale,
  ratioProblems: generateRatioProblems,
  permille: generatePermille,
  proportionConcepts: generateProportionConcepts,
  percentProblems: generatePercentProblems,
  enlargement: generateEnlargement,
  compareRatios: generateCompareRatios,
  ratioReasoning: generateRatioReasoning,
  lcm: generateLcm,
  gcd: generateGcd,
  prime: generatePrime,
  factorization: generateFactorization,
  divisibility: generateDivisibility,
  squares: generateSquares,
  lcmGcdProblems: generateLcmGcdProblems,
  divisors: generateDivisors,
  missingDigit: generateMissingDigit,
  remainders: generateRemainders,
  orderOfOperations: generateOrderOfOperations,
  smartCalculation: generateSmartCalculation,
  properties: generateProperties,
  bracketPlacement: generateBracketPlacement,
  derivedFacts: generateDerivedFacts,
  multiStepProblems: generateMultiStepProblems,
  smartCalculationDeep: generateSmartCalculationDeep,
  mentalOperations: generateMentalOperations,
  negativeNumbers: generateNegativeNumbers,
  numberOrder: generateNumberOrder,
  arithmeticWords: generateArithmeticWords,
  negativeContexts: generateNegativeContexts,
  roundingReasoning: generateRoundingReasoning,
  estimateCalc: generateEstimateCalc,
  powerCalc: generatePowerCalc,
  rounding: generateRounding,
  powersRoots: generatePowersRoots,
  numberSystems: generateNumberSystems,
  romanNumerals: generateRomanNumerals,
  scientificNotation: generateScientificNotation,
  decimalArithmetic: generateDecimalArithmetic,
  fractionConversion: generateFractionConversion,
  decimalNames: generateDecimalNames,
  compareFractions: generateCompareFractions,
  fractionConcepts: generateFractionConcepts,
  mixedNotation: generateMixedNotation,
  fractionProblems: generateFractionProblems,
  decimalProblems: generateDecimalProblems,
  betweenNumbers: generateBetweenNumbers,
  fractionArithmetic: generateFractionArithmetic,
  perimeterArea: generatePerimeterArea,
  solids: generateSolids,
  pythagoras: generatePythagoras,
  angles: generateAngles,
  symmetry: generateSymmetry,
  solidNames: generateSolidNames,
  scalingSolids: generateScalingSolids,
  surfaceArea: generateSurfaceArea,
  compositeShapes: generateCompositeShapes,
  angleReasoning: generateAngleReasoning,
  calcCircle: generateCalcCircle,
  calcVolume: generateCalcVolume,
  shapeProperties: generateShapeProperties,
  statistics: generateStatistics,
  percentagePoints: generatePercentagePoints,
  sequences: generateSequences,
  formulas: generateFormulas,
  equations: generateEquations,
  probability: generateProbability,
  twoDice: generateTwoDice,
  statisticsReasoning: generateStatisticsReasoning,
  statisticsProblems: generateStatisticsProblems,
  formulaProblems: generateFormulaProblems,
  baseArithmetic: generateBaseArithmetic,
  baseReasoning: generateBaseReasoning,
  hexBinary: generateHexBinary,
  romanCalc: generateRomanCalc,
  systematicCounting: generateSystematicCounting,
  workingBackwards: generateWorkingBackwards,
  guessAndCheck: generateGuessAndCheck,
  simplifyProblem: generateSimplifyProblem,
  countingCases: generateCountingCases,
  backwardsProblems: generateBackwardsProblems,
  twoUnknowns: generateTwoUnknowns,
  simplifyDeep: generateSimplifyDeep,
};

export interface TopicLabel {
  name: string;
  detail?: string;
}

/** Dutch labels: the name and its detail on the setup screen, the name on the results (spec §3.2, §3.5). */
export const TOPIC_LABELS: Record<Topic, TopicLabel> = {
  tables: { name: 'Tafels van 2 t/m 15', detail: 'zonder 10' },
  volume: { name: 'Inhoud', detail: 'ml t/m kl, mm³ t/m m³, cc, kuub' },
  area: { name: 'Oppervlakte', detail: 'mm² t/m km², ca, are, ha' },
  length: { name: 'Lengte', detail: 'mm t/m km' },
  mass: { name: 'Gewicht', detail: 'mg t/m ton' },
  time: { name: 'Tijd', detail: 's, min, uur, dag' },
  speed: { name: 'Snelheid', detail: 'afstand, tijd, km/u en m/s' },
  numberUnits: { name: 'Grote getallen', detail: 'duizend t/m quadriljoen, ton' },
  calendar: { name: 'Kalender', detail: 'etmaal t/m millennium' },
  dataSize: { name: 'Geheugen', detail: 'kB t/m TB' },
  clock: { name: 'Klok', detail: 'kijken en tijdsduur' },
  measureSense: {
    name: 'Maatgevoel',
    detail: 'referenties, meetinstrumenten, eenheden, grootheden',
  },
  compoundUnits: {
    name: 'Samengestelde grootheden',
    detail: 'snelheid, dichtheid, debiet, verbruik',
  },
  measureProblems: { name: 'Rekenen met maten', detail: 'omrekenen in contexten' },
  timeCalc: { name: 'Rekenen met tijd', detail: 'aankomst, vertrek, duur' },
  estimating: { name: 'Schatten', detail: 'met referentiematen' },
  percentages: {
    name: 'Procenten',
    detail: 'deel, percentage, korting/verhoging, terug naar 100%',
  },
  ratios: { name: 'Verhoudingen', detail: 'ontbrekend getal, herschalen, verdelen' },
  percentChange: { name: 'Procentuele verandering', detail: 'stijging en daling, btw, oude prijs' },
  scale: { name: 'Schaal', detail: 'kaart en tekening, schaal bepalen' },
  ratioProblems: {
    name: 'Verhoudingsverhaaltjes',
    detail: 'deel van het geheel, mengen, per eenheid',
  },
  permille: { name: 'Promille', detail: '‰ van, ‰ ↔ % ↔ kommagetal' },
  proportionConcepts: { name: 'Begrippen', detail: 'absoluut, relatief, 1 op de n' },
  percentProblems: { name: 'Procentenproblemen', detail: 'stapelkorting, extra inhoud, promille' },
  enlargement: { name: 'Vergroten en verkleinen', detail: 'kopieerapparaat' },
  compareRatios: { name: 'Verhoudingen vergelijken', detail: 'meer, voordeliger, naar verhouding' },
  ratioReasoning: {
    name: 'Redeneren met verhoudingen',
    detail: 'verschil, herschalen, aanvullen, samenvoegen',
  },
  lcm: { name: 'KGV', detail: 'kleinste gemene veelvoud' },
  gcd: { name: 'GGD', detail: 'grootste gemene deler' },
  prime: { name: 'Priemgetal of niet', detail: '11 t/m 199' },
  factorization: { name: 'Ontbinden in priemfactoren', detail: '12 t/m 200' },
  divisibility: { name: 'Deelbaarheid door 2 t/m 15', detail: 'zonder 10' },
  squares: { name: 'Kwadraten en wortels', detail: '2² t/m 25²' },
  lcmGcdProblems: { name: 'KGV en GGD in context', detail: 'samen vertrekken, gelijke stukken' },
  divisors: { name: 'Delers', detail: 'aantal delers, drie getallen, uit ontbinding' },
  missingDigit: { name: 'Ontbrekend cijfer en deelbaarheid' },
  remainders: { name: 'Restpuzzels', detail: 'delen met rest en KGV' },
  orderOfOperations: { name: 'Volgorde van bewerkingen', detail: 'ook met negatieve getallen' },
  smartCalculation: {
    name: 'Handig rekenen',
    detail: 'compenseren, aanvullen, splitsen, verdubbelen en halveren',
  },
  properties: { name: 'Eigenschappen', detail: 'commutatief, associatief, distributief' },
  bracketPlacement: { name: 'Haakjes plaatsen', detail: 'zodat de uitkomst klopt' },
  derivedFacts: { name: 'Afleiden', detail: 'uit een gegeven som' },
  multiStepProblems: { name: 'Meerstapsopgaven', detail: 'contexten, delen met rest' },
  smartCalculationDeep: { name: 'Handig rekenen+', detail: 'buiten haakjes, kommagetallen' },
  mentalOperations: { name: 'Hoofdrekenen met grote getallen', detail: 'ook delen met rest' },
  negativeNumbers: { name: 'Negatieve getallen', detail: 'ook temperatuur' },
  numberOrder: { name: 'Ordenen', detail: 'negatief, kommagetal, getallenlijn' },
  arithmeticWords: { name: 'Rekentaal', detail: 'som, verschil, bijna, ruim, cijfer' },
  negativeContexts: { name: 'Negatief in context', detail: 'rood staan, tekort, NAP' },
  roundingReasoning: { name: 'Afronden redeneren', detail: 'grenzen, contant betalen' },
  estimateCalc: { name: 'Schatten', detail: 'uitkomst ongeveer' },
  powerCalc: {
    name: 'Rekenen met machten',
    detail: 'rekenregels, wortels, wetenschappelijke notatie',
  },
  rounding: { name: 'Afronden', detail: 'tientallen t/m miljoenen, decimalen' },
  powersRoots: { name: 'Machten en wortels', detail: '2⁵, 0,3², 10⁻³, ∛64' },
  numberSystems: {
    name: 'Talstelsels',
    detail: 'tweetallig/binair, vijftallig, zestientallig/hexadecimaal',
  },
  romanNumerals: { name: 'Romeinse cijfers', detail: 'tot 100 en jaartallen' },
  scientificNotation: { name: 'Wetenschappelijke notatie', detail: '4,5 × 10⁶' },
  decimalArithmetic: { name: 'Rekenen met kommagetallen', detail: '0,3 × 0,4, 2,5 : 0,05' },
  fractionConversion: { name: 'Omzetten tussen breuk, kommagetal en procent' },
  decimalNames: { name: 'Kommagetallen in woorden', detail: 'tiende t/m miljardste' },
  compareFractions: { name: 'Vergelijken', detail: 'breuken, kommagetallen, procenten' },
  fractionConcepts: { name: 'Breukbegrippen', detail: 'teller, stambreuk, gelijkwaardig' },
  mixedNotation: { name: 'Gemengd rekenen', detail: 'breuk, kommagetal, procent' },
  fractionProblems: { name: 'Breuken in context', detail: 'deel, rest, geheel' },
  decimalProblems: { name: 'Kommagetallen in context', detail: 'prijs per kilo, lengte' },
  betweenNumbers: { name: 'Getallenlijn', detail: 'midden, sprongen, streepjes' },
  fractionArithmetic: {
    name: 'Rekenen met breuken',
    detail: 'ook gemengde getallen en deel van een getal',
  },
  perimeterArea: { name: 'Omtrek en oppervlakte', detail: 'vierkant t/m cirkel' },
  solids: { name: 'Inhoud en oppervlakte', detail: 'kubus, balk, cilinder, liters' },
  pythagoras: { name: 'Pythagoras', detail: 'schuine zijde en rechthoekszijde' },
  angles: { name: 'Hoeken', detail: 'driehoek, veelhoek, klok' },
  symmetry: { name: 'Symmetrie', detail: 'assen, draaien, puntsymmetrie' },
  solidNames: { name: 'Ruimtefiguren en lijnen', detail: 'namen, vlakken, begrippen' },
  scalingSolids: { name: 'Kwadratisch en kubisch vergroten' },
  surfaceArea: { name: 'Oppervlakte van ruimtefiguren', detail: 'piramide, prisma, cilinder, bol' },
  compositeShapes: { name: 'Samengestelde figuren', detail: 'hoek eruit, pad, hectare' },
  angleReasoning: { name: 'Redeneren met hoeken', detail: 'buitenhoek, verhouding, klok' },
  calcCircle: {
    name: 'Cirkel met de rekenmachine',
    detail: 'omtrek, oppervlakte, terugrekenen',
  },
  calcVolume: { name: 'Inhoud met de rekenmachine', detail: 'bol, cilinder, liters' },
  shapeProperties: { name: 'Eigenschappen van vierhoeken en driehoeken', detail: 'ja/nee' },
  statistics: { name: 'Statistiek', detail: 'gemiddelde, mediaan, modus, spreidingsbreedte' },
  percentagePoints: { name: 'Procentpunten', detail: 'procentpunt of procent' },
  sequences: { name: 'Rijen', detail: 'volgende getal, n-de getal, driehoeksgetallen' },
  formulas: { name: 'Formules', detail: 'invullen, startgetal en hellingsgetal' },
  equations: { name: 'Vergelijkingen', detail: 'x oplossen' },
  probability: { name: 'Kans', detail: 'dobbelsteen, knikkers' },
  twoDice: { name: 'Kans', detail: 'twee dobbelstenen, munten' },
  statisticsReasoning: { name: 'Statistiek', detail: 'welke maat: gemiddelde, mediaan, modus' },
  statisticsProblems: { name: 'Gemiddelde in context', detail: 'samen, erbij, eraf' },
  formulaProblems: { name: 'Formules en rijen in context', detail: 'omgekeerd, gelijk, plek' },
  baseArithmetic: { name: 'Rekenen in een ander talstelsel' },
  baseReasoning: {
    name: 'Talstelsels begrijpen',
    detail: 'grootste getal, aantal cijfers, plaatswaarde',
  },
  hexBinary: { name: 'Tweetallig ↔ zestientallig', detail: 'groepjes van vier' },
  romanCalc: { name: 'Rekenen met Romeinse cijfers' },
  systematicCounting: {
    name: 'Systematisch tellen',
    detail: 'combinaties, handdrukken, volgordes',
  },
  workingBackwards: { name: 'Terugrekenen', detail: 'ik denk aan een getal, geld over' },
  guessAndCheck: { name: 'Slim proberen', detail: 'kippen en konijnen, som en verschil' },
  simplifyProblem: { name: 'Vereenvoudigen', detail: 'Gauss, tellen, figuurpatronen' },
  countingCases: { name: 'Systematisch tellen met voorwaarden' },
  backwardsProblems: { name: 'Terugrekenen', detail: 'lange reeks, in rondes' },
  twoUnknowns: { name: 'Twee onbekenden', detail: 'leeftijden, munten, rechthoek' },
  simplifyDeep: { name: 'Vereenvoudigen', detail: 'reeks optellen, bladzijden nummeren' },
};

/**
 * Topics whose exercises allow the calculator (calculator spec §3): the play screen shows the
 * calculator button on them, and the short practice test leaves them out.
 */
export const CALCULATOR_TOPICS: ReadonlySet<Topic> = new Set<Topic>(['calcCircle', 'calcVolume']);

export function allowsCalculator(topic: Topic): boolean {
  return CALCULATOR_TOPICS.has(topic);
}
