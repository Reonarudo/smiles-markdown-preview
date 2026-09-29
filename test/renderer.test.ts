import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRenderer, type RenderResult } from '../src/renderer';

/** A stand-in for the worker runtime that records every SMILES string it is asked to depict. */
function stubRuntime(result: (smiles: string) => RenderResult = (smiles) =>
  ({ status: 'success', output: `<svg>${smiles}</svg>` })) {
  const seen: string[] = [];
  return { seen, render: (smiles: string) => { seen.push(smiles); return result(smiles); } };
}

test('a repeated string is depicted once, then served from the cache', () => {
  const runtime = stubRuntime();
  const render = createRenderer(runtime);
  const expected = { status: 'success', output: '<svg>CCO</svg>' };
  assert.deepEqual(render('CCO'), expected);
  assert.deepEqual(render('CCO'), expected);
  assert.deepEqual(runtime.seen, ['CCO']);
});

test('a timed-out string is not depicted again while it stays cached', () => {
  const runtime = stubRuntime(() => ({ status: 'timeout', budget: 3000 }));
  const render = createRenderer(runtime);
  assert.deepEqual(render('huge'), { status: 'timeout', budget: 3000 });
  assert.deepEqual(render('huge'), { status: 'timeout', budget: 3000 });
  assert.deepEqual(runtime.seen, ['huge']);
});

test('clearing the cache retries a cached timeout, so a raised budget takes effect', () => {
  const runtime = stubRuntime(() => ({ status: 'timeout', budget: 3000 }));
  const render = createRenderer(runtime);
  render('huge');
  render.clear();
  render('huge');
  assert.deepEqual(runtime.seen, ['huge', 'huge']);
});

test('a failure is cached like any other outcome', () => {
  const runtime = stubRuntime(() => ({ status: 'failure', message: 'bad' }));
  const render = createRenderer(runtime);
  render('X');
  render('X');
  assert.deepEqual(runtime.seen, ['X']);
});

test('an unavailable renderer is retried on the next render instead of being cached', () => {
  let starts = 0;
  const runtime = stubRuntime(() => ++starts === 1
    ? { status: 'unavailable', reason: 'boom' }
    : { status: 'success', output: '<svg></svg>' });
  const render = createRenderer(runtime);
  assert.deepEqual(render('a'), { status: 'unavailable', reason: 'boom' });
  assert.equal(render('a').status, 'success');
});

test('the cache keeps the 96 most recently used strings', () => {
  const runtime = stubRuntime();
  const render = createRenderer(runtime);
  for (let i = 0; i < 96; i++) render(`m${i}`);
  render('m0'); // touched, so m1 is now the least recently used
  render('m96'); // the 97th string evicts m1
  runtime.seen.length = 0;
  render('m0');
  render('m2');
  render('m1');
  assert.deepEqual(runtime.seen, ['m1']);
});
