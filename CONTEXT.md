# SMILES Structure Preview

A VS Code extension that turns SMILES strings, written in fenced code blocks, into
rendered molecular structures inside VS Code's built-in Markdown preview.

## Language

**SMILES fence**:
A fenced code block that this extension claims as its own and renders as one or
more structures, identified by the first word of its info string being `smiles`.
_Avoid_: smi block, molecule block, code block

**SMILES string**:
One line-notation description of a molecule, ending at the first whitespace on
its line of the fence.
_Avoid_: formula, code, source

**Label**:
The text after a SMILES string on the same line, shown beneath that molecule's
structure, in the convention of `.smi` files.
_Avoid_: name, title, caption — a caption belongs to the whole fence

**Info string**:
The text following the opening fence delimiter, which names the fence's
language and carries any attributes.
_Avoid_: fence header, language tag, fence info

**Attribute block**:
The brace-delimited portion of a SMILES fence's info string that adjusts how
that one fence is presented.
_Avoid_: options, params, fence args

**Delegation**:
Handing a fence this extension does not claim back to whichever fence renderer
was registered before it, so that other extensions' fences survive in the same
preview.
_Avoid_: fallthrough, passthrough, skipping

**Structure**:
The rendered SVG depiction of one molecule, produced by OpenChemLib from a
SMILES string.
_Avoid_: diagram, image, picture, drawing

**Row**:
Several structures from one fence, presented side by side with their labels.
_Avoid_: gallery, grid, list

**Figure**:
A structure or row presented together with its caption, alignment, or both — as
opposed to a bare structure, which stands alone in the preview.
_Avoid_: block, container, wrapper

**Caption**:
Plain text shown beneath a fence's structures, describing them for a reader who
can see them.
_Avoid_: label, title, legend, description

**Description**:
Plain text conveying a fence's structures to a reader who cannot see them,
spelled `alt` in the attribute block by analogy with images.
_Avoid_: alt text, title, tooltip, a11y label

**Alignment**:
Where a figure sits across the width of the preview.
_Avoid_: float, position, justification

**Error report**:
The message block shown in place of a structure when a SMILES string fails to
parse, exceeds the time limit, or the renderer cannot start.
_Avoid_: error message, alert, stack trace
