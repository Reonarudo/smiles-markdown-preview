// Runs inside a real VS Code (scripts/test-extension.mjs). Renders through the Markdown preview's
// own markdown-it via `markdown.api.render`, so every assertion sees what the preview would show.
const vscode = require('vscode');
const assert = require('node:assert/strict');

const fence = (info, source) => '```' + info + '\n' + source + '\n```\n';

exports.run = async () => {
  const extension = vscode.extensions.getExtension('ReoX86.smiles-structure-preview');
  assert(extension, 'extension ReoX86.smiles-structure-preview is installed');
  assert.deepEqual(extension.packageJSON.contributes['markdown.previewStyles'], ['media/preview.css']);
  assert.deepEqual(extension.packageJSON.contributes['markdown.previewScripts'], ['media/preview.js']);
  await extension.activate();
  await vscode.extensions.getExtension('vscode.markdown-language-features').activate();
  const render = (markdown) => vscode.commands.executeCommand('markdown.api.render', markdown);

  // Structures, a labelled row, and fences this extension must leave alone.
  const mixed = await render([
    fence('smiles', 'CC(=O)Oc1ccccc1C(=O)O'),
    fence('smiles', 'CCO ethanol\n[Na+].[Cl-] salt'),
    fence('smi', 'CCO left alone'),
    fence('graphviz', 'digraph { a -> b }'),
    fence('swift', 'let x = 42')
  ].join('\n'));
  // The library's SVG, given its natural width in pixels by the extension.
  assert.equal((mixed.match(/<svg width="[\d.]+px"[^>]*\bclass="smiles"/g) ?? []).length, 3);
  assert.match(mixed, /<text [^>]*>Na<\/text>/);
  assert.match(mixed, /<span class="smiles-label">ethanol<\/span>/);
  assert.match(mixed, /class="[^"]*\blanguage-smi"/);
  assert.match(mixed, /class="[^"]*\blanguage-graphviz"/);
  assert.match(mixed, /class="[^"]*\blanguage-swift"/);

  // The view toggle's wrapper, and its source view delegated to VS Code's own fence rule: the
  // `<pre>` carries VS Code's shell (`dir="auto"`, not the plugin's hand-built fallback) minus
  // the scroll-sync class and line, which only the wrapper carries.
  assert.match(mixed, /<div class="smiles-fence code-line" data-line="0" data-fence-key="[0-9a-f]{8}"><button type="button" class="smiles-toggle" aria-pressed="false" aria-label="Source view" title="Source view"><svg class="smiles-icon-code"/);
  assert.match(mixed, /<\/button><div class="smiles-rendering"><svg width="[\d.]+px"[^>]*\bclass="smiles"/);
  assert.match(mixed, /<\/div><pre><code class="language-smiles" dir="auto">CC\(=O\)Oc1ccccc1C\(=O\)O\n<\/code><\/pre>\n<\/div>/);
  assert.match(mixed, /<\/div><pre><code class="language-smiles" dir="auto">CCO ethanol\n\[Na\+\]\.\[Cl-\] salt\n<\/code><\/pre>\n<\/div>/);
  assert.equal((mixed.match(/<div class="smiles-fence /g) ?? []).length, 2, 'one wrapper per claimed fence, none for delegated ones');
  assert.equal((mixed.match(/<pre><code class="language-smiles" dir="auto">/g) ?? []).length, 2, 'no sync attributes on the source <code>');
  for (const line of ['0', '4']) assert.equal((mixed.match(new RegExp(`data-line="${line}"`, 'g')) ?? []).length, 1, `one scroll-sync element for the fence at line ${line}`);

  // SMARTS fences: query features are drawn, and the same string is refused as SMILES.
  const patterns = await render(fence('smarts {caption="Queries"}', '[CX3](=O)[OX2H1] acid\n[C,N;!H0]~*') + fence('smiles', '[C,N;!H0]~*'));
  assert.equal((patterns.match(/<svg [^>]*\bclass="smiles smarts"/g) ?? []).length, 2);
  assert.match(patterns, /<text [^>]*>\[C,N\]<\/text>/);
  assert.match(patterns, /<figcaption>Queries<\/figcaption>/);
  assert.match(patterns, /<div class="smiles-error" role="alert"><pre>alternative atom definitions not supported/);
  // A smarts fence is wrapped too, and its source view carries its own word.
  assert.match(patterns, /<\/div><pre><code class="language-smarts" dir="auto">\[CX3\]\(=O\)\[OX2H1\] acid\n\[C,N;!H0\]~\*\n<\/code><\/pre>\n<\/div>/);

  // Attributes, escaping and a tolerated typo.
  const attributed = await render(fence('smiles {alt="Ethanol" caption="Figure 1: <alcohol>" align="center" algin="x" class="wide\\" onload=\\"x"}', 'CCO'));
  assert.match(attributed, /<figure class="smiles-figure smiles-align-center"><div role="img" aria-label="Ethanol"><svg [^>]*\bclass="smiles wide&quot; onload=&quot;x"/);
  assert.match(attributed, /<figcaption>Figure 1: &lt;alcohol&gt;<\/figcaption>/);

  // The library's deterministic ids: the same string, the same id, its style scoped through it.
  const twice = await render(fence('smiles', 'c1ccccc1').repeat(2) + fence('smarts', 'c1ccccc1'));
  const ids = [...twice.matchAll(/\bclass="smiles[^"]*" id="([^"]+)"/g)].map((m) => m[1]);
  assert.equal(ids.length, 3);
  assert.match(ids[0], /^smiles-[0-9a-f]{8}-root$/);
  assert.equal(ids[0], ids[1]);
  assert.notEqual(ids[0], ids[2]);
  for (const id of ids) assert.match(twice, new RegExp(`<style>#${id} text`));

  // A parse error becomes an error report with a caret, in its own cell of the row; the other
  // molecules and the rest of the document survive.
  const broken = await render('Before\n\n' + fence('smiles', 'CCO ethanol\n  C1CC broken\nCCC') + '\nAfter');
  assert.match(broken, /<div class="smiles-error" role="alert"><pre>dangling ring closure: 1 at line 2, column 7\n\nC1CC\n    \^<\/pre><\/div>/);
  assert.equal((broken.match(/<svg width=/g) ?? []).length, 2);
  assert.match(broken, /<span class="smiles-label">broken<\/span>/);
  assert.match(broken, /<p\b[^>]*>After<\/p>/);

  // A molecule too large to lay out times out, and the next structure still renders.
  const started = Date.now();
  const huge = await render(fence('smiles', 'C'.repeat(3000)));
  assert.match(huge, /Depiction took longer than 3 s \(smiles\.depictionTimeout\)/);
  assert.ok(Date.now() - started < 6000, 'timeout returns promptly');
  assert.match(await render(fence('smiles', 'CCO')), /\bclass="smiles"/);

  // The budget follows the setting: a change restarts the renderer with the new budget and, once
  // it has taken over, forgets cached outcomes, so a cached timeout is retried.
  const configuration = vscode.workspace.getConfiguration('smiles');
  assert.equal(configuration.get('depictionTimeout'), 3);
  const slow = fence('smiles', 'C'.repeat(1500));
  const eventually = async (pattern, what) => {
    const deadline = Date.now() + 30_000;
    let html;
    while (Date.now() < deadline) {
      html = await render(slow);
      if (pattern.test(html)) return;
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    assert.fail(`${what}; last render: ${html.slice(0, 300)}`);
  };
  await configuration.update('depictionTimeout', 0.5, vscode.ConfigurationTarget.Global);
  try {
    await eventually(/longer than 0\.5 s \(smiles\.depictionTimeout\)/, 'times out under the 0.5 s budget');
    await configuration.update('depictionTimeout', 60, vscode.ConfigurationTarget.Global);
    await eventually(/<svg width="[\d.]+px"/, 'renders once the 60 s budget takes over');
  } finally {
    await configuration.update('depictionTimeout', undefined, vscode.ConfigurationTarget.Global);
  }
};
