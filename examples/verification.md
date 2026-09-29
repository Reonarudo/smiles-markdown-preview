# SMILES Structure Preview — verification document

Open this file's preview (`⇧⌘V` or *Open Preview to the Side*) and compare with
the expectations in each section.

## 1. Defaults

Expect: aspirin on a padded, rounded white card; red oxygens, black bonds.

```smiles
CC(=O)Oc1ccccc1C(=O)O
```

## 2. Several molecules with labels

Expect: three structures side by side, each with its label beneath.

```smiles
CCO ethanol
c1ccccc1 benzene
[Na+].[Cl-] table salt
```

## 3. Attributes

Expect: centred, with the caption beneath; the output channel notes "algin".

```smiles {alt="Caffeine" caption="Figure 3: caffeine" align="center" algin="typo"}
Cn1cnc2c1c(=O)n(C)c(=O)n2C
```

## 4. Stereochemistry

Expect: a wedge bond and a small "this enantiomer" annotation.

```smiles
C[C@H](N)C(=O)O L-alanine
```

## 5. Parse error

Expect: a warning-bordered box quoting `dangling ring closure` with a caret under
the end of `C1CC`; the next section still renders.

```smiles
C1CC
```

## 6. Delegated fence

Expect: a plain code block, not a structure.

```smi
CCO left alone
```
