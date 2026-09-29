import type MarkdownItConstructor from 'markdown-it';
type MarkdownIt = InstanceType<typeof MarkdownItConstructor>;
import { markdownPlugin } from './markdown';
import { createRenderer, createRuntime } from './renderer';

export interface Preview {
  extendMarkdownIt(md: MarkdownIt): MarkdownIt;
  /** Forget every cached outcome; call when the depiction budget changes. */
  clear(): void;
  dispose(): void;
}

export interface PreviewOptions {
  /** Depiction budget in milliseconds, read before every render. Default: 3000. */
  timeout?: () => number;
}

/**
 * Assemble the preview: the OpenChemLib worker, the cache, and the fence plugin. Kept free of
 * `vscode` so it can be exercised end to end in tests.
 *
 * `log` receives what never reaches the preview (ADR 0002): attribute diagnostics.
 */
export async function createPreview(
  distDirectory: string,
  log: (line: string) => void,
  options: PreviewOptions = {}
): Promise<Preview> {
  const runtime = await createRuntime(distDirectory, options.timeout ? { timeout: options.timeout } : {});
  const render = createRenderer(runtime);
  return {
    extendMarkdownIt: (md) => markdownPlugin(md, render, log),
    clear: () => render.clear(),
    dispose: () => runtime.dispose()
  };
}
