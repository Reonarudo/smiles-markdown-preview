// Runs inside a real VS Code (scripts/test-extension.mjs). Renders through the Markdown preview's
// own markdown-it via `markdown.api.render`, so every assertion sees what the preview would show.
const vscode = require('vscode');
const assert = require('node:assert/strict');

const fence = (info, source) => '```' + info + '\n' + source + '\n```\n';

exports.run = async () => {
  const extension = vscode.extensions.getExtension('ReoX86.smiles-structure-preview');
  assert(extension, 'extension ReoX86.smiles-structure-preview is installed');
  assert.deepEqual(extension.packageJSON.contributes['markdown.previewStyles'], ['media/preview.css']);
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
  assert.equal((mixed.match(/<svg class="smiles"/g) ?? []).length, 3);
  assert.match(mixed, /<text [^>]*>Na<\/text>/);
  assert.match(mixed, /<span class="smiles-label">ethanol<\/span>/);
  assert.match(mixed, /class="[^"]*\blanguage-smi"/);
  assert.match(mixed, /class="[^"]*\blanguage-graphviz"/);
  assert.match(mixed, /class="[^"]*\blanguage-swift"/);

  // SMARTS fences: query features are drawn, and the same string is refused as SMILES.
  const patterns = await render(fence('smarts {caption="Queries"}', '[CX3](=O)[OX2H1] acid\n[C,N;!H0]~*') + fence('smiles', '[C,N;!H0]~*'));
  assert.equal((patterns.match(/<svg class="smiles smarts"/g) ?? []).length, 2);
  assert.match(patterns, /<text [^>]*>\[C,N\]<\/text>/);
  assert.match(patterns, /<figcaption>Queries<\/figcaption>/);
  assert.match(patterns, /<div class="smiles-error" role="alert"><pre>alternative atom definitions not supported/);

  // Attributes, escaping and a tolerated typo.
  const attributed = await render(fence('smiles {alt="Ethanol" caption="Figure 1: <alcohol>" align="center" algin="x"}', 'CCO'));
  assert.match(attributed, /<figure class="smiles-figure smiles-align-center"><div role="img" aria-label="Ethanol"><svg class="smiles"/);
  assert.match(attributed, /<figcaption>Figure 1: &lt;alcohol&gt;<\/figcaption>/);

  // Two copies of one structure with distinct ids, each style scoped to its own.
  const twice = await render(fence('smiles', 'c1ccccc1').repeat(2));
  const ids = [...twice.matchAll(/<svg class="smiles" id="([^"]+)"/g)].map((m) => m[1]);
  assert.equal(new Set(ids).size, 2);
  for (const id of ids) assert.match(twice, new RegExp(`<style> #${id} text`));

  // A parse error becomes an error report with a caret; the rest of the document survives.
  const broken = await render('Before\n\n' + fence('smiles', 'C1CC') + '\nAfter');
  assert.match(broken, /<div class="smiles-error" role="alert"><pre>dangling ring closure: 1; position:4\n\nC1CC\n    \^<\/pre><\/div>/);
  assert.match(broken, /<p\b[^>]*>After<\/p>/);

  // A molecule too large to lay out times out, and the next structure still renders.
  const started = Date.now();
  const huge = await render(fence('smiles', 'C'.repeat(3000)));
  assert.match(huge, /Depiction took longer than 3 s \(smiles\.depictionTimeout\)/);
  assert.ok(Date.now() - started < 6000, 'timeout returns promptly');
  assert.match(await render(fence('smiles', 'CCO')), /<svg class="smiles"/);

  // The budget follows the setting live, and changing it retries a cached timeout.
  const configuration = vscode.workspace.getConfiguration('smiles');
  assert.equal(configuration.get('depictionTimeout'), 3);
  const slow = fence('smiles', 'C'.repeat(1500));
  await configuration.update('depictionTimeout', 0.5, vscode.ConfigurationTarget.Global);
  try {
    assert.match(await render(slow), /longer than 0\.5 s \(smiles\.depictionTimeout\)/);
    await configuration.update('depictionTimeout', 60, vscode.ConfigurationTarget.Global);
    assert.match(await render(slow), /<svg class="smiles"/);
  } finally {
    await configuration.update('depictionTimeout', undefined, vscode.ConfigurationTarget.Global);
  }
};
