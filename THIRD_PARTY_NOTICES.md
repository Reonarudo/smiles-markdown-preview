# Third-party notices

The extension's original TypeScript, tests, build scripts, and artwork are MIT
licensed (see `LICENSE`). This does not relicense bundled software.

## SMILES renderer

Structures are drawn by
[smiles-renderer](https://github.com/Reonarudo/smiles-renderer) (MIT), shipped in
this extension under `node_modules/@reonarudo/smiles-renderer/`. Its own
`THIRD_PARTY_NOTICES.md` and `licenses/` directory give its dependencies'
provenance and licenses; keep them with any redistribution.

## OpenChemLib

[`openchemlib`](https://www.npmjs.com/package/openchemlib), the JavaScript build of
OpenChemLib by Actelion Pharmaceuticals Ltd and the cheminfo contributors, parses
SMILES and SMARTS, generates 2D coordinates and depicts each structure as SVG. It
is shipped under `node_modules/openchemlib/` with its **BSD 3-Clause License**.
Upstream repositories: <https://github.com/cheminfo/openchemlib-js> (JavaScript
build) and <https://github.com/Actelion/openchemlib> (Java source). Its unminified
debug build and its `resources.json`, which the renderer never loads, are left out.

## xmldom

[`@xmldom/xmldom`](https://github.com/xmldom/xmldom), used by the renderer's SVG
sanitizer, is shipped under `node_modules/@xmldom/xmldom/` with its MIT license.

The exact versions are locked in `package-lock.json`.
