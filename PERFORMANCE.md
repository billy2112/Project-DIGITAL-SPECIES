# PERFORMANCE.md — Project DIGITAL SPECIES

## Benchmarks

Measured on Node.js (tsx) headless mode, single-threaded.

### Population Scaling

| Organisms | World | Ticks | Ticks/sec | Notes |
|-----------|-------|-------|-----------|-------|
| 100 | 40×40 | 100 | ~250 | Baseline |
| 500 | 60×60 | 100 | ~180 | Spatial grid effective |
| 1,000 | 80×80 | 100 | ~120 | |
| 3,000 | 80×40 | 150 | ~60 | Colony overhead |
| 5,000 | 100×100 | 100 | ~35 | Near spatial grid limit |

### Bottlenecks

1. **Perception:** `world.forNearby()` iterates grid cells within vision range. O(vision²) per organism.
2. **Species counting:** O(n²) genome distance comparisons every `stats()` call. Only called periodically in renderer (every 6 frames).
3. **Colony processing:** Per-colony iteration over members; centripetal force applied each tick.
4. **Food regeneration:** O(world cells) every tick. 100×100 = 10,000 cells/tick.

### Optimizations Implemented

- **Spatial grid:** Fixed-grid partitioning for neighbor queries (GRID_CELL = 3).
- **InstancedMesh:** Organisms grouped by morphotype; one draw call per unique body plan.
- **Buffer reuse:** Bond-line geometry buffer reused; no per-frame reallocation.
- **Accumulator with step cap:** Max 8 sim ticks per render frame prevents lag spirals.
- **Delta clamping:** Max 200ms per frame prevents runaway after tab switch.
- **Typed arrays:** Float32Array/Uint8Array for world fields and genomes.
- **Object pooling:** Minimal per-tick allocation (pre-allocated arrays where possible).

### Rendering Performance

Three.js InstancedMesh with frustum culling. Pixel ratio capped at 1.5 for mobile. Shadow maps at 512×512. Bond lines capped at 2048 segments.

## Memory

- Per organism: ~2KB (genome weights ~1KB, traits, memory, NN weights)
- Per world cell: ~40 bytes (food, nutrients, pheromone, temperature, light)
- 100×100 world: ~400KB for world fields
- 1,000 organisms: ~2MB

## Target Configurations

| Target | Status |
|--------|--------|
| 1,000 organisms | Verified |
| 5,000 organisms | Verified (~35 ticks/sec) |
| 10,000 organisms | Not tested |
| 50,000 organisms | Not tested |
| 100,000+ organisms | Requires Web Workers / GPU |

## Recommendations for Large Populations

1. Use Web Workers to run simulation off main thread.
2. Reduce render frequency relative to sim frequency.
3. Disable bond lines and glow effects for large colonies.
4. Increase GRID_CELL for sparser spatial partitioning.
5. Reduce stats() frequency (species counting is O(n²)).
