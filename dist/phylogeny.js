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

function organismHash(g) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < g.weights.length; i++) {
    const b = new Float32Array([g.weights[i]]);
    const dv = new DataView(b.buffer);
    h ^= dv.getUint32(0, true);
    h = (h * 16777619) >>> 0;
  }
  return "0x" + h.toString(16).padStart(8, "0");
}

export function buildPhylogeny(sim) {
  const alive = sim.organisms.filter((o) => !o.dead);
  const allOrgs = sim.organisms;
  const nodes = new Map();

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

  const rootNodes = [];
  for (const o of allOrgs) {
    const node = nodes.get(o.id);
    if (o.parentId !== null && nodes.has(o.parentId)) {
      const parent = nodes.get(o.parentId);
      if (!parent.children.includes(o.id)) {
        parent.children.push(o.id);
      }
    } else {
      rootNodes.push(o.id);
    }
  }

  let maxDepth = 0;
  const depthCache = new Map();
  function getDepth(id) {
    if (depthCache.has(id)) return depthCache.get(id);
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

  let totalLineages = 0;
  for (const id of rootNodes) {
    const node = nodes.get(id);
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

export function phylogenyToNewick(sim) {
  const result = buildPhylogeny(sim);
  const nodes = result.nodes;

  function newickNode(id) {
    const node = nodes.get(id);
    if (node.children.length === 0) {
      return `${node.id}:0.0`;
    }
    const children = node.children.map((cid) => newickNode(cid)).join(",");
    return `(${children})${node.id}:0.0`;
  }

  const trees = result.rootNodes.map((rid) => newickNode(rid) + ";");
  return trees.join("");
}

export function phylogenyCsv(sim) {
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
