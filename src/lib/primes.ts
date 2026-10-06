function assertSafeIntegers(...values: number[]): void {
  for (const value of values) {
    if (!Number.isSafeInteger(value)) throw new RangeError(`Not a safe integer: ${value}`);
  }
}

/** Greatest common divisor; gcd(0, 0) = 0. */
export function gcd(a: number, b: number): number {
  assertSafeIntegers(a, b);
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) [x, y] = [y, x % y];
  return x;
}

/** Least common multiple; 0 when either number is 0. */
export function lcm(a: number, b: number): number {
  assertSafeIntegers(a, b);
  if (a === 0 || b === 0) return 0;
  return (Math.abs(a) / gcd(a, b)) * Math.abs(b);
}

/** Trial division: fast enough for the numbers in this app (at most 5 digits). */
export function isPrime(n: number): boolean {
  if (!Number.isSafeInteger(n) || n < 2) return false;
  for (let d = 2; d * d <= n; d++) if (n % d === 0) return false;
  return true;
}

/** Smallest prime that divides n (n itself when n is prime); throws for n < 2. */
export function smallestPrimeFactor(n: number): number {
  if (!Number.isSafeInteger(n) || n < 2) throw new RangeError(`No prime factor: ${n}`);
  for (let d = 2; d * d <= n; d++) if (n % d === 0) return d;
  return n;
}

export interface PrimePower {
  prime: number;
  exponent: number;
}

/** Ascending by prime: 84 → 2², 3, 7. Returns no factors for 1. */
export function primeFactors(n: number): PrimePower[] {
  if (!Number.isSafeInteger(n) || n < 1) throw new RangeError(`Cannot factorize ${n}`);
  const factors: PrimePower[] = [];
  let rest = n;
  while (rest > 1) {
    const prime = smallestPrimeFactor(rest);
    let exponent = 0;
    while (rest % prime === 0) {
      rest /= prime;
      exponent++;
    }
    factors.push({ prime, exponent });
  }
  return factors;
}
