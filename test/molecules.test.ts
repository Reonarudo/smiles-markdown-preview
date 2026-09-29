import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseMolecules } from '../src/molecules';

test('one non-blank line is one unlabelled molecule, whitespace trimmed', () => {
  assert.deepEqual(parseMolecules('  CCO  \n'), [{ smiles: 'CCO' }]);
});

test('text after the first whitespace labels the molecule, as in .smi files', () => {
  assert.deepEqual(parseMolecules('CCO ethanol\nc1ccccc1\tbenzene  ring'), [
    { smiles: 'CCO', label: 'ethanol' },
    { smiles: 'c1ccccc1', label: 'benzene  ring' }
  ]);
});

test('blank lines and Windows line endings are skipped', () => {
  assert.deepEqual(parseMolecules('\r\nCCO\r\n\r\n  \r\nCCC\r\n'), [{ smiles: 'CCO' }, { smiles: 'CCC' }]);
});

test('an empty fence has no molecules', () => {
  assert.deepEqual(parseMolecules(''), []);
  assert.deepEqual(parseMolecules('\n  \n'), []);
});
