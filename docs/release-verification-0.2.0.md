# SMILES Structure Preview 0.2.0 verification

Release: SMARTS pattern support. Publisher: ReoX86.
Source tag: `v0.2.0` (`9e6e653ce4cc26faa950e0899a8c4d73c02bde70`).

- GitHub release: https://github.com/Reonarudo/smiles-markdown-preview/releases/tag/v0.2.0
- VSIX: `smiles-structure-preview-0.2.0.vsix`.
- SHA-256: `75ff033f0bce5d3b9eb14d25df86996a0ab51b73c4ea937523d51bc827b1547d`.
- Type checking and 56 automated tests passed.
- The exact 0.2.0 VSIX passed the real VS Code host test, including SMARTS rendering
  and SMILES regression checks. Packaging tests now select the manifest version
  explicitly so older VSIX artifacts cannot be tested accidentally.
- CI passed on Linux, Windows, macOS and VS Code 1.95.0:
  https://github.com/Reonarudo/smiles-markdown-preview/actions/runs/36582200666

## Marketplace

Published on 2026-09-30:
https://marketplace.visualstudio.com/items?itemName=ReoX86.smiles-structure-preview

Version 0.2.0 installed successfully from Marketplace in an isolated temporary
VS Code profile. The installed renderer, worker, license, icon, CSS and SMARTS
screenshot match the release VSIX byte-for-byte. The normal profile was not modified.
