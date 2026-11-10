export declare class RNG {
    state: number;
    constructor(seed: number);
    random(): number;
    range(min: number, max: number): number;
    int(min: number, max: number): number;
    pick<T>(arr: T[]): T;
    gauss(): number;
    getState(): number;
    setState(state: number): void;
    clone(): RNG;
}
export declare const clamp: (v: number, min: number, max: number) => number;
export declare const sigmoid: (x: number) => number;
export declare const tanh: (x: number) => number;
