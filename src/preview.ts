import type MarkdownItConstructor from 'markdown-it';
type MarkdownIt = InstanceType<typeof MarkdownItConstructor>;
import type { RenderInput, RenderResult, Runtime } from '@reonarudo/smiles-renderer';
import { createHash } from 'node:crypto';
import { markdownPlugin, type Render } from './markdown';

const maxEntries = 96;

export interface Preview {
  extendMarkdownIt(md: MarkdownIt): MarkdownIt;
  /** Forget every cached outcome; call once a runtime with a new budget has taken over. */
  clear(): void;
}

/**
 * Assemble the preview: the library runtime behind a cache, and the fence plugin. Kept free of
 * `vscode` so it can be exercised end to end in tests.
 *
 * `log` receives what never reaches the preview (ADR 0002): attribute diagnostics, and the
 * library's notes — once per fresh render, labelled with the string they are about.
 */
export function createPreview(runtime: Pick<Runtime, 'render'>, log: (line: string) => void): Preview {
  const render = createRenderer(runtime, ({ source }, result) => {
    if (result.status !== 'success') return;
    for (const note of result.notes) log(`${source}: ${note}`);
  });
  return {
    extendMarkdownIt: (md) => markdownPlugin(md, render, log),
    clear: () => render.clear()
  };
}

export interface Renderer extends Render {
  /** Forget every outcome, so that cached timeouts are retried under a new budget. */
  clear(): void;
}

/**
 * Put a cache in front of the runtime, so re-rendering an unchanged fence on every keystroke costs
 * a lookup rather than a depiction. The library does not cache (ADR 0003).
 *
 * Outcomes are cached, timeouts included: a molecule too large to lay out is not retried until
 * its SMILES changes or the cache is cleared. An unavailable runtime says nothing about the SMILES,
 * so it is not cached. `onFresh` hears every real render — never a cache hit.
 */
export function createRenderer(
  runtime: Pick<Runtime, 'render'>,
  onFresh: (input: RenderInput, result: RenderResult) => void = () => {}
): Renderer {
  const cache = new Map<string, RenderResult>();
  const render = (input: RenderInput): RenderResult => {
    // The same string can mean different things in the two notations, so both are in the key.
    const key = createHash('sha256').update(`${input.notation}\0${input.source}`).digest('hex');
    let result = cache.get(key);
    if (result) {
      // Re-insert so Map order tracks recency and the first key is the least recently used.
      cache.delete(key);
    } else {
      result = runtime.render(input);
      onFresh(input, result);
      if (result.status === 'unavailable') return result;
    }
    cache.set(key, result);
    if (cache.size > maxEntries) cache.delete(cache.keys().next().value!);
    return result;
  };
  return Object.assign(render, { clear: () => cache.clear() });
}
