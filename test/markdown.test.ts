import { test } from 'node:test';
import assert from 'node:assert/strict';
import MarkdownIt from 'markdown-it';
import type { RenderResult } from '@reonarudo/smiles-renderer';
import { markdownPlugin } from '../src/markdown';
import { rendering } from './helpers';

/** The shape of the library's root: a viewBox, its class and its id, no size. */
const svg = (inner = '', width = 75) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} 36" class="smiles" id="smiles-0000abcd-root">${inner}</svg>`;
const structure = (output = svg()): RenderResult => ({ status: 'success', output, notes: [] });

const ICON_CODE = '<svg class="smiles-icon-code" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">' +
  '<path d="M5.7 3.3 1 8l4.7 4.7.9-.9L2.8 8l3.8-3.8zM10.3 3.3l-.9.9L13.2 8l-3.8 3.8.9.9L15 8z"/></svg>';
const ICON_GRAPH = '<svg class="smiles-icon-graph" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.2">' +
  '<rect x="1.5" y="1.5" width="5" height="3.5" rx=".5"/><rect x="9.5" y="1.5" width="5" height="3.5" rx=".5"/><rect x="5.5" y="11" width="5" height="3.5" rx=".5"/>' +
  '<path d="M4 5v3h8V5M8 8v3"/></svg>';
const TOGGLE = `<button type="button" class="smiles-toggle" aria-pressed="false" aria-label="Source view" title="Source view">${ICON_CODE}${ICON_GRAPH}</button>`;

test('claims exactly smiles fences and passes the bare SMILES string through', () => {
  let seen: unknown;
  const md = markdownPlugin(new MarkdownIt(), (input) => { seen = input; return structure(); });
  assert.match(md.render('```smiles\nCC(=O)O acetic acid\n```'), /<svg/);
  assert.deepEqual(seen, { source: 'CC(=O)O', notation: 'smiles' });
});

test('claims smarts fences and renders each line on its own, in the fence\'s notation', () => {
  const seen: [string, string][] = [];
  const md = markdownPlugin(new MarkdownIt(), ({ source, notation }) => { seen.push([source, notation]); return structure(); });
  md.render('```smarts\n[#6][OX2H] alcohol\n  [#7]\n```\n\n```smiles\nCCO\n```');
  assert.deepEqual(seen, [['[#6][OX2H]', 'smarts'], ['[#7]', 'smarts'], ['CCO', 'smiles']]);
});

test('the structure gets its natural width in pixels from the viewBox', () => {
  const md = markdownPlugin(new MarkdownIt(), () => structure(svg('', 58.5)));
  assert.equal(rendering(md.render('```smiles\nc1ccccc1\n```')), '<svg width="58.5px" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 58.5 36" class="smiles" id="smiles-0000abcd-root"></svg>');
});

test('a pattern carries the smarts class beside the base class and the author\'s', () => {
  const md = markdownPlugin(new MarkdownIt(), () => structure());
  assert.match(md.render('```smarts\n[#6]\n```'), /\bclass="smiles smarts" id=/);
  assert.match(md.render('```smarts {class="wide"}\n[#6]\n```'), /\bclass="smiles smarts wide" id=/);
  assert.match(md.render('```smiles\nC\n```'), /\bclass="smiles" id=/);
});

test('smarts fences take the same attributes, and report in their own words', () => {
  const md = markdownPlugin(new MarkdownIt(), () => ({ status: 'timeout', budget: 3000 }));
  assert.match(md.render('```smarts {caption="Carboxylic acid"}\n[CX3](=O)[OX2H1]\n```'),
    /Shorten the SMARTS pattern, split the pattern, or raise the limit\.[\s\S]*<figcaption>Carboxylic acid<\/figcaption>/);
  const empty = markdownPlugin(new MarkdownIt(), () => structure());
  assert.match(empty.render('```smarts\n```'), /The fence is empty\. Write one SMARTS pattern per line\./);
  const unavailable = markdownPlugin(new MarkdownIt(), () => ({ status: 'unavailable', reason: 'x' }));
  assert.match(unavailable.render('```smarts\n[#6]\n```'), /The SMARTS renderer could not start/);
});

test('preserves unrelated fences byte for byte including highlighting', () => {
  for (const language of ['smi', 'SMILES', 'SMARTS', 'smiles extra', 'smarts extra', 'smirks', 'graphviz', 'pikchr', 'swift', '']) {
    const input = '```' + language + '\nCCO\n```';
    const options = { highlight: () => '<b>highlight</b>' };
    const delegated = markdownPlugin(new MarkdownIt(options), () => { throw new Error('wrong fence'); });
    assert.equal(delegated.render(input), new MarkdownIt(options).render(input), language);
  }
});

