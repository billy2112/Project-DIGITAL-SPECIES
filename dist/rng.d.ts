export declare class RNG {
    private next;
    constructor(seed: number);
    random(): number;
    range(min: number, max: number): number;
    int(min: number, max: number): number;
    pick<T>(arr: T[]): T;
    gauss(): number;
}
export declare const clamp: (v: number, min: number, max: number) => number;
export declare const sigmoid: (x: number) => number;
export declare const tanh: (x: number) => number;
