import { Simulation } from "./simulation.js";
export interface NoveltyEvent {
    eventType: "feeding" | "locomotion" | "cooperation" | "morphology" | "signaling" | "reproduction" | "species_split";
    tick: number;
    organismId: number;
    lineageId: number;
    description: string;
    severity: "low" | "medium" | "high";
    evidence: Record<string, number>;
    geneticChanges: string[];
    environmentalConditions: Record<string, number>;
}
export interface NoveltyDetectionResult {
    events: NoveltyEvent[];
    noveltyScore: number;
    newBehaviors: string[];
    recommendations: string[];
}
export interface PopulationSnapshot {
    tick: number;
    organisms: Array<{
        id: number;
        parentId: number | null;
        generation: number;
        energy: number;
        x: number;
        y: number;
        colonyId: number | null;
        role: string;
        genome: {
            weights: number[];
            traits: Record<string, number>;
            dna: number[];
        };
    }>;
    world: {
        avgFood: number;
        avgPheromone: number;
        totalFood: number;
    };
}
export declare class NoveltyDetector {
    private maxHistory;
    private history;
    private detectedEvents;
    private baselineTraits;
    private seenBodyPlans;
    private seenStrategies;
    constructor(maxHistory?: number);
    record(sim: Simulation): void;
    detect(sim: Simulation): NoveltyDetectionResult;
    private dnaToBodyPlan;
    private computeResult;
    private generateRecommendations;
    getEvents(): NoveltyEvent[];
    exportEventsCsv(): string;
    downloadEventsCsv(): void;
}
