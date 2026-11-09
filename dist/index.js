#!/usr/bin/env node
import { runCLI } from "./cli.js";
const args = process.argv.slice(2);
const opts = {};
for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith("--")) {
        const eq = a.indexOf("=");
        if (eq > 0) {
            opts[a.slice(2, eq)] = a.slice(eq + 1);
        }
        else {
            opts[a.slice(2)] = args[i + 1] ?? "true";
            i++;
        }
    }
}
const seed = parseInt(opts.seed ?? String(Date.now()), 10);
const ticks = parseInt(opts.ticks ?? "1000", 10);
const width = parseInt(opts.width ?? "60", 10);
const height = parseInt(opts.height ?? "30", 10);
const population = parseInt(opts.population ?? "300", 10);
const live = opts.live !== "false";
runCLI(seed, ticks, width, height, population, live);
