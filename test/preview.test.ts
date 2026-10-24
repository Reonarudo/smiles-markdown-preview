import { test } from 'node:test';
import assert from 'node:assert/strict';
import MarkdownIt from 'markdown-it';
import { createRuntime, type RenderResult } from '@reonarudo/smiles-renderer';
import { createPreview, createRenderer } from '../src/preview';
import { createRestartable } from '../src/runtimes';

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
  '  C1CC',
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

test('outcomes are cached per notation and string, timeouts included, until cleared', () => {
  let calls = 0;
  const outcome: RenderResult = { status: 'timeout', budget: 1 };
  const render = createRenderer({ render: () => { calls++; return outcome; } });
  render({ source: 'CCO', notation: 'smiles' });
  render({ source: 'CCO', notation: 'smiles' });
  assert.equal(calls, 1);
  render({ source: 'CCO', notation: 'smarts' });
  assert.equal(calls, 2);
  render.clear();
  render({ source: 'CCO', notation: 'smiles' });
  assert.equal(calls, 3);
});

test('an unavailable renderer is not cached', () => {
  let calls = 0;
  const render = createRenderer({ render: () => { calls++; return { status: 'unavailable', reason: 'x' }; } });
  render({ source: 'CCO', notation: 'smiles' });
  render({ source: 'CCO', notation: 'smiles' });
  assert.equal(calls, 2);
});

test('a restart with a new budget, then clear, retries a cached timeout', async () => {
  const library = { createRuntime };
  const runtime = await createRestartable(library, { timeout: 100 });
  try {
    const preview = createPreview(runtime, () => {});
    const md = preview.extendMarkdownIt(new MarkdownIt());
    const slow = '```smiles\n' + 'C'.repeat(600) + '\n```';
    assert.match(md.render(slow), /longer than 0\.1 s/);
    assert.equal(await runtime.restart({ timeout: 10_000 }), true);
    assert.match(md.render(slow), /longer than 0\.1 s/, 'still cached');
    preview.clear();
    assert.match(md.render(slow), /<svg width="[\d.]+px"[^>]*class="smiles"/);
  } finally {
    await runtime.dispose();
  }
});

test('a Markdown document renders structures through the library beside delegated fences', async () => {
  const logged: string[] = [];
  const runtime = await createRuntime();
  try {
    const html = createPreview(runtime, (line) => logged.push(line)).extendMarkdownIt(new MarkdownIt()).render(document);
    assert.equal((html.match(/<svg width="[\d.]+px"[^>]*class="smiles[ "]/g) ?? []).length, 5);
    assert.equal((html.match(/class="smiles smarts"/g) ?? []).length, 1);
    assert.match(html, /<span class="smiles-label">carboxylic acid<\/span>/);
    assert.match(html, /<pre>unexpected character inside brackets: 'x' at line 2, column 4\n\n\[C;x3\]\n   \^<\/pre>/);
    assert.match(html, /<figure class="smiles-figure"><svg width="[\d.]+px"/);
    assert.match(html, /<figcaption>Aspirin<\/figcaption>/);
    // The library derives ids from the string, so the two aspirins share theirs.
    const ids = [...html.matchAll(/\bid="(smiles-[0-9a-f]{8}-root)"/g)].map((m) => m[1]);
    assert.equal(ids.length, 5);
    assert.equal(new Set(ids).size, 4);
    assert.match(html, /<span class="smiles-label">ethanol<\/span>/);
    assert.match(html, /<text [^>]*>Na<\/text>/);
    assert.match(html, /<div class="smiles-error" role="alert"><pre>dangling ring closure: 1 at line 2, column 7\n\nC1CC\n    \^<\/pre><\/div>/);
    assert.match(html, /<pre><code class="language-smi">CCO left alone/);
    assert.deepEqual(logged, ['Unknown attribute "algin"; ignored.']);
  } finally {
    await runtime.dispose();
  }
});
