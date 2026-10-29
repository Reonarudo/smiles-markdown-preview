# The view toggle

Every `smiles` and `smarts` fence below carries a button in its top corner that flips it between
the structure and the fence's source. This file is the fixture for `npm run test:preview` and the
document for the manual checklist (the source-toggle spec in `onnx-markdown-preview`, section
9.5): open it in a development window and view it in a light, a dark and a high-contrast theme.

## 1. A plain fence

```smiles
CC(=O)Oc1ccccc1C(=O)O aspirin
```

## 2. Captioned, centred: the button stays at the column edge

```smiles {caption="Figure 1: L-alanine, stereocentre marked" align="center"}
C[C@H](N)C(=O)O
```

## 3. Right-aligned with alt: the card sits under the button

```smiles {alt="ethanol" align="right"}
CCO
```

## 4. Error card: the source view shows the body alone

```smiles
C1CC
```

## 5. Long lines and a tall body: horizontal scroll, height jump

```smiles
CCCCCCCCCCCCCCCC(=O)OC[C@H](COP(=O)([O-])OCC[N+](C)(C)C)OC(=O)CCCCCCC/C=C\CCCCCCCC POPC, a phospholipid whose line runs well past the width of the preview column
CCO ethanol
c1ccccc1 benzene
Cn1cnc2c1c(=O)n(C)c(=O)n2C caffeine
CC(C)Cc1ccc(cc1)C(C)C(=O)O ibuprofen
CN1CCC[C@H]1c2cccnc2 nicotine
C(C1C(C(C(C(O1)O)O)O)O)O glucose
OC(=O)CCCCC(=O)O adipic acid
```

## 6. Two identical bodies: flip the second one only, then edit this heading

```smiles
[Na+].[Cl-] salt
```

```smiles
[Na+].[Cl-] salt
```

## 7. An ordinary fence: no toggle, VS Code's own copy button on hover

```json
{ "compare": "hover me: the copy button is top-right, on hover only" }
```

## 8. Right-to-left container: the button moves to the left

<div dir="rtl">

```smiles
c1ccccc1 benzene
```

</div>

## 9. Quirks

A `smarts` fence is claimed too, so its source view carries `language-smarts`:

```smarts
[CX3](=O)[OX2H1] carboxylic acid
[C,N;!H0]~* C or N with a hydrogen
```

A multi-line fence is one claimed fence: one button, one source view of the whole body, while
the broken line shows its error card in its own cell of the row:

```smiles
CCO ethanol
C1CC broken
CCC propane
```

An empty fence is a claimed fence as well: its error card gets the button, and its source view
is empty:

```smiles
```

The SMILES preview has no loading placeholder, notes or slot cache; a molecule that takes longer
than `smiles.depictionTimeout` shows a timeout card, which the toggle treats like any error card.
