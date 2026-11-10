import { Simulation } from "./simulation.js";
export interface ProvenanceRecord {
    software: string;
    softwareVersion: string;
    simulationVersion: string;
    seed: number;
    config: Record<string, any>;
    initialConditions: Record<string, any>;
    parameters: Record<string, any>;
    runtimeMs: number;
    startTime: string;
    endTime: string;
    results: Record<string, any>;
    knownLimitations: string[];
    dataHash: string;
}
export interface SaveFileMetadata {
    formatVersion: string;
    createdAt: string;
    simulationTick: number;
    organismCount: number;
    colonyCount: number;
    checksum: string;
}
export declare const SOFTWARE_NAME = "Project DIGITAL SPECIES";
export declare const SOFTWARE_VERSION = "2.0.0";
export declare const SIMULATION_VERSION = "2.0.0";
export declare function createProvenanceRecord(sim: Simulation, startTime: string, runtimeMs: number, results: Record<string, any>, knownLimitations?: string[]): ProvenanceRecord;
export declare function validateSaveFile(data: any): {
    valid: boolean;
    errors: string[];
};
export declare function createSaveFileMetadata(sim: Simulation): SaveFileMetadata;
export declare function formatProvenanceForExport(prov: ProvenanceRecord): string;
export declare function formatExperimentReport(prov: ProvenanceRecord, stats: any, noveltyEvents: any[], phylogenyStats: any): string;
