# SMILES Structure Preview 0.3.0 verification

Release: structures drawn by smiles-renderer 1.0.0. Publisher: ReoX86.
Source tag: `v0.3.0` (`fc710aa8d578bf832d4aa676bdfa386563a37edd`).

- GitHub release: https://github.com/Reonarudo/smiles-markdown-preview/releases/tag/v0.3.0
- VSIX: `smiles-structure-preview-0.3.0.vsix`, **782 866 bytes, 43 files**
  (0.2.0: 693 612 bytes, OpenChemLib bundled into the worker).
- SHA-256: `16f13262918347b9007ada33b318df54ad099a1ff5ac8bfd5ec0fb86c25da6ca`.
- Type checking and 42 unit tests passed.
- CI passed on Linux, Windows, macOS and VS Code 1.101.0:
  https://github.com/Reonarudo/smiles-markdown-preview/actions/runs/40134642069
- The release asset was downloaded, checked against the release's `SHA256SUMS`, and
  passed `npm run test:package -- <asset>` on VS Code 1.143.0 and 1.101.0.

## Marketplace

Published on 2026-10-24 with `npx vsce publish --packagePath <release asset>`, so the
Marketplace and GitHub carry the same bytes:
https://marketplace.visualstudio.com/items?itemName=ReoX86.smiles-structure-preview

- Listing: 0.3.0 has engine `^1.101.0`; 0.2.0 and 0.1.0 keep `^1.95.0`.
- Installed by ID into an isolated temporary profile with VS Code 1.143.0's CLI. The
  installed files equal the release asset; `package.json` differs only by the
  `__metadata` the installer adds.
- The real extension-host test passed against the Marketplace-installed copy on
  VS Code 1.143.0 and 1.101.0.
- VS Code 1.95.0 installing by ID gets 0.2.0.

The normal profile was not modified.
