# No SVG sanitizer for OpenChemLib output

VS Code's Markdown preview does not sanitize plugin output — markdown-it runs with
`html: true` and the webview appends the result verbatim — so an extension that
emits untrusted SVG must sanitize it itself. We do not, because no author-controlled
text reaches the SVG. SMILES is a closed grammar of element symbols, bond symbols,
ring digits and bracket atoms; OpenChemLib parses it into a molecule graph, throws
on anything it does not recognise, and depicts the graph from its own tables. Every
`<text>` in the output is an element symbol, a charge, an isotope number or a fixed
stereo annotation; the only id is the one this extension passes in.

## Considered options

The sibling
[graphviz-markdown-preview](https://github.com/Reonarudo/graphviz-markdown-preview)
ships an allowlist sanitizer (its ADR 0001) because Graphviz copies `fontname` into
`font-family` unescaped. The sibling
[pikchr-markdown-preview](https://github.com/Reonarudo/pikchr-markdown-preview)
ships none (its ADR 0001), for the same reason as here: the renderer emits benign SVG
by construction. Maintaining an allowlist against OpenChemLib's output would be
permanent work against a threat that does not exist.

## Consequences

Text that reaches the preview from the *document* — the `alt`, `caption` and `class`
attributes and each molecule's label — must be HTML-escaped at the point of use.
There is no sanitizer behind that escaping to catch a mistake;
`test/markdown.test.ts` pins it.

OpenChemLib's invisible editor hit targets (`class="event"`) are stripped for size,
not safety. If a future OpenChemLib release lets SMILES carry free text into the
depiction (custom atom labels, for instance), this decision must be revisited before
the dependency is updated.
