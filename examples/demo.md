# SMILES Structure Preview

## Aspirin

```smiles
CC(=O)Oc1ccccc1C(=O)O
```

## Several molecules with labels

```smiles
CCO ethanol
c1ccccc1 benzene
Cn1cnc2c1c(=O)n(C)c(=O)n2C caffeine
```

## Caption and alignment

```smiles {alt="L-alanine with its stereocentre marked" caption="Figure 1: L-alanine" align="center"}
C[C@H](N)C(=O)O
```

## Parse error

```smiles
C1CC
```

## SMARTS patterns

```smarts
[CX3](=O)[OX2H1] carboxylic acid
[C,N;!H0]~* C or N with a hydrogen
[NX3;H2,H1;!$(NC=O)] amine, not amide
```

```smarts {caption="Figure 2: any six-membered carbon ring, with any bonds" align="center"}
[#6]1~[#6]~[#6]~[#6]~[#6]~[#6]~1
```
