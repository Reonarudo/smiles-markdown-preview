# SMILES Structure Preview v0.3.0

Structures are now drawn by [smiles-renderer](https://github.com/Reonarudo/smiles-renderer) 1.0.0, the same library that renders SMILES on reonarudo.github.io, instead of a copy inside the extension. The engine is still OpenChemLib 9.25.0. **Requires VS Code 1.101 or later**; older versions stay on 0.2.0.

- Each line of a fence is still its own structure, and a bad molecule shows its error in its own cell.
- Parse errors name the line and column in the fence.
- Changing `smiles.depictionTimeout` restarts the renderer with the new limit.
