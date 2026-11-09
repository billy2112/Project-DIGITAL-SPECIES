import { Morphotype } from "./genome.js";
export interface ModelPart {
    kind: "sphere" | "cylinder" | "box";
    position: [number, number, number];
    rotation: [number, number, number];
    scale: [number, number, number];
    color: [number, number, number];
    emissive: [number, number, number];
    emissiveIntensity: number;
}
export declare function morphotypeKey(m: Morphotype): string;
export declare function generateModel(m: Morphotype, energy: number, size: number): ModelPart[];
