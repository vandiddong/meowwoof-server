export function hashSeed(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
export class Random {
  private value: number;
  constructor(seed: string | number) { this.value = typeof seed === 'string' ? hashSeed(seed) : seed; }
  next() { let t = this.value += 0x6D2B79F5; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }
  range(a: number, b: number) { return a + (b-a) * this.next(); }
  int(a: number, b: number) { return Math.floor(this.range(a, b+1)); }
  pick<T>(items: readonly T[]) { return items[this.int(0, items.length-1)]; }
}
