# SMILES Structure Preview v0.4.0

Every structure now carries a view toggle in its top corner that flips the fence between the structure and its source text, highlighted as the preview highlights any code block. A flipped fence stays flipped while you edit, after *Markdown: Refresh Preview* and when the preview is reopened; flip it back to see the structure again.

- A multi-line fence flips as a whole: the row and its per-line error cards on one side, the fence body on the other.
- The toggle is also present on error cards, including the empty-fence report.
- It is a reader's control; no fence attribute presets it.
- Still requires VS Code 1.101 or later.
