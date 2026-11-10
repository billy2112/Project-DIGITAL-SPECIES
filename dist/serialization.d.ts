import { Simulation } from "./simulation.js";
export declare const SAVE_VERSION = 1;
export interface SimSaveData {
    version: number;
    state: ReturnType<Simulation["captureState"]>;
}
export declare function serializeSimulation(sim: Simulation): SimSaveData;
export declare function deserializeSimulation(data: SimSaveData): Simulation;
export declare function saveToJSON(sim: Simulation): string;
export declare function loadFromJSON(json: string): Simulation;
export declare function saveToString(sim: Simulation): string;
