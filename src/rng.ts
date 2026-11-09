const MUL = 0x100000000;

export class RNG {
  public state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  random(): number {
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (this.state >>> 7), 61 | this.state)) ^ t;
    return ((t ^ (this.state >>> 14)) >>> 0) / MUL;
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

  getState(): number {
    return this.state >>> 0;
  }

  setState(state: number): void {
    this.state = state >>> 0;
  }

  clone(): RNG {
    const clone = new RNG(0);
    clone.state = this.state;
    return clone;
  }
}

export const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));

export const sigmoid = (x: number): number => 1 / (1 + Math.exp(-x));
export const tanh = (x: number): number => Math.tanh(x);
