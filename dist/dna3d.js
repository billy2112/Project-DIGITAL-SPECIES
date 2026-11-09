function hslToRgb(h, s, l) {
    h = ((h % 360) + 360) % 360;
    s = clamp01(s / 100);
    l = clamp01(l / 100);
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    let r = 0, g = 0, b = 0;
    if (h < 60)
        [r, g, b] = [c, x, 0];
    else if (h < 120)
        [r, g, b] = [x, c, 0];
    else if (h < 180)
        [r, g, b] = [0, c, x];
    else if (h < 240)
        [r, g, b] = [0, x, c];
    else if (h < 300)
        [r, g, b] = [x, 0, c];
    else
        [r, g, b] = [c, 0, x];
    return [r + m, g + m, b + m];
}
function clamp01(v) {
    return Math.min(1, Math.max(0, v));
}
export function morphotypeKey(m) {
    return [
        m.bodyPlan,
        m.segmentCount,
        m.limbPairs,
        Math.round(m.thickness * 100),
        Math.round(m.curvature * 100),
        m.colorHue,
        Math.round(m.colorSat),
        Math.round(m.colorLum),
        m.glowHue,
        Math.round(m.glowIntensity * 100),
        Math.round(m.scale * 100),
    ].join("|");
}
export function generateModel(m, energy, size) {
    const parts = [];
    const baseScale = morphoScale(m, size);
    const [bc, bs, bl] = hslToRgb(m.colorHue, m.colorSat, m.colorLum);
    const [gc, gs, gb] = hslToRgb(m.glowHue, 80, 60);
    const glow = m.glowIntensity;
    const push = (kind, pos, rot, sc, color = [bc, bs, bl], emissive = [0, 0, 0], ei = 0) => {
        parts.push({ kind, position: pos, rotation: rot, scale: sc, color, emissive, emissiveIntensity: ei });
    };
    const bodyR = 0.5 * baseScale * m.thickness;
    const bodyH = 0.6 * baseScale;
    switch (m.bodyPlan) {
        case "blob": {
            const n = m.segmentCount;
            for (let i = 0; i < n; i++) {
                const a = (i / Math.max(1, n - 1)) * Math.PI;
                const r = bodyR * (0.6 + 0.4 * Math.sin(a));
                const off = Math.sin(a * 2) * m.curvature * 0.3 * baseScale;
                push("sphere", [off, 0, i * bodyH * 0.5 - ((n - 1) * bodyH * 0.5) * 0.5], [0, 0, 0], [r * 1.2, r * 1.2, r * 1.2]);
            }
            break;
        }
        case "segmented": {
            const n = m.segmentCount;
            for (let i = 0; i < n; i++) {
                const phase = i * 0.7;
                push("cylinder", [Math.sin(phase) * m.curvature * 0.2 * baseScale, 0, i * bodyH - ((n - 1) * bodyH) * 0.5], [Math.PI / 2, 0, 0], [bodyR * 0.9, bodyH * 0.55, bodyR * 0.9]);
                if (i < n - 1) {
                    push("sphere", [Math.sin(phase + 0.35) * m.curvature * 0.2 * baseScale, 0, i * bodyH + bodyH * 0.27 - ((n - 1) * bodyH) * 0.5], [0, 0, 0], [bodyR * 1.05, bodyR * 1.05, bodyR * 1.05]);
                }
            }
            break;
        }
        case "star": {
            push("sphere", [0, 0, 0], [0, 0, 0], [bodyR * 1.1, bodyR * 1.1, bodyR * 1.1]);
            const pairs = Math.max(1, m.limbPairs);
            for (let i = 0; i < pairs; i++) {
                const a = (i / pairs) * Math.PI * 2;
                const len = bodyH * (0.8 + 0.4 * Math.sin(i));
                push("cylinder", [Math.cos(a) * (bodyR + len * 0.5), 0, Math.sin(a) * (bodyR + len * 0.5)], [Math.PI / 2, 0, a], [bodyR * 0.45, len * 0.5, bodyR * 0.45]);
                push("sphere", [Math.cos(a) * (bodyR + len * 0.95), 0, Math.sin(a) * (bodyR + len * 0.95)], [0, 0, 0], [bodyR * 0.5, bodyR * 0.5, bodyR * 0.5]);
            }
            break;
        }
        case "spiral": {
            const n = m.segmentCount;
            const turns = 2 + m.curvature;
            for (let i = 0; i < n; i++) {
                const t = (i / Math.max(1, n - 1)) * turns * Math.PI * 2;
                const rad = (i / Math.max(1, n - 1)) * bodyR * 1.5;
                push("sphere", [Math.cos(t) * rad, Math.sin(t) * rad * 0.6, i * bodyH * 0.35 - ((n - 1) * bodyH * 0.35) * 0.5], [0, t * 0.5, 0], [bodyR * 0.6, bodyR * 0.6, bodyR * 0.6]);
            }
            break;
        }
        case "rays": {
            push("sphere", [0, 0, 0], [0, 0, 0], [bodyR * 0.9, bodyR * 0.9, bodyR * 0.9]);
            const rays = Math.max(3, m.limbPairs * 2);
            for (let i = 0; i < rays; i++) {
                const a = (i / rays) * Math.PI * 2;
                const len = bodyH * (0.5 + Math.sin(i) * 0.5);
                push("cylinder", [Math.cos(a) * (bodyR + len * 0.5), len * 0.3, Math.sin(a) * (bodyR + len * 0.5)], [Math.PI / 2 - 0.3, 0, a], [bodyR * 0.3, len * 0.5, bodyR * 0.3]);
            }
            break;
        }
    }
    // Apply bioluminescence / glow to some parts
    if (glow > 0.05) {
        for (const p of parts) {
            if (Math.random() < glow * 0.6) {
                p.emissive = [gc, gs, gb];
                p.emissiveIntensity = glow;
            }
        }
    }
    // Energy influences size/brightness
    const e = clamp01(energy / 120);
    for (const p of parts) {
        p.scale = p.scale.map((v) => v * (0.7 + 0.6 * e));
        p.color = p.color.map((c) => c * (0.6 + 0.4 * e));
        p.emissiveIntensity *= 0.4 + 0.6 * e;
    }
    return parts;
}
function morphoScale(m, size) {
    return m.scale * (0.6 + size * 0.8);
}
