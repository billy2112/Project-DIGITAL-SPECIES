import { genomeDistance } from "./genome.js";
import { mean, stdDev } from "./data-export.js";
export class NoveltyDetector {
    constructor(maxHistory = 100) {
        this.maxHistory = maxHistory;
        this.history = [];
        this.detectedEvents = [];
        this.baselineTraits = new Map();
        this.seenBodyPlans = new Set();
        this.seenStrategies = new Set();
    }
    record(sim) {
        const alive = sim.organisms.filter((o) => !o.dead);
        const snapshot = {
            tick: sim.currentTick,
            organisms: alive.map((o) => ({
                id: o.id,
                parentId: o.parentId,
                generation: o.generation,
                energy: o.energy,
                x: o.x,
                y: o.y,
                colonyId: o.colonyId,
                role: o.role,
                genome: {
                    weights: Array.from(o.genome.weights),
                    traits: { ...o.genome.traits },
                    dna: Array.from(o.genome.dna),
                },
            })),
            world: {
                avgFood: 0,
                avgPheromone: 0,
                totalFood: 0,
            },
        };
        const snap = sim.getState().snapshot;
        const W = sim.world.width;
        let totalFood = 0, totalPheromone = 0;
        for (let i = 0; i < snap.food.length; i++) {
            totalFood += snap.food[i];
            totalPheromone += snap.pheromone[i];
        }
        snapshot.world.avgFood = totalFood / snap.food.length;
        snapshot.world.avgPheromone = totalPheromone / snap.pheromone.length;
        snapshot.world.totalFood = totalFood;
        this.history.push(snapshot);
        if (this.history.length > this.maxHistory)
            this.history.shift();
    }
    detect(sim) {
        const alive = sim.organisms.filter((o) => !o.dead);
        const events = [];
        for (const o of alive) {
            const bp = this.dnaToBodyPlan(o.genome.dna);
            if (!this.seenBodyPlans.has(bp)) {
                this.seenBodyPlans.add(bp);
                events.push({
                    eventType: "morphology",
                    tick: sim.currentTick,
                    organismId: o.id,
                    lineageId: o.parentId !== null ? o.parentId : o.id,
                    description: "New body plan detected: " + bp,
                    severity: "high",
                    evidence: { bodyPlan: 1, dnaNovelty: 1 },
                    geneticChanges: ["dna_region_change"],
                    environmentalConditions: { food: sim.getState().snapshot.totalFood, tick: sim.currentTick },
                });
            }
        }
        const colonies = sim.getState().colonies.filter((c) => !c.dead);
        if (colonies.length > 0 && this.history.length > 10) {
            const prevColonies = this.history[this.history.length - 1] &&
                this.history[this.history.length - 1].organisms.filter((o) => o.colonyId !== null).length || 0;
            const currColonies = alive.filter((o) => o.colonyId !== null).length;
            if (currColonies > prevColonies * 1.5 && currColonies > 5) {
                events.push({
                    eventType: "cooperation",
                    tick: sim.currentTick,
                    organismId: -1,
                    lineageId: -1,
                    description: "Cooperation surge: " + currColonies + " organisms in colonies (was " + prevColonies + ")",
                    severity: "high",
                    evidence: { colonyMembers: currColonies, colonyCount: colonies.length },
                    geneticChanges: ["adhesion_trait_shift"],
                    environmentalConditions: { food: sim.getState().snapshot.totalFood, tick: sim.currentTick },
                });
            }
        }
        if (this.history.length > 20) {
            const prevAvgEnergy = this.history[this.history.length - 10] &&
                this.history[this.history.length - 10].organisms.reduce((s, o) => s + o.energy, 0) / this.history[this.history.length - 10].organisms.length || 0;
            const currAvgEnergy = alive.reduce((s, o) => s + o.energy, 0) / alive.length;
            const energyChange = (currAvgEnergy - prevAvgEnergy) / Math.max(prevAvgEnergy, 0.1);
            if (Math.abs(energyChange) > 0.5) {
                events.push({
                    eventType: "feeding",
                    tick: sim.currentTick,
                    organismId: -1,
                    lineageId: -1,
                    description: "Feeding strategy shift: avg energy changed " + (energyChange * 100).toFixed(1) + "%",
                    severity: energyChange > 0 ? "medium" : "high",
                    evidence: { energyChange, avgEnergy: currAvgEnergy },
                    geneticChanges: ["consumption_trait_change"],
                    environmentalConditions: { food: sim.getState().snapshot.totalFood, tick: sim.currentTick },
                });
            }
        }
        const sexualRatio = alive.filter((o) => o.generation > 1).length / alive.length;
        if (!this.seenStrategies.has("sexual")) {
            if (sexualRatio > 0.3) {
                this.seenStrategies.add("sexual");
                events.push({
                    eventType: "reproduction",
                    tick: sim.currentTick,
                    organismId: -1,
                    lineageId: -1,
                    description: "Sexual reproduction detected in population",
                    severity: "medium",
                    evidence: { sexualRatio },
                    geneticChanges: ["crossover_trait_emergence"],
                    environmentalConditions: { tick: sim.currentTick },
                });
            }
        }
        const THRESHOLD = 0.55;
        const visited = new Set();
        let speciesCount = 0;
        for (const o of alive) {
            if (visited.has(o.id))
                continue;
            speciesCount++;
            const stack = [o.id];
            visited.add(o.id);
            while (stack.length) {
                const cur = stack.pop();
                const curOrg = sim.organisms.find((x) => x.id === cur);
                if (!curOrg)
                    continue;
                for (const other of alive) {
                    if (visited.has(other.id))
                        continue;
                    if (genomeDistance(curOrg.genome, other.genome) < THRESHOLD) {
                        visited.add(other.id);
                        stack.push(other.id);
                    }
                }
            }
        }
        if (speciesCount > 3 && this.history.length > 50) {
            const prevSnapshot = this.history[Math.floor(this.history.length / 2)];
            if (prevSnapshot) {
                const prevAlive = prevSnapshot.organisms;
                let prevSpecies = 0;
                const prevVisited = new Set();
                for (const o of prevAlive) {
                    if (prevVisited.has(o.id))
                        continue;
                    prevSpecies++;
                    const stack = [o.id];
                    prevVisited.add(o.id);
                    while (stack.length) {
                        const cur = stack.pop();
                        for (const other of prevAlive) {
                            if (prevVisited.has(other.id))
                                continue;
                            prevVisited.add(other.id);
                            stack.push(other.id);
                        }
                    }
                }
                if (speciesCount > prevSpecies * 1.5) {
                    events.push({
                        eventType: "species_split",
                        tick: sim.currentTick,
                        organismId: -1,
                        lineageId: -1,
                        description: "Species radiation: " + speciesCount + " species detected (was ~" + prevSpecies + ")",
                        severity: "high",
                        evidence: { speciesCount, prevSpecies },
                        geneticChanges: ["genome_divergence"],
                        environmentalConditions: { tick: sim.currentTick },
                    });
                }
            }
        }
        this.detectedEvents.push(...events);
        return this.computeResult(sim, events);
    }
    dnaToBodyPlan(dna) {
        const bpIdx = Math.floor(dna[0] / 64) % 5;
        const plans = ["blob", "segmented", "star", "spiral", "rays"];
        return plans[bpIdx];
    }
    computeResult(sim, newEvents) {
        const alive = sim.organisms.filter((o) => !o.dead);
        let novelCount = 0;
        for (const o of alive) {
            const traits = o.genome.traits;
            let isNovel = false;
            for (const [key, val] of Object.entries(traits)) {
                const hist = this.baselineTraits.get(key);
                if (hist && hist.length > 5) {
                    const m = mean(hist);
                    const s = stdDev(hist);
                    if (s > 0 && Math.abs(val - m) > 2 * s)
                        isNovel = true;
                }
            }
            if (isNovel)
                novelCount++;
        }
        const noveltyScore = alive.length > 0 ? novelCount / alive.length : 0;
        for (const o of alive) {
            const t = o.genome.traits;
            for (const [key, val] of Object.entries(t)) {
                if (!this.baselineTraits.has(key))
                    this.baselineTraits.set(key, []);
                this.baselineTraits.get(key).push(val);
                if (this.baselineTraits.get(key).length > 50)
                    this.baselineTraits.get(key).shift();
            }
        }
        const newBehaviors = newEvents.map((e) => e.description);
        const recommendations = this.generateRecommendations(newEvents);
        return {
            events: this.detectedEvents,
            noveltyScore,
            newBehaviors,
            recommendations,
        };
    }
    generateRecommendations(events) {
        const recs = [];
        const types = new Set(events.map((e) => e.eventType));
        if (types.has("morphology"))
            recs.push("Investigate morphological innovation: export DNA of novel body plans for comparative analysis");
        if (types.has("cooperation"))
            recs.push("Analyze cooperation: measure altruism vs cheating in colony lineages");
        if (types.has("feeding"))
            recs.push("Track feeding strategy: correlate energy shifts with environmental resource changes");
        if (types.has("species_split"))
            recs.push("Document speciation: extract phylogenetic tree for divergent lineages");
        if (types.has("reproduction"))
            recs.push("Study reproductive evolution: compare sexual vs asexual lineage fitness");
        if (recs.length === 0)
            recs.push("Population stable: continue monitoring for emergent behaviors");
        return recs;
    }
    getEvents() {
        return this.detectedEvents;
    }
    exportEventsCsv() {
        let out = "tick,event_type,organism_id,lineage_id,description,severity,genetic_changes\n";
        for (const e of this.detectedEvents) {
            out += [e.tick, e.eventType, e.organismId, e.lineageId, '"' + e.description + '"', e.severity, e.geneticChanges.join(";")].join(",") + "\n";
        }
        return out;
    }
    downloadEventsCsv() {
        const blob = new Blob([this.exportEventsCsv()], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "novelty_events_t" + (this.history[this.history.length - 1] ? this.history[this.history.length - 1].tick : 0) + ".csv";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}
