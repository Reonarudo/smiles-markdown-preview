# SMILES Structure Preview 0.1.0 verification

Release date: 2026-09-29. Personal publisher: ReoX86.
Identifier: `ReoX86.smiles-structure-preview`.

- Source tag: `v0.1.0` (`3f70af5`).
- GitHub release: https://github.com/Reonarudo/smiles-markdown-preview/releases/tag/v0.1.0
- VSIX: `smiles-structure-preview-0.1.0.vsix`.
- SHA-256: `e4ef853652f36f2b79cef2f1e64e53e3bc6ff03bc4dca68c78c43bc24faf3f64`.

## Validation

- Type checking and all 48 automated tests passed.
- The packaged VSIX passed the real VS Code host test in an isolated temporary profile.
- CI passed on Linux, macOS, Windows and the minimum supported VS Code 1.95.0:
  https://github.com/Reonarudo/smiles-markdown-preview/actions/runs/36557773072
- Windows initially converted the upstream license to CRLF. `.gitattributes` now
  preserves its original bytes and the exact-copy test passes unchanged.
- The packaged renderer, worker, upstream license, icon and CSS match the tested files.

## Marketplace

Published and verified:
https://marketplace.visualstudio.com/items?itemName=ReoX86.smiles-structure-preview

Version 0.1.0 installed successfully from Marketplace in an isolated temporary
VS Code profile. Its renderer, worker, license, icon and CSS match the released
VSIX byte-for-byte. The normal VS Code profile was not changed.
