import { clamp } from "./rng.js";
const NUC = "ACGT";
export const DNA_LENGTH = 192; // nucleotides; 64 codons worth of info
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
    size: 0.8,
    strength: 0.5,
    aggression: 0.3,
    altruism: 0.2,
    bioluminescence: 0.1,
    adhesion: 0.3,
    cooperation: 0.3,
    evolvableMutationRate: 0.02,
    evolvableLearningRate: 0.01,
    cellRolePreference: 0.0,
    apoptosisTendency: 0.1,
    groupSelectionWeight: 0.2,
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
    size: 0.3,
    strength: 0.0,
    aggression: 0.0,
    altruism: 0.0,
    bioluminescence: 0.0,
    adhesion: 0.0,
    cooperation: 0.0,
    evolvableMutationRate: 0.0005,
    evolvableLearningRate: 0.0001,
    cellRolePreference: 0.0,
    apoptosisTendency: 0.0,
    groupSelectionWeight: 0.0,
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
    size: 2.0,
    strength: 1.0,
    aggression: 1.0,
    altruism: 1.0,
    bioluminescence: 1.0,
    adhesion: 1.0,
    cooperation: 1.0,
    evolvableMutationRate: 0.2,
    evolvableLearningRate: 0.1,
    cellRolePreference: 1.0,
    apoptosisTendency: 1.0,
    groupSelectionWeight: 1.0,
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
    "size",
    "strength",
    "aggression",
    "altruism",
    "bioluminescence",
    "adhesion",
    "cooperation",
    "evolvableMutationRate",
    "evolvableLearningRate",
    "cellRolePreference",
    "apoptosisTendency",
    "groupSelectionWeight",
];
export const DEFAULT_LAYOUT = {
    inputs: 14,
    hidden: 20,
    outputs: 8,
};
export function weightCount(layout) {
    return (layout.inputs * layout.hidden +
        layout.hidden +
        layout.hidden * layout.outputs +
        layout.outputs);
}
function randomDna(rng) {
    const d = new Uint8Array(DNA_LENGTH);
    for (let i = 0; i < DNA_LENGTH; i++)
        d[i] = rng.int(0, 3);
    return d;
}
function mutateDna(dna, rng, rate) {
    const child = new Uint8Array(dna);
    for (let i = 0; i < DNA_LENGTH; i++) {
        if (rng.random() < rate * 4) {
            child[i] = rng.int(0, 3);
        }
    }
    return child;
}
function crossoverDna(a, b, rng) {
    const cut = rng.int(0, DNA_LENGTH - 1);
    const child = new Uint8Array(DNA_LENGTH);
    for (let i = 0; i < cut; i++)
        child[i] = a[i];
    for (let i = cut; i < DNA_LENGTH; i++)
        child[i] = b[i];
    return child;
}
function dnaToNumber(dna, start, len) {
    let v = 0;
    for (let i = 0; i < len; i++) {
        v = (v << 2) | dna[start + i];
    }
    const max = (1 << (2 * len)) - 1;
    return max === 0 ? 0 : v / max;
}
export function dnaToMorphotype(dna) {
    const bpIdx = Math.floor(dnaToNumber(dna, 0, 4) * 4);
    const bodyPlans = [
        "blob",
        "segmented",
        "star",
        "spiral",
        "rays",
    ];
    return {
        bodyPlan: bodyPlans[bpIdx],
        segmentCount: 2 + Math.floor(dnaToNumber(dna, 4, 4) * 6),
        limbPairs: Math.floor(dnaToNumber(dna, 8, 4) * 4),
        thickness: 0.4 + dnaToNumber(dna, 12, 4) * 0.8,
        curvature: -1 + dnaToNumber(dna, 16, 4) * 2,
        colorHue: Math.floor(dnaToNumber(dna, 20, 6) * 360),
        colorSat: 40 + dnaToNumber(dna, 26, 6) * 50,
        colorLum: 30 + dnaToNumber(dna, 32, 6) * 40,
        glowHue: Math.floor(dnaToNumber(dna, 38, 6) * 360),
        glowIntensity: dnaToNumber(dna, 44, 6),
        scale: 0.5 + dnaToNumber(dna, 50, 6),
    };
}
export function createRandomGenome(rng, layout = DEFAULT_LAYOUT) {
    const w = weightCount(layout);
    const weights = new Float32Array(w);
    for (let i = 0; i < w; i++) {
        weights[i] = rng.range(-1, 1);
    }
    const dna = randomDna(rng);
    const morpho = dnaToMorphotype(dna);
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
        size: morpho.scale,
        strength: rng.range(0.0, 0.6),
        aggression: rng.range(0.0, 0.5),
        altruism: rng.range(0.0, 0.5),
        bioluminescence: morpho.glowIntensity * 0.5 + 0.1,
        adhesion: rng.range(0.0, 0.5),
        cooperation: rng.range(0.0, 0.5),
        evolvableMutationRate: rng.range(0.005, 0.05),
        evolvableLearningRate: rng.range(0.001, 0.02),
        cellRolePreference: rng.random(),
        apoptosisTendency: rng.range(0.0, 0.3),
        groupSelectionWeight: rng.range(0.0, 0.4),
    };
    return { weights, traits, dna, dnaVersion: 1 };
}
export function cloneGenome(g) {
    return {
        weights: new Float32Array(g.weights),
        traits: { ...g.traits },
        dna: new Uint8Array(g.dna),
        dnaVersion: g.dnaVersion,
    };
}
export function crossoverGenome(a, b, rng) {
    const child = cloneGenome(a);
    const n = Math.min(a.weights.length, b.weights.length);
    const cut = rng.int(0, n - 1);
    for (let i = cut; i < n; i++) {
        child.weights[i] = b.weights[i];
    }
    child.dna = crossoverDna(a.dna, b.dna, rng);
    const morpho = dnaToMorphotype(child.dna);
    // trait blending: each trait inherited from one parent or averaged
    for (const key of TRAIT_KEYS) {
        const r = rng.random();
        if (r < 0.45) {
            child.traits[key] = a.traits[key];
        }
        else if (r < 0.9) {
            child.traits[key] = b.traits[key];
        }
        else {
            child.traits[key] = (a.traits[key] + b.traits[key]) * 0.5;
        }
    }
    child.traits.size = morpho.scale;
    child.traits.bioluminescence = morpho.glowIntensity * 0.5 + 0.1;
    child.dnaVersion = a.dnaVersion + b.dnaVersion + 1;
    return child;
}
export function mutateGenome(parent, rng) {
    const child = cloneGenome(parent);
    // Evolution of evolvability: the mutation rate itself is an evolvable trait
    // that mutates at a lower meta-rate (Tokyo Type 2 OEE).
    const mr = parent.traits.evolvableMutationRate;
    const metaMr = Math.max(mr * 0.1, 0.0002);
    for (let i = 0; i < child.weights.length; i++) {
        if (rng.random() < mr) {
            child.weights[i] += rng.gauss() * 0.3 * mr;
        }
    }
    child.dna = mutateDna(child.dna, rng, mr);
    const morpho = dnaToMorphotype(child.dna);
    for (const key of TRAIT_KEYS) {
        if (key === "evolvableMutationRate") {
            // meta-mutation: mutation rate mutates at a reduced meta-rate
            if (rng.random() < metaMr) {
                const cur = child.traits[key];
                const next = clamp(cur + rng.gauss() * 0.2 * (TRAIT_MAX[key] - TRAIT_MIN[key]) * metaMr, TRAIT_MIN[key], TRAIT_MAX[key]);
                child.traits[key] = next;
            }
            continue;
        }
        if (key === "evolvableLearningRate") {
            if (rng.random() < metaMr) {
                const cur = child.traits[key];
                const next = clamp(cur + rng.gauss() * 0.2 * (TRAIT_MAX[key] - TRAIT_MIN[key]) * metaMr, TRAIT_MIN[key], TRAIT_MAX[key]);
                child.traits[key] = next;
            }
            continue;
        }
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
    child.traits.size = morpho.scale;
    child.traits.bioluminescence = morpho.glowIntensity * 0.5 + 0.1;
    child.dnaVersion += 1;
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
    // DNA distance (Hamming normalized)
    let dnaD = 0;
    const dn = Math.min(a.dna.length, b.dna.length);
    for (let i = 0; i < dn; i++) {
        if (a.dna[i] !== b.dna[i])
            dnaD += 1;
    }
    d += dnaD / dn;
    return d / (n + TRAIT_KEYS.length + 1);
}
export function genomeHashColor(g) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < g.weights.length; i++) {
        const b = new Float32Array([g.weights[i]]);
        const dv = new DataView(b.buffer);
        h ^= dv.getUint32(0, true);
        h = (h * 16777619) >>> 0;
    }
    for (const key of TRAIT_KEYS) {
        const v = g.traits[key];
        const b = new Float32Array([v]);
        const dv = new DataView(b.buffer);
        h ^= dv.getUint32(0, true);
        h = (h * 16777619) >>> 0;
    }
    for (let i = 0; i < g.dna.length; i += 4) {
        h ^= g.dna[i];
        h = (h * 16777619) >>> 0;
    }
    const hue = h % 360;
    const sat = 50 + (h % 40);
    return `hsl(${hue},${sat}%,55%)`;
}
export function dnaString(dna) {
    let s = "";
    for (let i = 0; i < dna.length; i++)
        s += NUC[dna[i]];
    return s;
}
export function dnaFromString(s) {
    const d = new Uint8Array(Math.min(s.length, DNA_LENGTH));
    const m = { A: 0, C: 1, G: 2, T: 3 };
    for (let i = 0; i < d.length; i++)
        d[i] = m[s[i]] ?? 0;
    return d;
}
