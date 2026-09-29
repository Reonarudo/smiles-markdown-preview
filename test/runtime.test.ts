import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { createRuntime, SVG_ID } from '../src/renderer';

test('a valid SMILES string renders to an SVG structure through the worker', async () => {
  const runtime = await createRuntime(resolve('dist'));
  try {
    const result = runtime.render('CC(=O)Oc1ccccc1C(=O)O');
    assert.equal(result.status, 'success');
    if (result.status !== 'success') return;
    assert.match(result.output, new RegExp(`^<svg id="${SVG_ID}" xmlns="http://www\\.w3\\.org/2000/svg"`));
    assert.match(result.output, /<text [^>]*>O<\/text>/);
    assert.match(result.output, /<line /);
    // Editor hit targets are stripped; only geometry, labels and the style block remain.
    assert.doesNotMatch(result.output, /class="event"/);
    assert.deepEqual([...new Set(result.output.match(/<\w+/g))], ['<svg', '<style', '<text', '<line']);
  } finally {
    runtime.dispose();
  }
});

test('a parse error comes back as a failure with OpenChemLib prefixes stripped', async () => {
  const runtime = await createRuntime(resolve('dist'));
  try {
    assert.deepEqual(runtime.render('C1CC'), { status: 'failure', message: 'dangling ring closure: 1; position:4' });
    assert.deepEqual(runtime.render('Xx'), { status: 'failure', message: 'unknown element label found. Position:0' });
  } finally {
    runtime.dispose();
  }
});

test('a render over the time limit times out, and the next render still works', async () => {
  const runtime = await createRuntime(resolve('dist'), { timeout: 200 });
  try {
    assert.deepEqual(runtime.render('C'.repeat(1500)), { status: 'timeout', budget: 200 });
    assert.equal(runtime.render('CCO').status, 'success');
  } finally {
    runtime.dispose();
  }
});

test('the worker spawned after a timeout gets the same budget, not the startup allowance', async () => {
  const runtime = await createRuntime(resolve('dist'), { timeout: 300 });
  try {
    assert.equal(runtime.render('C'.repeat(1500)).status, 'timeout');
    const started = Date.now();
    assert.deepEqual(runtime.render('C'.repeat(1501)), { status: 'timeout', budget: 300 });
    assert.ok(Date.now() - started < 3000, 'fresh worker load plus 300 ms budget');
  } finally {
    runtime.dispose();
  }
});

test('a budget function is read before every render, so a setting change applies at once', async () => {
  let budget = 100;
  const runtime = await createRuntime(resolve('dist'), { timeout: () => budget });
  try {
    // 600 carbons take a few hundred milliseconds: over a 100 ms budget, within 10 s.
    assert.deepEqual(runtime.render('C'.repeat(600)), { status: 'timeout', budget: 100 });
    budget = 10_000;
    assert.equal(runtime.render('C'.repeat(600)).status, 'success');
  } finally {
    runtime.dispose();
  }
});

test('a SMILES string over 4 KB is refused', async () => {
  const runtime = await createRuntime(resolve('dist'));
  try {
    assert.deepEqual(runtime.render('C'.repeat(4_001)), { status: 'failure', message: 'SMILES exceeds the 4 KB limit.' });
  } finally {
    runtime.dispose();
  }
});

test('a SMARTS pattern renders with its query features, and SMILES mode still rejects it', async () => {
  const runtime = await createRuntime(resolve('dist'));
  try {
    const pattern = runtime.render('[C,N;!H0]~*', 'smarts');
    assert.equal(pattern.status, 'success');
    // OpenChemLib annotates the atom list and the hydrogen constraint on the depiction.
    assert.ok(pattern.status === 'success' && /<text [^>]*>\[C,N\]<\/text>/.test(pattern.output));
    // Patterns are drawn at 1.5 times the standard scale, so their annotations stay legible.
    const molecule = runtime.render('CC', 'smiles');
    const same = runtime.render('CC', 'smarts');
    const width = (r: typeof same) => Number(r.status === 'success' && /width="([\d.]+)px"/.exec(r.output)?.[1]);
    assert.ok(width(same) > width(molecule) * 1.3, `${width(same)} vs ${width(molecule)}`);
    assert.equal(runtime.render('[C,N;!H0]~*', 'smiles').status, 'failure');
    assert.equal(runtime.render('[C,N;!H0]~*').status, 'failure', 'SMILES is the default');
  } finally {
    runtime.dispose();
  }
});

test('an unsupported SMARTS primitive is a failure naming its position', async () => {
  const runtime = await createRuntime(resolve('dist'));
  try {
    assert.deepEqual(runtime.render('[C;x3]', 'smarts'),
      { status: 'failure', message: "unexpected character inside brackets: 'x', position:3" });
    assert.deepEqual(runtime.render('[#6]'.repeat(1_001), 'smarts'),
      { status: 'failure', message: 'SMARTS exceeds the 4 KB limit.' });
  } finally {
    runtime.dispose();
  }
});

test('SMARTS annotations are regenerated and escaped, and markup in a pattern is refused', async () => {
  const runtime = await createRuntime(resolve('dist'));
  try {
    const annotated = runtime.render('[C;!H0]', 'smarts');
    assert.ok(annotated.status === 'success' && /<text [^>]*>h&gt;0<\/text>/.test(annotated.output));
    for (const hostile of ['[$(<script>)]', '[C;$(C<b>)]', '[#6&"x"]', '[C<1>]']) {
      const result = runtime.render(hostile, 'smarts');
      assert.equal(result.status, 'failure', hostile);
    }
  } finally {
    runtime.dispose();
  }
});
