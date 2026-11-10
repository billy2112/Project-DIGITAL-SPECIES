import { RNG } from "./rng.js";
export const WORLD_DEFAULTS = {
    width: 100,
    height: 100,
    foodRegenRate: 0.05,
    foodMaxPerCell: 100,
    foodSpawnChance: 0.02,
    pheromoneDecay: 0.02,
    energyRewardPerFood: 1,
    nutrientDecay: 0.01,
    nutrientRegenBoost: 0.5,
    temperatureMin: 15,
    temperatureMax: 30,
    lightCycleLength: 1000,
};
export class World {
    width;
    height;
    food;
    pheromone;
    nutrients;
    temperature;
    light;
    config;
    organismIdCounter = 0;
    dayPhase = 0;
    constructor(config = {}, rng) {
        this.config = { ...WORLD_DEFAULTS, ...config };
        this.width = this.config.width;
        this.height = this.config.height;
        const size = this.width * this.height;
        this.food = new Float32Array(size);
        this.pheromone = new Float32Array(size);
        this.nutrients = new Float32Array(size);
        this.temperature = new Float32Array(size);
        this.light = new Float32Array(size);
        const r = rng ?? new RNG(Date.now());
        for (let i = 0; i < size; i++) {
            this.food[i] = r.random() * this.config.foodMaxPerCell;
            const y = i / this.width;
            this.temperature[i] =
                this.config.temperatureMin +
                    (this.config.temperatureMax - this.config.temperatureMin) *
                        (0.5 + 0.5 * Math.sin((y * Math.PI) / this.height));
            this.light[i] = 0.5;
        }
    }
    idx(x, y) {
        const xi = Math.floor(((x % this.width) + this.width) % this.width);
        const yi = Math.floor(((y % this.height) + this.height) % this.height);
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
    nutrientsAt(x, y) {
        return this.nutrients[this.idx(x, y)];
    }
    decompose(x, y, amount) {
        const i = this.idx(x, y);
        this.nutrients[i] = Math.min(this.config.foodMaxPerCell * 2, this.nutrients[i] + amount);
    }
    absorbNutrients(x, y, amount) {
        const i = this.idx(x, y);
        const available = this.nutrients[i];
        const take = Math.min(available, amount);
        this.nutrients[i] = Math.max(0, available - take);
        return take;
    }
    decayNutrients() {
        const size = this.width * this.height;
        for (let i = 0; i < size; i++) {
            this.nutrients[i] *= 1 - this.config.nutrientDecay;
            if (this.nutrients[i] < 0.001)
                this.nutrients[i] = 0;
        }
    }
    temperatureAt(x, y) {
        return this.temperature[this.idx(x, y)];
    }
    lightAt(x, y) {
        return this.light[this.idx(x, y)];
    }
    updateEnvironment(tick) {
        const phase = (tick % this.config.lightCycleLength) / this.config.lightCycleLength;
        this.dayPhase = phase;
        const lightLevel = 0.5 + 0.5 * Math.sin((phase - 0.25) * 2 * Math.PI);
        const size = this.width * this.height;
        for (let i = 0; i < size; i++) {
            this.light[i] = Math.max(0, Math.min(1, lightLevel));
        }
    }
    regenerateFood(rng) {
        const size = this.width * this.height;
        for (let i = 0; i < size; i++) {
            const nutrientBoost = this.nutrients[i] * this.config.nutrientRegenBoost;
            if (this.food[i] < this.config.foodMaxPerCell) {
                this.food[i] += this.config.foodRegenRate + nutrientBoost;
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
            nutrients: new Float32Array(this.nutrients),
            temperature: new Float32Array(this.temperature),
            light: new Float32Array(this.light),
        };
    }
    // ---- Serialization ----
    serialize() {
        return {
            width: this.width,
            height: this.height,
            config: { ...this.config },
            food: Array.from(this.food),
            pheromone: Array.from(this.pheromone),
            nutrients: Array.from(this.nutrients),
            temperature: Array.from(this.temperature),
            light: Array.from(this.light),
            dayPhase: this.dayPhase,
        };
    }
    static deserialize(data) {
        const world = new World(data.config);
        world.width = data.width;
        world.height = data.height;
        for (let i = 0; i < data.food.length; i++) {
            world.food[i] = data.food[i];
            world.pheromone[i] = data.pheromone[i];
            world.nutrients[i] = data.nutrients[i];
            world.temperature[i] = data.temperature[i];
            world.light[i] = data.light[i];
        }
        world.dayPhase = data.dayPhase;
        return world;
    }
}
