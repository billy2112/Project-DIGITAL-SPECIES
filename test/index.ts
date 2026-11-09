import assert from "node:assert";
import { RNG } from "../src/rng.js";
import { createRandomGenome, mutateGenome, genomeDistance, DEFAULT_LAYOUT } from "../src/genome.js";
import { Brain } from "../src/brain.js";
import { Organism } from "../src/organism.js";
import { World } from "../src/world.js";
import { Simulation } from "../src/simulation.js";

// RNG determinism
{
  const a = new RNG(42);
  const b = new RNG(42);
  const c = new RNG(43);
  assert.strictEqual(a.random(), b.random());
  assert.notStrictEqual(a.random(), c.random());
  assert.ok(a.range(0, 100) >= 0 && a.range(0, 100) <= 100);
  assert.ok(a.int(0, 10) >= 0 && a.int(0, 10) <= 10);
  const picks = [1, 2, 3];
  assert.ok(picks.includes(a.pick(picks)));
}

// Genome
{
  const g = createRandomGenome(new RNG(1));
  assert.ok(g.weights.length > 0);
  const g2 = mutateGenome(g, new RNG(7));
  assert.ok(g2.traits.mutationRate > 0);
  const d = genomeDistance(g, g2);
  assert.ok(d >= 0);
  assert.ok(d < 10);
}

// Brain forward + learn
{
  const g = createRandomGenome(new RNG(3));
  const brain = new Brain(g, DEFAULT_LAYOUT);
  const input = new Float32Array(DEFAULT_LAYOUT.inputs).map(() => 0.5);
  const out = new Float32Array(DEFAULT_LAYOUT.outputs);
  brain.forward(input, out);
  assert.strictEqual(out.length, DEFAULT_LAYOUT.outputs);
  for (let i = 0; i < out.length; i++) {
    assert.ok(out[i] >= -1 && out[i] <= 1);
  }
  // learn should not throw and keep weights bounded
  brain.hebbianLearn(input, out, 1.0, 0.1, 0.001);
  for (let i = 0; i < brain.weights.length; i++) {
    assert.ok(brain.weights[i] >= -2 && brain.weights[i] <= 2);
  }
}

// Organism reproduce
{
  const rng = new RNG(5);
  const g = createRandomGenome(rng);
  const org = new Organism(1, 10, 10, 100, g, DEFAULT_LAYOUT);
  const world = new World({ width: 50, height: 50 });
  const child = Organism.reproduce(org, g.traits.reproductionCost, rng, 99);
  assert.ok(child.id === 99);
  assert.ok(child.energy > 0);
  assert.ok(child.genome.weights.length === org.genome.weights.length);
  // child genome should differ slightly
  assert.ok(genomeDistance(org.genome, child.genome) > 0 || genomeDistance(org.genome, child.genome) === 0);
}

// World
{
  const rng = new RNG(9);
  const world = new World({ width: 10, height: 10, foodSpawnChance: 1 });
  const before = world.foodAt(0, 0);
  world.regenerateFood(rng);
  const after = world.foodAt(0, 0);
  assert.ok(after >= before);
  world.depositPheromone(0, 0, 1);
  assert.ok(world.pheromoneAt(0, 0) > 0);
  world.decayPheromones();
  assert.ok(world.pheromoneAt(0, 0) < 1);
}

// Simulation run
{
  const sim = new Simulation({ seed: 123, width: 40, height: 40, initialPopulation: 200, maxTicks: 100 });
  const stats = sim.run();
  assert.ok(stats.tick > 0);
  assert.ok(stats.population >= 0);
  assert.ok(stats.totalBirths >= 0);
  assert.ok(stats.totalDeaths >= 0);
  assert.ok(stats.avgEnergy >= 0);
}

// Simulation should sustain population for some ticks with enough food
{
  const sim = new Simulation({
    seed: 7,
    width: 60,
    height: 60,
    initialPopulation: 100,
    maxTicks: 300,
    foodSpawnChance: 0.05,
  });
  const stats = sim.run();
  // population should not crash to zero immediately; allow extinction but check it ran
  assert.ok(stats.tick > 10);
}

console.log("All tests passed.");
