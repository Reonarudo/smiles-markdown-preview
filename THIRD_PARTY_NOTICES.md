# Third-party notices and binary provenance

The extension's original TypeScript, tests, build scripts, and artwork are MIT
licensed (see `LICENSE`). This does not relicense bundled software.

## OpenChemLib 9.25.0

`dist/worker.js` bundles the npm package
[`openchemlib`](https://www.npmjs.com/package/openchemlib) 9.25.0, the JavaScript
build of OpenChemLib by Actelion Pharmaceuticals Ltd and the cheminfo contributors,
which parses SMILES, generates 2D coordinates and depicts the structure as SVG.

OpenChemLib is distributed under the **BSD 3-Clause License**; the full text is in
`licenses/OPENCHEMLIB-LICENSE`. Upstream repositories:
<https://github.com/cheminfo/openchemlib-js> (JavaScript build) and
<https://github.com/Actelion/openchemlib> (Java source).

npm integrity
`sha512-FGTaZLJRTGXNC7khx8QvX/EiQBHpH1ncUbT7YXDJhw/Y/aDUKe5WrUIqTguMEtSs3GUHcRUjNUhfkpxulx2UXw==`.
The exact version is locked in `package-lock.json`; the test suite checks that the
installed package, the lock file, this notice and the licence copy agree.
