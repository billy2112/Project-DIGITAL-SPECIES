export const WORLD_DEFAULTS = {
    width: 100,
    height: 100,
    foodRegenRate: 0.05,
    foodMaxPerCell: 100,
    foodSpawnChance: 0.02,
    pheromoneDecay: 0.02,
    energyRewardPerFood: 1,
};
export class World {
    width;
    height;
    food;
    pheromone;
    config;
    organismIdCounter = 0;
    constructor(config = {}) {
        this.config = { ...WORLD_DEFAULTS, ...config };
        this.width = this.config.width;
        this.height = this.config.height;
        const size = this.width * this.height;
        this.food = new Float32Array(size);
        this.pheromone = new Float32Array(size);
        for (let i = 0; i < size; i++) {
            this.food[i] = Math.random() * this.config.foodMaxPerCell;
        }
    }
    idx(x, y) {
        const xi = ((x % this.width) + this.width) % this.width;
        const yi = ((y % this.height) + this.height) % this.height;
        return yi * this.width + xi;
    }
    foodAt(x, y) {
        return this.food[this.idx(x, y)];
    }
    consumeFood(x, y, amount) {
        const i = this.idx(x, y);
        const available = this.food[i];
        const take = Math.min(available, amount);
        this.food[i] = Math.max(0, available - take);
        return take;
    }
    pheromoneAt(x, y) {
        return this.pheromone[this.idx(x, y)];
    }
    depositPheromone(x, y, amount) {
        const i = this.idx(x, y);
        this.pheromone[i] = Math.min(1, this.pheromone[i] + amount);
    }
    regenerateFood(rng) {
        const size = this.width * this.height;
        for (let i = 0; i < size; i++) {
            if (this.food[i] < this.config.foodMaxPerCell) {
                this.food[i] += this.config.foodRegenRate;
                if (this.food[i] > this.config.foodMaxPerCell) {
                    this.food[i] = this.config.foodMaxPerCell;
                }
            }
            if (rng.random() < this.config.foodSpawnChance) {
                this.food[i] = Math.min(this.config.foodMaxPerCell, this.food[i] + rng.range(1, 20));
            }
        }
    }
    decayPheromones() {
        const size = this.width * this.height;
        for (let i = 0; i < size; i++) {
            this.pheromone[i] *= 1 - this.config.pheromoneDecay;
            if (this.pheromone[i] < 0.001)
                this.pheromone[i] = 0;
        }
    }
    forNearby(x, y, range, cb) {
        const r = Math.floor(range);
        for (let dy = -r; dy <= r; dy++) {
            for (let dx = -r; dx <= r; dx++) {
                const nx = x + dx;
                const ny = y + dy;
                const d = Math.hypot(dx, dy);
                if (d > range)
                    continue;
                const i = this.idx(nx, ny);
                if (this.food[i] > 0) {
                    cb(nx, ny, "food", this.food[i]);
                }
            }
        }
    }
    nextOrganismId() {
        return ++this.organismIdCounter;
    }
    addOrganism(org) {
        // placeholder; simulation owns the organism list
    }
    getSnapshot() {
        return {
            food: new Float32Array(this.food),
            pheromone: new Float32Array(this.pheromone),
        };
    }
}
