/** One line of a SMILES fence: the string to depict and, optionally, the text that followed it. */
export interface MoleculeLine {
  smiles: string;
  label?: string;
}

/**
 * Split a SMILES fence into molecules, one per non-blank line, in the convention of `.smi` files:
 * the SMILES string ends at the first whitespace and anything after it names the molecule.
 *
 * Nothing here can fail; a fence with no non-blank line yields no molecules, which the fence
 * rule reports.
 */
export function parseMolecules(content: string): MoleculeLine[] {
  const molecules: MoleculeLine[] = [];
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const split = /\s/.exec(trimmed);
    if (!split) {
      molecules.push({ smiles: trimmed });
    } else {
      molecules.push({ smiles: trimmed.slice(0, split.index), label: trimmed.slice(split.index).trim() });
    }
  }
  return molecules;
}
