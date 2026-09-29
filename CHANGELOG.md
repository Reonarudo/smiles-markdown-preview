# Changelog

## 0.1.0 — 2026-09-29

- Render `smiles` fences in the Markdown preview with OpenChemLib 9.25.0, in a worker
  with a depiction limit that recovers after a timeout; the limit defaults to 3 s and
  is set by `smiles.depictionTimeout`.
- One molecule per line; text after the SMILES string labels it, as in `.smi` files.
- `alt`, `caption`, `align` and `class` fence attributes; malformed attributes are
  ignored and reported in the output channel.
- Parse errors quote the SMILES string with a caret at the offending position.
- README screenshots captured from a real VS Code by `npm run screenshots`.
