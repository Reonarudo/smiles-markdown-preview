# SMILES Structure Preview

Adds SMILES molecules and SMARTS patterns to VS Code's built-in Markdown preview.

Write a SMILES string in a fence tagged `smiles`:

````markdown
```smiles
CC(=O)Oc1ccccc1C(=O)O
```
````

Only `smiles` and `smarts` fences are claimed — `smi` fences are left to other
renderers.

![Aspirin and a row of labelled molecules rendered in VS Code's built-in Markdown preview](media/screenshots/structures.jpg)

## Several molecules

Each non-blank line is one molecule. Text after the first whitespace labels it,
as in `.smi` files; the molecules sit side by side with each label beneath:

````markdown
```smiles
CCO ethanol
c1ccccc1 benzene
[Na+].[Cl-] table salt
```
````

## SMARTS patterns

A fence tagged `smarts` parses each line as a SMARTS substructure query instead
of a molecule. Atom lists, negations, hydrogen counts, ring constraints, any-bonds
and recursive groups are drawn, with each constraint annotated on the atom it
applies to:

````markdown
```smarts
[CX3](=O)[OX2H1] carboxylic acid
[C,N;!H0]~* C or N with a hydrogen
[NX3;H2,H1;!$(NC=O)] amine, not amide
```
````

![A row of labelled SMARTS patterns with annotated query atoms, and a captioned six-membered ring of any-bonds](media/screenshots/smarts.jpg)

Any-bonds (`~`) carry an orange dot. Atoms that a negated recursive group
requires to be absent, such as the carbonyl in `!$(NC=O)`, are shaded. Patterns
are drawn half as large again as molecules so their annotations stay legible.

Labels, attributes and limits work exactly as for `smiles` fences, and each
pattern's `<svg>` carries an extra `smarts` class. The notation is never guessed:
a SMARTS query in a `smiles` fence is a parse error, so a mistyped molecule is
never quietly drawn as a pattern. SMARTS features OpenChemLib does not
support, such as `x` ring connectivity, `@?` chirality or two positive recursive
groups in one atom, are reported as parse errors like any other.

## Fence attributes

An optional attribute block after the `smiles` or `smarts` tag adjusts how one
fence is presented:

````markdown
```smiles {alt="Aspirin" caption="Figure 1: Acetylsalicylic acid" align="center"}
CC(=O)Oc1ccccc1C(=O)O
```
````

| Attribute | Effect |
| --- | --- |
| `alt` | Description for readers who cannot see the structure |
| `caption` | Text shown beneath the structure |
| `align` | `left`, `center` or `right` |
| `class` | Extra CSS class on each structure's `<svg>` |

Values are quoted. A mistyped or malformed attribute never costs you the
structure: it is ignored, and a note is written to the *SMILES Structure Preview*
output channel.

![A captioned, centred structure and a parse error report with a caret in the Markdown preview](media/screenshots/caption-and-error.jpg)

## Errors and limits

A SMILES or SMARTS parse error is shown in place of the structure, quoting the
string with a caret at the offending position. Depiction is limited to 4 KB per
string
and, by default, 3 seconds per molecule; a molecule that takes longer shows a
timeout message until its string changes. Raise or lower the limit with the
`smiles.depictionTimeout` setting (seconds, 0.5 to 60); a change applies to the
next render, and molecules that timed out under the old limit are retried.

Structures are drawn on a white card with CPK element colours in every theme.
The extension reads no files, so it works fully in Restricted Mode and virtual
workspaces.

## Development

Requires Node 22 or newer (see `.nvmrc`).

```sh
npm ci
npm run lint            # tsc --noEmit
npm test                # node --test, after building
npm run package         # vsce package
npm run test:package    # the VSIX inside a real VS Code
npm run screenshots     # regenerate media/screenshots from examples/demo.md
```

## License

MIT for this extension; bundled OpenChemLib is BSD-3-Clause — see
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