test('a previously registered fence renderer still receives its fences, and supplies the source view of ours', () => {
  const md = new MarkdownIt();
  md.renderer.rules.fence = () => '<div class="other-extension"></div>';
  markdownPlugin(md, () => structure());
  assert.equal(md.render('```graphviz\ndigraph {}\n```'), '<div class="other-extension"></div>');
  const html = md.render('```smiles\nCCO\n```');
  assert.match(html, /<svg/);
  assert.match(html, /<\/div><div class="other-extension"><\/div><\/div>\n$/);
});

// The DOM contract (docs/source-toggle-spec.md in onnx-markdown-preview, section 2): asserted
// exactly once, here.
test('every claimed fence is wrapped: toggle first, rendering slot, then the delegated source <pre>', () => {
  const md = markdownPlugin(new MarkdownIt(), () => structure());
  assert.equal(md.render('```smiles\nCCO\n```'),
    `<div class="smiles-fence code-line" data-line="0" data-fence-key="78d3e18a">${TOGGLE}` +
    `<div class="smiles-rendering">${svg().replace('<svg ', '<svg width="75px" ')}</div>` +
    '<pre><code class="language-smiles">CCO\n</code></pre>\n</div>\n');
  // A smarts fence is claimed too, and its source view carries its own word.
  assert.match(md.render('```smarts\n[#6]\n```'),
    /^<div class="smiles-fence code-line" data-line="0" data-fence-key="[0-9a-f]{8}"><button type="button" class="smiles-toggle"[\s\S]*<\/div><pre><code class="language-smarts">\[#6\]\n<\/code><\/pre>\n<\/div>\n$/);
});

test('the wrapper carries code-line and data-line from the token map, and neither without a map', () => {
  const md = markdownPlugin(new MarkdownIt(), () => structure());
  const tokens = md.parse('# Title\n\n```smiles\nCCO\n```', {});
  assert.match(md.renderer.render(tokens, md.options, {}), /<div class="smiles-fence code-line" data-line="2" data-fence-key="78d3e18a">/);
  for (const token of tokens) token.map = null;
  const bare = md.renderer.render(tokens, md.options, {});
  assert.match(bare, /<div class="smiles-fence" data-fence-key="78d3e18a">/);
  assert.doesNotMatch(bare, /data-line/);
});

test('the fence key is FNV-1a of the exact body', () => {
  const md = markdownPlugin(new MarkdownIt(), () => structure());
  assert.match(md.render('```smiles\nCCO\n```'), /data-fence-key="78d3e18a"/);
  assert.match(md.render('```smiles\n```'), /data-fence-key="811c9dc5"/);
  // The info string and attributes play no part: same body, same key, in either notation.
  assert.match(md.render('```smiles {caption="c"}\nCCO\n```'), /data-fence-key="78d3e18a"/);
  assert.match(md.render('```smarts\nCCO\n```'), /data-fence-key="78d3e18a"/);
  assert.match(md.render('```smiles\nCCO \n```'), /data-fence-key="fdc287d2"/);
});

test('the source <pre> is the delegated fence rule output, with VS Code-style highlighting kept verbatim', () => {
  const highlighted = markdownPlugin(new MarkdownIt({ highlight: (code, lang) => `<i class="${lang}">${code.trim()}</i>` }), () => structure());
  assert.match(highlighted.render('```smiles {alt="x"}\nCCO\n```'), /<\/div><pre><code class="language-smiles"><i class="smiles">CCO<\/i><\/code><\/pre>\n<\/div>\n$/);
  // VS Code's shell keeps its highlighting and `dir`, but not the scroll-sync class and line,
  // which the wrapper carries for the whole fence.
  const vscode = new MarkdownIt();
  vscode.renderer.rules.fence = (tokens, index) =>
    `<pre><code data-line="${tokens[index]!.map![0]}" class="code-line language-smarts" dir="auto">${tokens[index]!.content}</code></pre>\n`;
  markdownPlugin(vscode, () => structure());
  assert.match(vscode.render('```smarts\n[#6]\n```'), /<\/div><pre><code class="language-smarts" dir="auto">\[#6\]\n<\/code><\/pre>\n<\/div>\n$/);
  // Bare markdown-it with no fence rule at all: a hand-built, escaped fallback.
  const md = new MarkdownIt();
  delete md.renderer.rules.fence;
  markdownPlugin(md, () => structure());
  assert.match(md.render('```smiles\nCCO <b>x</b>\n```'), /<\/div><pre><code class="language-smiles">CCO &lt;b&gt;x&lt;\/b&gt;\n<\/code><\/pre>\n<\/div>\n$/);
});

test('a multi-line fence is one wrapper: the row and its per-cell error card sit in the rendering slot', () => {
  const md = markdownPlugin(new MarkdownIt(), ({ source }) => source === 'bad'
    ? { status: 'failure', message: 'no', line: 1, column: 1 }
    : structure());
  const html = md.render('```smiles\nCCO\nbad\nCCC\n```');
  assert.equal((html.match(/<div class="smiles-fence /g) ?? []).length, 1);
  assert.equal((html.match(/<button /g) ?? []).length, 1);
  assert.match(rendering(html), /^<div class="smiles-row"><div class="smiles-molecule"><svg [^>]*><\/svg><\/div><div class="smiles-molecule"><div class="smiles-error" role="alert"><pre>no at line 2, column 1\n\nbad\n\^<\/pre><\/div>\n<\/div><div class="smiles-molecule"><svg [^>]*><\/svg><\/div><\/div>$/);
  assert.match(html, /<\/div><pre><code class="language-smiles">CCO\nbad\nCCC\n<\/code><\/pre>\n<\/div>\n$/);
});

test('the empty-fence error card is a claimed fence and gets the wrapper, with an empty source view', () => {
  const md = markdownPlugin(new MarkdownIt(), () => { throw new Error('must not render'); });
  assert.equal(md.render('```smiles\n```'),
    `<div class="smiles-fence code-line" data-line="0" data-fence-key="811c9dc5">${TOGGLE}` +
    '<div class="smiles-rendering"><div class="smiles-error" role="alert"><pre>The fence is empty. Write one SMILES string per line.</pre></div>\n</div>' +
    '<pre><code class="language-smiles"></code></pre>\n</div>\n');
});

test('missing fence renderer falls back without throwing', () => {
  const md = new MarkdownIt();
  delete md.renderer.rules.fence;
  const expected = md.render('```swift\n42\n```');
  markdownPlugin(md, () => structure());
  assert.equal(md.render('```swift\n42\n```'), expected);
});

test('alt becomes an accessible name, caption a figure, align a class', () => {
  const md = markdownPlugin(new MarkdownIt(), () => structure());
  const html = md.render('```smiles {alt="Ethanol" caption="Figure 1" align="center"}\nCCO\n```');
  assert.match(html, /<figure class="smiles-figure smiles-align-center">/);
  assert.match(html, /<div role="img" aria-label="Ethanol"><svg [^>]*class="smiles"[^>]*><\/svg><\/div>/);
  assert.match(html, /<figcaption>Figure 1<\/figcaption>/);
  // The caption must sit outside the image role to stay readable by assistive technology.
  assert.ok(html.indexOf('</div>') < html.indexOf('<figcaption>'));
});

test('align alone still produces a figure to carry the class', () => {
  const md = markdownPlugin(new MarkdownIt(), () => structure());
  assert.match(md.render('```smiles {align="right"}\nCCO\n```'),
    /<figure class="smiles-figure smiles-align-right"><svg [^>]*><\/svg><\/figure>/);
});

test('class lands on the root svg beside the base class, escaped', () => {
  const md = markdownPlugin(new MarkdownIt(), () => structure(svg('<g class="smiles"></g>')));
  const html = md.render('```smiles {class="wide &quot;x\\" onload=\\"y"}\nCCO\n```');
  assert.match(rendering(html), /^<svg [^>]*class="smiles wide &amp;quot;x&quot; onload=&quot;y" id="[^"]+"><g class="smiles"><\/g><\/svg>$/);
});

test('attribute and label text is escaped, including quotes, markup and Markdown', () => {
  const md = markdownPlugin(new MarkdownIt(), () => structure());
  const html = md.render('```smiles {alt="<img src=x onerror=alert(1)>" caption="**bold** & \\"quoted\\""}\nCCO <b>bold</b>\n```');
  assert.doesNotMatch(html, /<img/);
  assert.doesNotMatch(html, /<b>/);
  assert.match(html, /aria-label="&lt;img src=x onerror=alert\(1\)&gt;"/);
  assert.match(html, /<figcaption>\*\*bold\*\* &amp; &quot;quoted&quot;<\/figcaption>/);
  assert.match(html, /<span class="smiles-label">&lt;b&gt;bold&lt;\/b&gt;<\/span>/);
});

test('malformed attributes are reported, never shown, and the structure still renders', () => {
  const reported: string[] = [];
  const md = markdownPlugin(new MarkdownIt(), () => structure(), (m) => reported.push(m));
  const html = md.render('```smiles {alt="unterminated}\nCCO\n```');
  assert.match(rendering(html), /^<svg [^>]*class="smiles"/);
  assert.equal(reported.length, 1);
});

test('several lines become a row of molecules, each label beneath its structure', () => {
  const md = markdownPlugin(new MarkdownIt(), ({ source }) => structure(svg(`<text>${source}</text>`)));
  const html = md.render('```smiles\nCCO ethanol\nCCC\n```');
  assert.match(rendering(html), /^<div class="smiles-row"><div class="smiles-molecule"><svg [^>]*><text>CCO<\/text><\/svg><span class="smiles-label">ethanol<\/span><\/div><div class="smiles-molecule"><svg [^>]*><text>CCC<\/text><\/svg><\/div><\/div>$/);
});

test('one labelled molecule is also a row, so the label sits beneath it', () => {
  const md = markdownPlugin(new MarkdownIt(), () => structure());
  assert.match(rendering(md.render('```smiles\nCCO ethanol\n```')), /^<div class="smiles-row"><div class="smiles-molecule"><svg[^>]*><\/svg><span class="smiles-label">ethanol<\/span><\/div><\/div>$/);
});

const fence = (source: string) => '# Before\n```smiles\n' + source + '\n```\nAfter';

test('a failure names the fence line and column, and quotes the string with a caret', () => {
  const md = markdownPlugin(new MarkdownIt(), () => ({ status: 'failure', message: 'dangling ring closure: 1', line: 1, column: 5 }));
  const html = md.render(fence('CCO\n  C1CC'));
  assert.match(html, /<div class="smiles-error" role="alert"><pre>dangling ring closure: 1 at line 2, column 7\n\nC1CC\n    \^<\/pre><\/div>/);
  assert.match(html, /<p>After<\/p>/);
});

test('a failure without a column names the line and quotes the string without a caret, escaped', () => {
  const md = markdownPlugin(new MarkdownIt(), () => ({ status: 'failure', message: '<b>No atoms found.</b>', line: 1 }));
  assert.match(md.render(fence('CCO')), /<pre>&lt;b&gt;No atoms found\.&lt;\/b&gt; at line 1\n\nCCO<\/pre>/);
});

test('a throwing renderer becomes that line\'s report, and the document survives', () => {
  const md = markdownPlugin(new MarkdownIt(), () => { throw new Error('render after dispose'); });
  const html = md.render(fence('CCO'));
  assert.match(html, /<pre>render after dispose at line 1\n\nCCO<\/pre>/);
  assert.match(html, /<p>After<\/p>/);
});

test('an empty fence is reported without calling the renderer', () => {
  const md = markdownPlugin(new MarkdownIt(), () => { throw new Error('must not render'); });
  assert.match(md.render(fence('')), /<div class="smiles-error" role="alert"><pre>The fence is empty\. Write one SMILES string per line\.<\/pre><\/div>/);
});

test('a broken line in a row shows its report while the others still render', () => {
  const md = markdownPlugin(new MarkdownIt(), ({ source }) => source === 'bad'
    ? { status: 'failure', message: 'unknown element label found', line: 1, column: 1 }
    : structure());
  const html = md.render('```smiles\nCCO\nbad\nCCC\n```');
  // Counted in the rendering slot: the toggle's two glyphs are SVGs too.
  assert.equal((rendering(html).match(/<svg /g) ?? []).length, 2);
  assert.match(html, /<div class="smiles-molecule"><div class="smiles-error" role="alert"><pre>unknown element label found at line 2, column 1\n\nbad\n\^<\/pre><\/div>\n<\/div>/);
});

test('a timeout and an unavailable renderer have fixed wording', () => {
  const timeout = markdownPlugin(new MarkdownIt(), () => ({ status: 'timeout', budget: 3000 }));
  assert.match(timeout.render(fence('CCO')),
    /<div class="smiles-error" role="alert"><pre>Depiction took longer than 3 s \(smiles\.depictionTimeout\)\. Shorten the SMILES string, split the molecule, or raise the limit\.<\/pre><\/div>/);
  const fractional = markdownPlugin(new MarkdownIt(), () => ({ status: 'timeout', budget: 1500 }));
  assert.match(fractional.render(fence('CCO')), /longer than 1\.5 s/);
  const unavailable = markdownPlugin(new MarkdownIt(), () => ({ status: 'unavailable', reason: 'out of <memory>' }));
  assert.match(unavailable.render(fence('CCO')),
    /<pre>The SMILES renderer could not start: out of &lt;memory&gt;\. It will retry on the next render\.<\/pre>/);
});
