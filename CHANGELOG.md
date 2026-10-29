# Changelog

## 0.4.0 — 2026-10-28

- Every structure carries a view toggle in its top corner that flips the fence
  between the structure and its source text, highlighted as the preview highlights
  any code block. A multi-line fence flips as a whole, with the row and its
  per-line error cards on one side and the fence body on the other. A flipped
  fence stays flipped while the document is edited, after *Markdown: Refresh
  Preview* and when the preview is reopened. The toggle is also present on error
  cards, including the empty-fence report. It is a reader's control; no fence
  attribute presets it.
- A preview script (`media/preview.js`) is contributed for the first time;
  `npm run test:preview` exercises it in a live preview through Playwright.

## 0.3.0 — 2026-10-24

- Structures are drawn by smiles-renderer 1.0.0, the library reonarudo.github.io
  uses, instead of a copy of OpenChemLib inside the extension. The engine is still
  OpenChemLib 9.25.0. **Requires VS Code 1.101 or later.**
- Each line of a fence is still its own structure: a bad molecule shows its error
  in its cell while the rest of the row renders.
- Parse errors name the line and column in the fence, and still quote the string
  with a caret.
- Changing `smiles.depictionTimeout` restarts the renderer with the new limit.
- Structure ids are derived from the string, so identical molecules share them.

## 0.2.0 — 2026-09-29

- `smarts` fences draw SMARTS substructure queries, one per line with optional
  labels, taking the same attributes and limits as `smiles` fences. Atom lists,
  negations and other constraints are annotated on the atoms they apply to, and
  patterns are drawn at 1.5 times the scale of molecules to keep them legible.
- The notation comes from the fence tag and is never guessed; a SMARTS query in a
  `smiles` fence remains a parse error.

## 0.1.0 — 2026-09-29

- Render `smiles` fences in the Markdown preview with OpenChemLib 9.25.0, in a worker
  with a depiction limit that recovers after a timeout; the limit defaults to 3 s and
  is set by `smiles.depictionTimeout`.
- One molecule per line; text after the SMILES string labels it, as in `.smi` files.
- `alt`, `caption`, `align` and `class` fence attributes; malformed attributes are
  ignored and reported in the output channel.
- Parse errors quote the SMILES string with a caret at the offending position.
- README screenshots captured from a real VS Code by `npm run screenshots`.
