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

## 5. SMARTS patterns

Expect: three patterns side by side, labelled. The acid's carbon carries `pi1`
and its hydroxyl `h1,pi0`; the second shows `[C,N]` annotated `!a,h>0` bonded to
a `?`; the amine's nitrogen carries `h1-2,pi0` and the excluded carbonyl is
shaded pink. Patterns are drawn larger than the molecules above.

```smarts
[CX3](=O)[OX2H1] carboxylic acid
[C,N;!H0]~* C or N with a hydrogen
[NX3;H2,H1;!$(NC=O)] amine, not amide
```

## 6. SMARTS is never guessed

Expect: the `smarts` fence draws the pattern; the `smiles` fence below it shows
a warning-bordered box quoting `alternative atom definitions not supported`.

```smarts {caption="As SMARTS"}
[C,N;!H0]~*
```

```smiles {caption="As SMILES"}
[C,N;!H0]~*
```

## 7. Unsupported SMARTS primitive

Expect: an error quoting `unexpected character inside brackets: 'x'` with a caret
under the `x`.

```smarts
[C;x3]
```

## 8. Parse error

Expect: a warning-bordered box quoting `dangling ring closure` with a caret under
the end of `C1CC`; the next section still renders.

```smiles
C1CC
```

## 9. Delegated fence

Expect: plain code blocks, not structures.

```smi
CCO left alone
```

```SMARTS
[#6] uppercase tags are not claimed
```
