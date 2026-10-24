import type { ExtensionContext } from 'vscode';
import type MarkdownItConstructor from 'markdown-it';
type MarkdownIt = InstanceType<typeof MarkdownItConstructor>;
import { window, workspace } from 'vscode';
import { createPreview, type Preview } from './preview';
import { createRestartable, type Restartable } from './runtimes';

let runtime: Restartable | undefined;

export async function activate(context: ExtensionContext): Promise<{ extendMarkdownIt(md: MarkdownIt): MarkdownIt }> {
  // Unrecognised fence attributes never surface in the preview (ADR 0002); they are reported here
  // so an author who suspects a typo has somewhere to look.
  const channel = window.createOutputChannel('SMILES Structure Preview');
  context.subscriptions.push(channel);
  const log = (line: string) => channel.appendLine(line);

  let preview: Preview;
  try {
    // Required here, not imported, so that a library that fails to load lands in this `try`
    // instead of failing activation. esbuild leaves it external (ADR 0010).
    const library: typeof import('@reonarudo/smiles-renderer') = require('@reonarudo/smiles-renderer');
    const started = await createRestartable(library, { timeout: depictionTimeout() });
    runtime = started;
    preview = createPreview(started, log);
    context.subscriptions.push(workspace.onDidChangeConfiguration((change) => {
      if (!change.affectsConfiguration('smiles.depictionTimeout')) return;
      // The old runtime renders until the new one is ready; then cached timeouts, measured
      // against the old budget, are forgotten.
      started.restart({ timeout: depictionTimeout() }).then(
        (tookOver) => { if (tookOver) preview.clear(); },
        (error) => log(`SMILES renderer failed to restart: ${describe(error)}`)
      );
    }));
  } catch (error) {
    log(`SMILES renderer failed to load: ${describe(error)}`);
    preview = createPreview({
      render: () => ({ status: 'unavailable', reason: 'the renderer failed to load; see the "SMILES Structure Preview" output' })
    }, log);
  }
  return { extendMarkdownIt: (md) => preview.extendMarkdownIt(md) };
}

export async function deactivate(): Promise<void> {
  await runtime?.dispose();
  runtime = undefined;
}

/** The configured budget in milliseconds, clamped to the range the setting declares. */
function depictionTimeout(): number {
  const seconds = workspace.getConfiguration('smiles').get<number>('depictionTimeout', 3);
  const clamped = Number.isFinite(seconds) ? Math.min(60, Math.max(0.5, seconds)) : 3;
  return Math.round(clamped * 1000);
}

function describe(error: unknown): string {
  return error instanceof Error ? error.stack ?? error.message : String(error);
}
