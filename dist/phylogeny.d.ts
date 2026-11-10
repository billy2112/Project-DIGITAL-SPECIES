import { Simulation } from "./simulation.js";
export interface PhyloNode {
    id: number;
    parentId: number | null;
    generation: number;
    children: number[];
    energy: number;
    age: number;
    dead: boolean;
    genomeHash: string;
    traits: Record<string, any>;
    x: number;
    y: number;
}
export interface PhylogenyResult {
    rootNodes: number[];
    nodes: Map<number, PhyloNode>;
    totalOrganisms: number;
    totalLineages: number;
    maxDepth: number;
}
/** Build a phylogenetic forest from the current organism population.
 * Each organism is a node; parentId links to its parent (asexual) or
 * one parent (sexual). Root nodes are organisms with no parent in the
 * current population (either seeded founders or parents that died). */
export declare function buildPhylogeny(sim: Simulation): PhylogenyResult;
/** Export phylogeny as Newick format (standard for phylogenetics) */
export declare function phylogenyToNewick(sim: Simulation): string;
/** Export phylogeny as adjacency list CSV (id,parent_id,generation,energy,dead) */
export declare function phylogenyCsv(sim: Simulation): string;
export declare function downloadPhylogenyCsv(sim: Simulation): void;
export declare function downloadPhylogenyNewick(sim: Simulation): void;
