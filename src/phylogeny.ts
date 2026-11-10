import { Organism } from "./organism.js";
import { Simulation } from "./simulation.js";
import { genomeDistance } from "./genome.js";

export interface PhyloNode {
  id: number;
  parentId: number | null;
  generation: number;
  children: number[];
  energy: number;
  age: number;
  dead: boolean;
  genomeHash: string;
  traits: Record<string, any>;
  x: number;
  y: number;
}

export interface PhylogenyResult {
  rootNodes: number[];
  nodes: Map<number, PhyloNode>;
  totalOrganisms: number;
  totalLineages: number;
  maxDepth: number;
}

function organismHash(g: any): string {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < g.weights.length; i++) {
    const b = new Float32Array([g.weights[i]]);
    const dv = new DataView(b.buffer);
    h ^= dv.getUint32(0, true);
    h = (h * 16777619) >>> 0;
  }
  return "0x" + h.toString(16).padStart(8, "0");
}

/** Build a phylogenetic forest from the current organism population.
 * Each organism is a node; parentId links to its parent (asexual) or
 * one parent (sexual). Root nodes are organisms with no parent in the
 * current population (either seeded founders or parents that died). */
export function buildPhylogeny(sim: Simulation): PhylogenyResult {
  const alive = sim.organisms.filter((o) => !o.dead);
  const allOrgs = sim.organisms;
  const nodes = new Map<number, PhyloNode>();

  // Create nodes for all organisms (alive + dead, for complete lineage)
  for (const o of allOrgs) {
    const g = o.genome;
    nodes.set(o.id, {
      id: o.id,
      parentId: o.parentId,
      generation: o.generation,
      children: [],
      energy: o.energy,
      age: o.age,
      dead: o.dead,
      genomeHash: organismHash(g),
      traits: {
        size: g.traits.size,
        strength: g.traits.strength,
        aggression: g.traits.aggression,
        altruism: g.traits.altruism,
        cooperation: g.traits.cooperation,
        mutationRate: g.traits.evolvableMutationRate,
      },
      x: o.x,
      y: o.y,
    });
  }

  // Link children to parents
  const rootNodes: number[] = [];
  for (const o of allOrgs) {
    const node = nodes.get(o.id)!;
    if (o.parentId !== null && nodes.has(o.parentId)) {
      const parent = nodes.get(o.parentId)!;
      if (!parent.children.includes(o.id)) {
        parent.children.push(o.id);
      }
    } else {
      rootNodes.push(o.id);
    }
  }

  // Compute max depth
  let maxDepth = 0;
  const depthCache = new Map<number, number>();
  function getDepth(id: number): number {
    if (depthCache.has(id)) return depthCache.get(id)!;
    const node = nodes.get(id);
    if (!node || !node.parentId || !nodes.has(node.parentId)) {
      depthCache.set(id, 0);
      return 0;
    }
    const d = 1 + getDepth(node.parentId);
    depthCache.set(id, d);
    return d;
  }
  for (const id of nodes.keys()) {
    maxDepth = Math.max(maxDepth, getDepth(id));
  }

  // Count distinct lineages (root nodes that have descendants)
  let totalLineages = 0;
  for (const id of rootNodes) {
    const node = nodes.get(id)!;
    if (node.children.length > 0 || !node.dead) totalLineages++;
  }

  return {
    rootNodes,
    nodes,
    totalOrganisms: allOrgs.length,
    totalLineages,
    maxDepth,
  };
}

/** Export phylogeny as Newick format (standard for phylogenetics) */
export function phylogenyToNewick(sim: Simulation): string {
  const result = buildPhylogeny(sim);
  const nodes = result.nodes;

  function newickNode(id: number): string {
    const node = nodes.get(id)!;
    if (node.children.length === 0) {
      // Leaf
      return `${node.id}:0.0`;
    }
    const children = node.children
      .map((cid) => newickNode(cid))
      .join(",");
    return `(${children})${node.id}:0.0`;
  }

  const trees = result.rootNodes.map((rid) => newickNode(rid) + ";");
  return trees.join("");
}

/** Export phylogeny as adjacency list CSV (id,parent_id,generation,energy,dead) */
export function phylogenyCsv(sim: Simulation): string {
  const result = buildPhylogeny(sim);
  let out = "id,parent_id,generation,energy,age,dead,genome_hash,size,strength,aggression,altruism,cooperation,mutation_rate,x,y\n";
  for (const [id, node] of result.nodes) {
    out += [
      id,
      node.parentId ?? "",
      node.generation,
      node.energy.toFixed(2),
      node.age,
      node.dead ? 1 : 0,
      node.genomeHash,
      node.traits.size.toFixed(4),
      node.traits.strength.toFixed(4),
      node.traits.aggression.toFixed(4),
      node.traits.altruism.toFixed(4),
      node.traits.cooperation.toFixed(4),
      node.traits.mutationRate.toFixed(6),
      node.x.toFixed(2),
      node.y.toFixed(2),
    ].join(",") + "\n";
  }
  return out;
}

export function downloadPhylogenyCsv(sim: Simulation): void {
  const blob = new Blob([phylogenyCsv(sim)], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `phylogeny_t${sim.currentTick}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadPhylogenyNewick(sim: Simulation): void {
  const blob = new Blob([phylogenyToNewick(sim)], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `phylogeny_t${sim.currentTick}.nwk`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
