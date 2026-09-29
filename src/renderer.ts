import { Worker } from 'node:worker_threads';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

const capacity = 4_000_000;
const maxSource = 4_000;
const maxEntries = 96;

/** The line notation a fence is written in: `smiles` describes a molecule, `smarts` a pattern. */
export type Notation = 'smiles' | 'smarts';

/** What the host posts to the worker for one depiction. */
export interface Request {
  notation: Notation;
  source: string;
}

/** The id OpenChemLib writes on the root `<svg>` and into its `<style>`; replaced per occurrence. */
export const SVG_ID = 'ocl';

/** What depicting one SMILES string produced, as decoded from the worker. */
export type RenderResult =
  | { status: 'success'; output: string }
  | { status: 'failure'; message: string }
  | { status: 'timeout'; budget: number }
  | { status: 'unavailable'; reason: string };

export interface Runtime {
  render(source: string, notation?: Notation): RenderResult;
  dispose(): void;
}

export interface RuntimeOptions {
  /** Per-structure depiction budget in milliseconds, or a function read before every render. */
  timeout?: number | (() => number);
  /** How long a fresh worker may take to load the library before it is given up on. */
  startup?: number;
}

/**
 * Run OpenChemLib in a worker thread that the synchronous markdown-it fence rule can block on.
 *
 * Coordinate generation is superlinear in the number of atoms, so a long enough SMILES string can
 * take tens of seconds. A render that overruns its budget terminates the worker — the only way to
 * stop it mid-flight — and the next render spawns a fresh one, so one pathological molecule costs
 * only its own fence. `directory` is the extension's `dist/`, which holds `worker.js`.
 */
export async function createRuntime(directory: string, options: RuntimeOptions = {}): Promise<Runtime> {
  const { timeout = 3000, startup = 10000 } = options;
  const budgetFor = typeof timeout === 'function' ? timeout : () => timeout;
  let worker: Worker | undefined;
  let state: Int32Array;
  let bytes: Uint8Array;

  const spawn = (): Worker => {
    // Each worker gets its own buffer: a terminated worker still finishing a depiction must not
    // be able to write its late answer where its replacement's answer is expected.
    const buffer = new SharedArrayBuffer(capacity + 12);
    state = new Int32Array(buffer, 0, 3);
    bytes = new Uint8Array(buffer, 12);
    worker = new Worker(join(directory, 'worker.js'), {
      workerData: { buffer },
      env: {},
      resourceLimits: { maxOldGenerationSizeMb: 256 }
    });
    // A crash surfaces to the waiting render as a timeout; this only keeps it from being fatal.
    worker.on('error', () => {});
    return worker;
  };
  const stop = (): void => {
    void worker?.terminate();
    worker = undefined;
  };

  // Warm the first worker so the first fence does not pay for loading the library. A failure
  // here is not fatal: the next render tries again with a fresh worker.
  const first = spawn();
  await new Promise<void>((resolve) => {
    const timer = setTimeout(done, startup);
    function done(): void {
      clearTimeout(timer);
      first.off('message', done);
      first.off('error', done);
      resolve();
    }
    first.on('message', done);
    first.on('error', done);
  });

  return {
    render(source, notation = 'smiles') {
      if (source.length > maxSource) {
        return { status: 'failure', message: `${notation.toUpperCase()} exceeds the 4 KB limit.` };
      }
      const current = worker ?? spawn();
      // Loading the library is waited for separately, so the depiction budget is the same for a
      // fresh worker as for a warm one and a timeout never becomes a 10 s stall.
      if (Atomics.load(state, 2) !== 1 && Atomics.wait(state, 2, 0, startup) === 'timed-out') {
        stop();
        return { status: 'unavailable', reason: `the depiction worker did not start within ${startup / 1000} s` };
      }
      const budget = budgetFor();
      Atomics.store(state, 0, 0);
      current.postMessage({ notation, source } satisfies Request);
      if (Atomics.wait(state, 0, 0, budget) === 'timed-out') {
        stop();
        return { status: 'timeout', budget };
      }
      const result = JSON.parse(new TextDecoder().decode(bytes.slice(0, Atomics.load(state, 1)))) as RenderResult;
      if (result.status === 'unavailable') stop();
      return result;
    },
    dispose: stop
  };
}

/**
 * Put a cache in front of the runtime, so re-rendering an unchanged fence on every keystroke costs
 * a lookup rather than a depiction.
 *
 * Outcomes are cached, timeouts included: a molecule too large to lay out is not retried until
 * its SMILES changes or the cache is cleared. An unavailable runtime says nothing about the SMILES,
 * so it is not cached.
 */
export interface Renderer {
  (source: string, notation?: Notation): RenderResult;
  /** Forget every outcome, so that cached timeouts are retried under a new budget. */
  clear(): void;
}

export function createRenderer(runtime: Pick<Runtime, 'render'>): Renderer {
  const cache = new Map<string, RenderResult>();
  const render = (source: string, notation: Notation = 'smiles'): RenderResult => {
    // The same string can mean different things in the two notations, so both are in the key.
    const key = createHash('sha256').update(`${notation}\0${source}`).digest('hex');
    let result = cache.get(key);
    if (result) {
      // Re-insert so Map order tracks recency and the first key is the least recently used.
      cache.delete(key);
    } else {
      result = runtime.render(source, notation);
      if (result.status === 'unavailable') return result;
    }
    cache.set(key, result);
    if (cache.size > maxEntries) cache.delete(cache.keys().next().value!);
    return result;
  };
  return Object.assign(render, { clear: () => cache.clear() });
}
