import { Simulation } from "./simulation.js";
export interface OrganismRecord {
    tick: number;
    id: number;
    generation: number;
    age: number;
    energy: number;
    x: number;
    y: number;
    colony_id: number | null;
    role: string;
    dead: boolean;
    parent_id: number | null;
    genome_hash: string;
    size: number;
    strength: number;
    aggression: number;
    altruism: number;
    cooperation: number;
    bioluminescence: number;
    mutation_rate: number;
    learning_rate: number;
    memory_capacity: number;
    vision_range: number;
    speed: number;
    base_maintenance: number;
    dna: string;
    weights_mean: number;
    weights_std: number;
}
export interface ColonyRecord {
    tick: number;
    id: number;
    generation: number;
    age: number;
    energy: number;
    member_count: number;
    dead: boolean;
    role_free: number;
    role_gatherer: number;
    role_reproducer: number;
    role_defender: number;
    role_signal: number;
}
export interface PopulationSnapshot {
    tick: number;
    day: number;
    population: number;
    colony_count: number;
    total_births: number;
    total_deaths: number;
    total_apoptosis: number;
    total_kills: number;
    total_colony_buds: number;
    total_colony_deaths: number;
    avg_energy: number;
    avg_age: number;
    avg_size: number;
    avg_strength: number;
    avg_aggression: number;
    avg_altruism: number;
    avg_cooperation: number;
    avg_mutation_rate: number;
    species_count: number;
}
export interface ExperimentMetadata {
    seed: number;
    config: Record<string, any>;
    start_tick: number;
    end_tick: number;
    duration_ticks: number;
    software_version: string;
}
export declare function organismHash(g: any): string;
export declare function mean(arr: number[]): number;
export declare function stdDev(arr: number[]): number;
export declare function escapeCsv(v: any): string;
export declare function csvHeader(keys: string[]): string;
export declare function csvRow(values: any[]): string;
/** Export all living organisms at current tick as CSV */
export declare function exportOrganismsCsv(sim: Simulation, tick: number): string;
/** Export population time-series snapshot as CSV */
export declare function exportPopulationCsv(snap: PopulationSnapshot): string;
/** Export full simulation state as JSON (scientific archive format) */
export declare function exportSimulationJson(sim: Simulation, metadata?: Partial<ExperimentMetadata>): string;
export declare function downloadBlob(content: string, filename: string, mime?: string): void;
/** Download organisms CSV */
export declare function downloadOrganismsCsv(sim: Simulation, tick: number): void;
/** Download full simulation JSON archive */
export declare function downloadSimulationJson(sim: Simulation, metadata?: Partial<ExperimentMetadata>): void;
