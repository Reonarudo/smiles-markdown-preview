import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import MarkdownIt from 'markdown-it';
import { createPreview } from '../src/preview';

const document = [
  '```smiles {caption="Aspirin" algin="typo"}',
  'CC(=O)Oc1ccccc1C(=O)O',
  '```',
  '',
  '```smiles',
  'CC(=O)Oc1ccccc1C(=O)O',
  '```',
  '',
  '```smiles',
  'CCO ethanol',
  'C1CC',
  '[Na+].[Cl-] salt',
  '```',
  '',
  '```smi',
  'CCO left alone',
  '```',
  '',
  '```smarts',
  '[CX3](=O)[OX2H1] carboxylic acid',
  '[C;x3]',
  '```'
].join('\n');

test('the preview takes a live budget and clears its cache on demand', async () => {
  let budget = 100;
  const preview = await createPreview(resolve('dist'), () => {}, { timeout: () => budget });
  try {
    const md = preview.extendMarkdownIt(new MarkdownIt());
    const slow = '```smiles\n' + 'C'.repeat(600) + '\n```';
    assert.match(md.render(slow), /longer than 0\.1 s/);
    budget = 10_000;
    assert.match(md.render(slow), /longer than 0\.1 s/, 'still cached');
    preview.clear();
    assert.match(md.render(slow), /<svg class="smiles"/);
  } finally {
    preview.dispose();
  }
});

test('a Markdown document renders namespaced structures beside delegated fences', async () => {
  const logged: string[] = [];
  const preview = await createPreview(resolve('dist'), (line) => logged.push(line));
  try {
    const html = preview.extendMarkdownIt(new MarkdownIt()).render(document);
    assert.equal((html.match(/<svg class="smiles[ "]/g) ?? []).length, 5);
    assert.equal((html.match(/<svg class="smiles smarts"/g) ?? []).length, 1);
    assert.match(html, /<span class="smiles-label">carboxylic acid<\/span>/);
    assert.match(html, /<pre>unexpected character inside brackets: 'x', position:3\n\n\[C;x3\]\n   \^<\/pre>/);
    assert.match(html, /<figure class="smiles-figure"><svg class="smiles" id="[^"]+" xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
    assert.match(html, /<figcaption>Aspirin<\/figcaption>/);
    // The two identical structures share a cache entry but not their ids.
    const ids = [...html.matchAll(/<svg class="smiles[^"]*" id="([^"]+)"/g)].map((m) => m[1]);
    assert.equal(new Set(ids).size, 5);
    assert.match(html, /<span class="smiles-label">ethanol<\/span>/);
    assert.match(html, /<text [^>]*>Na<\/text>/);
    assert.match(html, /<div class="smiles-error" role="alert"><pre>dangling ring closure: 1; position:4\n\nC1CC\n    \^<\/pre><\/div>/);
    assert.match(html, /<pre><code class="language-smi">CCO left alone/);
    assert.deepEqual(logged, ['Unknown attribute "algin"; ignored.']);
  } finally {
    preview.dispose();
  }
});
