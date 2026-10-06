import { describe, expect, it } from 'vitest';
import { gcd, isPrime, lcm, primeFactors, smallestPrimeFactor } from './primes';

function bruteGcd(a: number, b: number): number {
  for (let d = Math.min(a, b); d > 1; d--) {
    if (a % d === 0 && b % d === 0) return d;
  }
  return 1;
}

function bruteIsPrime(n: number): boolean {
  if (n < 2) return false;
  for (let d = 2; d < n; d++) if (n % d === 0) return false;
  return true;
}

describe('gcd and lcm', () => {
  it('match brute force for every pair up to 60', () => {
    for (let a = 1; a <= 60; a++) {
      for (let b = 1; b <= 60; b++) {
        expect(gcd(a, b)).toBe(bruteGcd(a, b));
        expect(lcm(a, b)).toBe((a * b) / bruteGcd(a, b));
      }
    }
  });

  it('handles zero', () => {
    expect(gcd(0, 5)).toBe(5);
    expect(gcd(0, 0)).toBe(0);
    expect(lcm(0, 5)).toBe(0);
  });
});

describe('isPrime', () => {
  it('matches brute force up to 1000', () => {
    for (let n = 0; n <= 1000; n++) expect(isPrime(n), String(n)).toBe(bruteIsPrime(n));
  });

  it('rejects negative numbers and non-integers', () => {
    for (const n of [-7, 2.5, Number.NaN]) expect(isPrime(n)).toBe(false);
  });
});

describe('smallestPrimeFactor', () => {
  it.each([
    [2, 2],
    [91, 7],
    [121, 11],
    [199, 199],
    [200, 2],
  ])('of %i is %i', (n, expected) => {
    expect(smallestPrimeFactor(n)).toBe(expected);
  });

  it('rejects numbers below 2', () => {
    expect(() => smallestPrimeFactor(1)).toThrow(RangeError);
  });
});

describe('primeFactors', () => {
  it('factorizes 84 as 2² × 3 × 7', () => {
    expect(primeFactors(84)).toEqual([
      { prime: 2, exponent: 2 },
      { prime: 3, exponent: 1 },
      { prime: 7, exponent: 1 },
    ]);
  });

  it('returns no factors for 1', () => {
    expect(primeFactors(1)).toEqual([]);
  });

  it('rebuilds every number up to 1000 from distinct ascending primes', () => {
    for (let n = 1; n <= 1000; n++) {
      const factors = primeFactors(n);
      const primes = factors.map(({ prime }) => prime);
      expect(factors.reduce((product, f) => product * f.prime ** f.exponent, 1)).toBe(n);
      expect(factors.every((f) => bruteIsPrime(f.prime) && f.exponent >= 1)).toBe(true);
      expect(primes).toEqual([...primes].sort((x, y) => x - y));
      expect(new Set(primes).size).toBe(primes.length);
    }
  });

  it('rejects numbers below 1', () => {
    expect(() => primeFactors(0)).toThrow(RangeError);
  });
});
