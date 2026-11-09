import { RNG, clamp } from "./rng.js";
import { Organism } from "./organism.js";
import { Genome } from "./genome.js";

export type CellRole = "free" | "gatherer" | "reproducer" | "defender" | "signal";

export const CELL_ROLES: CellRole[] = ["free", "gatherer", "reproducer", "defender", "signal"];

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

export class Colony {
  readonly id: number;
  memberIds: number[] = [];
  x = 0;
  y = 0;
  energy = 0;
  age = 0;
  generation = 1;
  dead = false;
  private roleAssignment: Map<number, CellRole> = new Map();

  constructor(id: number, seedMemberId: number, seedEnergy: number) {
    this.id = id;
    this.memberIds.push(seedMemberId);
    this.energy = seedEnergy;
  }

  addMember(orgId: number, role: CellRole = "gatherer"): void {
    if (!this.memberIds.includes(orgId)) this.memberIds.push(orgId);
    this.roleAssignment.set(orgId, role);
  }

  removeMember(orgId: number): void {
    const idx = this.memberIds.indexOf(orgId);
    if (idx >= 0) this.memberIds.splice(idx, 1);
    this.roleAssignment.delete(orgId);
  }

  getRole(orgId: number): CellRole {
    return this.roleAssignment.get(orgId) ?? "free";
  }

  setRole(orgId: number, role: CellRole): void {
    this.roleAssignment.set(orgId, role);
  }

  getState(): ColonyState {
    const roleCounts: Record<CellRole, number> = {
      free: 0, gatherer: 0, reproducer: 0, defender: 0, signal: 0,
    };
    for (const role of this.roleAssignment.values()) {
      roleCounts[role] = (roleCounts[role] ?? 0) + 1;
    }
    return {
      id: this.id,
      memberIds: [...this.memberIds],
      x: this.x,
      y: this.y,
      energy: this.energy,
      age: this.age,
      generation: this.generation,
      roleCounts,
      memberCount: this.memberIds.length,
    };
  }

  recomputeCentroid(getPos: (id: number) => { x: number; y: number }): void {
    if (this.memberIds.length === 0) return;
    let sx = 0, sy = 0;
    for (const id of this.memberIds) {
      const p = getPos(id);
      sx += p.x;
      sy += p.y;
    }
    this.x = sx / this.memberIds.length;
    this.y = sy / this.memberIds.length;
  }

  // Energy needed for this colony to bud a propagule (scales with size)
  budThreshold(): number {
    return 40 + this.memberIds.length * 25;
  }

  // How many cells to seed into a daughter colony
  budCellCount(rng: RNG): number {
    return 2 + rng.int(0, Math.min(4, Math.max(1, this.memberIds.length)));
  }

  // ---- Serialization ----

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
  } {
    return {
      id: this.id,
      memberIds: [...this.memberIds],
      x: this.x,
      y: this.y,
      energy: this.energy,
      age: this.age,
      generation: this.generation,
      dead: this.dead,
      roleAssignment: Object.fromEntries(this.roleAssignment),
    };
  }

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
  }): Colony {
    const colony = new Colony(
      data.id,
      data.memberIds[0] ?? 0,
      data.energy
    );
    colony.memberIds = [...data.memberIds];
    colony.x = data.x;
    colony.y = data.y;
    colony.energy = data.energy;
    colony.age = data.age;
    colony.generation = data.generation;
    colony.dead = data.dead;
    colony.roleAssignment = new Map(
      Object.entries(data.roleAssignment).map(([k, v]) => [parseInt(k), v as CellRole])
    );
    return colony;
  }
}
