import { clamp } from "./rng.js";
export const TRAIT_DEFAULTS = {
    baseMaintenance: 0.15,
    moveCost: 0.05,
    thinkCost: 0.001,
    reproductionThreshold: 80,
    reproductionCost: 20,
    mutationRate: 0.02,
    visionRange: 5,
    memoryCapacity: 4,
    maxAge: 1200,
    speed: 1.5,
};
export const TRAIT_MIN = {
    baseMaintenance: 0.02,
    moveCost: 0.01,
    thinkCost: 0.0001,
    reproductionThreshold: 40,
    reproductionCost: 5,
    mutationRate: 0.001,
    visionRange: 2,
    memoryCapacity: 1,
    maxAge: 300,
    speed: 0.5,
};
export const TRAIT_MAX = {
    baseMaintenance: 1.0,
    moveCost: 0.5,
    thinkCost: 0.01,
    reproductionThreshold: 200,
    reproductionCost: 50,
    mutationRate: 0.1,
    visionRange: 12,
    memoryCapacity: 12,
    maxAge: 5000,
    speed: 3.0,
};
const TRAIT_KEYS = [
    "baseMaintenance",
    "moveCost",
    "thinkCost",
    "reproductionThreshold",
    "reproductionCost",
    "mutationRate",
    "visionRange",
    "memoryCapacity",
    "maxAge",
    "speed",
];
export const DEFAULT_LAYOUT = {
    inputs: 12,
    hidden: 16,
    outputs: 6,
};
export function weightCount(layout) {
    return (layout.inputs * layout.hidden +
        layout.hidden +
        layout.hidden * layout.outputs +
        layout.outputs);
}
export function createRandomGenome(rng, layout = DEFAULT_LAYOUT) {
    const w = weightCount(layout);
    const weights = new Float32Array(w);
    for (let i = 0; i < w; i++) {
        weights[i] = rng.range(-1, 1);
    }
    const traits = {
        baseMaintenance: rng.range(0.05, 0.3),
        moveCost: rng.range(0.02, 0.1),
        thinkCost: rng.range(0.0002, 0.002),
        reproductionThreshold: rng.range(60, 100),
        reproductionCost: rng.range(10, 30),
        mutationRate: rng.range(0.01, 0.05),
        visionRange: rng.range(3, 8),
        memoryCapacity: rng.int(2, 8),
        maxAge: rng.range(600, 1500),
        speed: rng.range(0.8, 2.0),
    };
    return { weights, traits };
}
export function cloneGenome(g) {
    return {
        weights: new Float32Array(g.weights),
        traits: { ...g.traits },
    };
}
export function mutateGenome(parent, rng) {
    const child = cloneGenome(parent);
    const mr = parent.traits.mutationRate;
    for (let i = 0; i < child.weights.length; i++) {
        if (rng.random() < mr) {
            child.weights[i] += rng.gauss() * 0.3 * mr;
        }
    }
    for (const key of TRAIT_KEYS) {
        if (rng.random() < mr) {
            const lo = TRAIT_MIN[key];
            const hi = TRAIT_MAX[key];
            const cur = child.traits[key];
            let next;
            if (key === "memoryCapacity") {
                next = Math.round(rng.range(lo, hi));
            }
            else {
                next = cur + rng.gauss() * 0.2 * (hi - lo) * mr;
            }
            child.traits[key] = clamp(next, lo, hi);
            if (key === "memoryCapacity") {
                child.traits[key] = Math.round(child.traits[key]);
            }
        }
    }
    return child;
}
export function genomeDistance(a, b) {
    let d = 0;
    const n = Math.min(a.weights.length, b.weights.length);
    for (let i = 0; i < n; i++) {
        d += Math.abs(a.weights[i] - b.weights[i]);
    }
    for (const key of TRAIT_KEYS) {
        d += Math.abs(a.traits[key] - b.traits[key]);
    }
    return d / (n + TRAIT_KEYS.length);
}
