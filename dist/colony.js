export const CELL_ROLES = ["free", "gatherer", "reproducer", "defender", "signal"];
export class Colony {
    id;
    memberIds = [];
    x = 0;
    y = 0;
    energy = 0;
    age = 0;
    generation = 1;
    dead = false;
    roleAssignment = new Map();
    constructor(id, seedMemberId, seedEnergy) {
        this.id = id;
        this.memberIds.push(seedMemberId);
        this.energy = seedEnergy;
    }
    addMember(orgId, role = "gatherer") {
        if (!this.memberIds.includes(orgId))
            this.memberIds.push(orgId);
        this.roleAssignment.set(orgId, role);
    }
    removeMember(orgId) {
        const idx = this.memberIds.indexOf(orgId);
        if (idx >= 0)
            this.memberIds.splice(idx, 1);
        this.roleAssignment.delete(orgId);
    }
    getRole(orgId) {
        return this.roleAssignment.get(orgId) ?? "free";
    }
    setRole(orgId, role) {
        this.roleAssignment.set(orgId, role);
    }
    getState() {
        const roleCounts = {
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
    recomputeCentroid(getPos) {
        if (this.memberIds.length === 0)
            return;
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
    budThreshold() {
        return 40 + this.memberIds.length * 25;
    }
    // How many cells to seed into a daughter colony
    budCellCount(rng) {
        return 2 + rng.int(0, Math.min(4, Math.max(1, this.memberIds.length)));
    }
    serialize() {
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
    static deserialize(data) {
        const colony = new Colony(data.id, data.memberIds[0] ?? 0, data.energy);
        colony.memberIds = [...data.memberIds];
        colony.x = data.x;
        colony.y = data.y;
        colony.energy = data.energy;
        colony.age = data.age;
        colony.generation = data.generation;
        colony.dead = data.dead;
        colony.roleAssignment = new Map(Object.entries(data.roleAssignment).map(([k, v]) => [parseInt(k), v]));
        return colony;
    }
}
