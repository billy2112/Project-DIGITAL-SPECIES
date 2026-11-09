import { clamp, sigmoid, tanh } from "./rng.js";
import { Genome, DEFAULT_LAYOUT, weightCount, BrainLayout } from "./genome.js";

const W_IH = 0;
const W_BH = DEFAULT_LAYOUT.inputs * DEFAULT_LAYOUT.hidden;
const W_HO = W_BH + DEFAULT_LAYOUT.hidden;
const W_BO = W_HO + DEFAULT_LAYOUT.hidden * DEFAULT_LAYOUT.outputs;

export class Brain {
  readonly inputs: number;
  readonly hidden: number;
  readonly outputs: number;
  readonly weights: Float32Array;

  constructor(genome: Genome, layout: BrainLayout = DEFAULT_LAYOUT) {
    this.inputs = layout.inputs;
    this.hidden = layout.hidden;
    this.outputs = layout.outputs;
    this.weights = genome.weights;
  }

  private ihOffset = W_IH;
  private bhOffset() {
    return this.inputs * this.hidden;
  }
  private hoOffset() {
    return this.bhOffset() + this.hidden;
  }

  forward(input: Float32Array, out: Float32Array): void {
    const h = new Float32Array(this.hidden);
    const baseW = this.ihOffset;
    const baseB = baseW + this.inputs * this.hidden;
    const baseWo = baseB + this.hidden;

    for (let j = 0; j < this.hidden; j++) {
      let acc = 0;
      for (let i = 0; i < this.inputs; i++) {
        acc += input[i] * this.weights[baseW + j * this.inputs + i];
      }
      h[j] = tanh(acc + this.weights[baseB + j]);
    }

    for (let k = 0; k < this.outputs; k++) {
      let acc = 0;
      for (let j = 0; j < this.hidden; j++) {
        acc += h[j] * this.weights[baseWo + k * this.hidden + j];
      }
      let v = tanh(acc + this.weights[baseWo + this.hidden * this.outputs + k]);
      if (k >= 2) v = sigmoid(v);
      out[k] = v;
    }
  }

  hebbianLearn(
    input: Float32Array,
    output: Float32Array,
    reward: number,
    lr: number,
    decay: number,
  ): void {
    const baseW = this.ihOffset;
    const baseB = baseW + this.inputs * this.hidden;
    const baseWo = baseB + this.hidden;

    const h = new Float32Array(this.hidden);
    for (let j = 0; j < this.hidden; j++) {
      let acc = 0;
      for (let i = 0; i < this.inputs; i++) {
        acc += input[i] * this.weights[baseW + j * this.inputs + i];
      }
      h[j] = tanh(acc + this.weights[baseB + j]);
    }

    const mod = lr * reward;
    for (let j = 0; j < this.hidden; j++) {
      for (let i = 0; i < this.inputs; i++) {
        const idx = baseW + j * this.inputs + i;
        this.weights[idx] += mod * input[i] * h[j];
      }
      this.weights[baseB + j] += mod * h[j];
    }
    for (let k = 0; k < this.outputs; k++) {
      for (let j = 0; j < this.hidden; j++) {
        const idx = baseWo + k * this.hidden + j;
        this.weights[idx] += mod * h[j] * output[k];
      }
      this.weights[baseWo + this.hidden * this.outputs + k] +=
        mod * output[k];
    }

    if (decay > 0) {
      for (let i = 0; i < this.weights.length; i++) {
        this.weights[i] *= 1 - decay * lr;
      }
    }

    for (let i = 0; i < this.weights.length; i++) {
      this.weights[i] = clamp(this.weights[i], -2, 2);
    }
  }

  static weightCount(layout: BrainLayout = DEFAULT_LAYOUT): number {
    return weightCount(layout);
  }
}
