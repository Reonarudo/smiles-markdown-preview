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
