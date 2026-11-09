const MUL = 0x100000000;
function mulberry32(seed) {
    return () => {
        seed |= 0;
        seed = (seed + 0x6d2b79f5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / MUL;
    };
}
export class RNG {
    next;
    constructor(seed) {
        this.next = mulberry32(seed >>> 0);
    }
    random() {
        return this.next();
    }
    range(min, max) {
        return min + this.random() * (max - min);
    }
    int(min, max) {
        return min + Math.floor(this.random() * (max - min + 1));
    }
    pick(arr) {
        return arr[Math.floor(this.random() * arr.length)];
    }
    gauss() {
        let u = 0, v = 0;
        while (u === 0)
            u = this.random();
        while (v === 0)
            v = this.random();
        return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    }
}
export const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
export const sigmoid = (x) => 1 / (1 + Math.exp(-x));
export const tanh = (x) => Math.tanh(x);
