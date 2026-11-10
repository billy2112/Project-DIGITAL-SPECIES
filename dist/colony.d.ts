import { RNG } from "./rng.js";
export type CellRole = "free" | "gatherer" | "reproducer" | "defender" | "signal";
export declare const CELL_ROLES: CellRole[];
export interface ColonyState {
    id: number;
    memberIds: number[];
    x: number;
    y: number;
    energy: number;
    age: number;
    generation: number;
    roleCounts: Record<CellRole, number>;
    memberCount: number;
}
export interface ColonyBudEvent {
    parentColonyId: number;
    childColonyId: number;
    x: number;
    y: number;
    cellCount: number;
}
export interface ColonyDeathEvent {
    colonyId: number;
    x: number;
    y: number;
}
export declare class Colony {
    readonly id: number;
    memberIds: number[];
    x: number;
    y: number;
    energy: number;
    age: number;
    generation: number;
    dead: boolean;
    private roleAssignment;
    constructor(id: number, seedMemberId: number, seedEnergy: number);
    addMember(orgId: number, role?: CellRole): void;
    removeMember(orgId: number): void;
    getRole(orgId: number): CellRole;
    setRole(orgId: number, role: CellRole): void;
    getState(): ColonyState;
    recomputeCentroid(getPos: (id: number) => {
        x: number;
        y: number;
    }): void;
    budThreshold(): number;
    budCellCount(rng: RNG): number;
    serialize(): {
        id: number;
        memberIds: number[];
        x: number;
        y: number;
        energy: number;
        age: number;
        generation: number;
        dead: boolean;
        roleAssignment: Record<number, CellRole>;
    };
    static deserialize(data: {
        id: number;
        memberIds: number[];
        x: number;
        y: number;
        energy: number;
        age: number;
        generation: number;
        dead: boolean;
        roleAssignment: Record<number, CellRole>;
    }): Colony;
}
