const MUL = 0x100000000;

function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / MUL;
  };
}

export class RNG {
  private next: () => number;
  constructor(seed: number) {
    this.next = mulberry32(seed >>> 0);
  }
  random(): number {
    return this.next();
  }
  range(min: number, max: number): number {
    return min + this.random() * (max - min);
  }
  int(min: number, max: number): number {
    return min + Math.floor(this.random() * (max - min + 1));
  }
  pick<T>(arr: T[]): T {
    return arr[Math.floor(this.random() * arr.length)];
  }
  gauss(): number {
    let u = 0,
      v = 0;
    while (u === 0) u = this.random();
    while (v === 0) v = this.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }
}

export const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));

export const sigmoid = (x: number): number => 1 / (1 + Math.exp(-x));
export const tanh = (x: number): number => Math.tanh(x);
