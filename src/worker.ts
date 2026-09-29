import { parentPort, workerData } from 'node:worker_threads';
import { Molecule } from 'openchemlib';
import { SVG_ID, type Notation, type RenderResult, type Request } from './renderer';

const { buffer } = workerData as { buffer: SharedArrayBuffer };
/** [0] result ready, [1] result byte length, [2] 1 once the library has loaded and this worker listens. */
const state = new Int32Array(buffer, 0, 3);
const bytes = new Uint8Array(buffer, 12);

function reply(result: RenderResult): void {
  let encoded = new TextEncoder().encode(JSON.stringify(result));
  if (encoded.length > bytes.length) {
    encoded = new TextEncoder().encode(JSON.stringify({
      status: 'failure',
      message: 'Structure output exceeds the 4 MB limit.'
    } satisfies RenderResult));
  }
  bytes.set(encoded);
  Atomics.store(state, 1, encoded.length);
  Atomics.store(state, 0, 1);
  Atomics.notify(state, 0);
}

/**
 * Depict one SMILES string, or one SMARTS pattern with its query features annotated on the atoms
 * and bonds they constrain. Invisible hit-target elements (`class="event"`) exist for
 * OpenChemLib's interactive editor and are dropped; they would double the size of every
 * structure in the preview for nothing.
 */
function depict(source: string, notation: Notation): RenderResult {
  let molecule: Molecule;
  try {
    // Explicit rather than `guess`: a mistyped SMILES must fail, not quietly become a pattern.
    molecule = Molecule.fromSmiles(source, { smartsMode: notation === 'smarts' ? 'smarts' : 'smiles' });
  } catch (error) {
    return { status: 'failure', message: describe(error, notation) };
  }
  if (molecule.getAllAtoms() === 0) {
    return { status: 'failure', message: 'No atoms found.' };
  }
  // The canvas bounds the depiction: a molecule that fits keeps the standard bond length and is
  // cropped to its extent; a larger one is scaled down to fit.
  // A pattern is drawn half as large again: its query annotations are set at two thirds of the
  // atom-label size, which at the standard 24 px bond length is too small to read.
  const svg = molecule.toSVG(600, 400, SVG_ID, {
    autoCrop: true,
    autoCropMargin: 6,
    fontWeight: 'normal',
    ...(notation === 'smarts' ? { maxAVBL: 36 } : {})
  });
  return {
    status: 'success',
    output: svg.replace(/^[ \t]*<(?:line|circle) id="[^"]*" class="event"[^>]*\/>\r?\n/gm, '')
  };
}

/** OpenChemLib's messages read `Class$S19: SmilesParser: dangling ring closure: 1; position:4`. */
function describe(error: unknown, notation: Notation): string {
  const raw = error instanceof Error ? error.message : String(error);
  return raw.replace(/^(?:[\w$]+:\s*)?SmilesParser:\s*/, '').trim() ||
    `${notation.toUpperCase()} could not be parsed.`;
}

// The first depiction in a fresh worker costs a few hundred milliseconds of warm-up that must not
// be charged to an author's budget, so it is spent here, before this worker reports ready.
depict('CC(=O)Oc1ccccc1C(=O)O', 'smiles');
depict('[#6](=O)[OX2H1,O-]', 'smarts');
parentPort!.on('message', ({ source, notation }: Request) => reply(depict(source, notation)));
Atomics.store(state, 2, 1);
Atomics.notify(state, 2);
parentPort!.postMessage({ ready: true });
