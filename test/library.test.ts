import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Molecule } from 'openchemlib';

test('the bundled OpenChemLib is the version named in the third-party notices', () => {
  const installed = JSON.parse(readFileSync('node_modules/openchemlib/package.json', 'utf8')) as { version: string; license: string };
  const notices = readFileSync('THIRD_PARTY_NOTICES.md', 'utf8');
  assert.equal(installed.license, 'BSD-3-Clause');
  assert.match(notices, new RegExp(`## OpenChemLib ${installed.version.replaceAll('.', '\\.')}\\b`));
  const locked = JSON.parse(readFileSync('package-lock.json', 'utf8')) as { packages: Record<string, { version: string; integrity: string }> };
  assert.equal(locked.packages['node_modules/openchemlib']!.version, installed.version);
  assert.ok(notices.includes(locked.packages['node_modules/openchemlib']!.integrity));
  assert.equal(readFileSync('licenses/OPENCHEMLIB-LICENSE', 'utf8'), readFileSync('node_modules/openchemlib/LICENSE', 'utf8'));
});

test('OpenChemLib depicts SMILES synchronously, without a DOM, to an SVG with a fixed id', () => {
  const svg = Molecule.fromSmiles('c1ccccc1').toSVG(600, 400, 'ocl', { autoCrop: true });
  assert.match(svg, /^<svg id="ocl" xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
  assert.match(svg, /<style> #ocl text/);
  assert.doesNotMatch(svg, /<script|<image|<foreignObject|href=/);
});
