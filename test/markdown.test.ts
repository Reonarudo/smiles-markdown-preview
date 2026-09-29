import { test } from 'node:test';
import assert from 'node:assert/strict';
import MarkdownIt from 'markdown-it';
import { markdownPlugin, namespaceSvg } from '../src/markdown';
import type { RenderResult } from '../src/renderer';

const structure = (output = '<svg id="ocl"><style> #ocl text {} </style></svg>'): RenderResult => ({ status: 'success', output });

test('claims exactly smiles fences and passes the SMILES string through', () => {
  let seen = '';
  const md = markdownPlugin(new MarkdownIt(), (smiles) => { seen = smiles; return structure(); });
  assert.match(md.render('```smiles\nCC(=O)O\n```'), /<svg/);
  assert.equal(seen, 'CC(=O)O');
});

test('preserves unrelated fences byte for byte including highlighting', () => {
  for (const language of ['smi', 'SMILES', 'smiles extra', 'graphviz', 'pikchr', 'swift', '']) {
    const input = '```' + language + '\nCCO\n```';
    const options = { highlight: () => '<b>highlight</b>' };
    const delegated = markdownPlugin(new MarkdownIt(options), () => { throw new Error('wrong fence'); });
    assert.equal(delegated.render(input), new MarkdownIt(options).render(input), language);
  }
});

test('a previously registered fence renderer still receives its fences', () => {
  const md = new MarkdownIt();
  md.renderer.rules.fence = () => '<div class="other-extension"></div>';
  markdownPlugin(md, () => structure());
  assert.equal(md.render('```graphviz\ndigraph {}\n```'), '<div class="other-extension"></div>');
  assert.match(md.render('```smiles\nCCO\n```'), /<svg/);
});

test('missing fence renderer falls back without throwing', () => {
  const md = new MarkdownIt();
  delete md.renderer.rules.fence;
  const expected = md.render('```swift\n42\n```');
  markdownPlugin(md, () => structure());
  assert.equal(md.render('```swift\n42\n```'), expected);
});

test('a bare fence emits the structure with the smiles class and no wrapper', () => {
  const md = markdownPlugin(new MarkdownIt(), () => structure('<svg id="ocl" width="10px"><g/></svg>'));
  assert.match(md.render('```smiles\nCCO\n```'), /^<svg class="smiles" id="sm-[0-9a-f]{12}-1" width="10px"><g\/><\/svg>\n?$/);
});

test('alt becomes an accessible name, caption a figure, align a class', () => {
  const md = markdownPlugin(new MarkdownIt(), () => structure('<svg id="ocl"></svg>'));
  const html = md.render('```smiles {alt="Ethanol" caption="Figure 1" align="center"}\nCCO\n```');
  assert.match(html, /<figure class="smiles-figure smiles-align-center">/);
  assert.match(html, /<div role="img" aria-label="Ethanol"><svg class="smiles" id="[^"]+"><\/svg><\/div>/);
  assert.match(html, /<figcaption>Figure 1<\/figcaption>/);
  // The caption must sit outside the image role to stay readable by assistive technology.
  assert.ok(html.indexOf('</div>') < html.indexOf('<figcaption>'));
});

test('align alone still produces a figure to carry the class', () => {
  const md = markdownPlugin(new MarkdownIt(), () => structure('<svg id="ocl"></svg>'));
  assert.match(md.render('```smiles {align="right"}\nCCO\n```'),
    /<figure class="smiles-figure smiles-align-right"><svg class="smiles" id="[^"]+"><\/svg><\/figure>/);
});

test('class lands on the root svg beside the base class, escaped', () => {
  const md = markdownPlugin(new MarkdownIt(), () => structure('<svg id="ocl"><g></g></svg>'));
  const html = md.render('```smiles {class="wide &quot;x\\" onload=\\"y"}\nCCO\n```');
  assert.match(html, /^<svg class="smiles wide &amp;quot;x&quot; onload=&quot;y" id="[^"]+"><g><\/g><\/svg>/);
});

test('attribute and label text is escaped, including quotes, markup and Markdown', () => {
  const md = markdownPlugin(new MarkdownIt(), () => structure('<svg id="ocl"></svg>'));
  const html = md.render('```smiles {alt="<img src=x onerror=alert(1)>" caption="**bold** & \\"quoted\\""}\nCCO <b>bold</b>\n```');
  assert.doesNotMatch(html, /<img/);
  assert.doesNotMatch(html, /<b>/);
  assert.match(html, /aria-label="&lt;img src=x onerror=alert\(1\)&gt;"/);
  assert.match(html, /<figcaption>\*\*bold\*\* &amp; &quot;quoted&quot;<\/figcaption>/);
  assert.match(html, /<span class="smiles-label">&lt;b&gt;bold&lt;\/b&gt;<\/span>/);
});

test('malformed attributes are reported, never shown, and the structure still renders', () => {
  const reported: string[] = [];
  const md = markdownPlugin(new MarkdownIt(), () => structure('<svg id="ocl"></svg>'), (m) => reported.push(m));
  const html = md.render('```smiles {alt="unterminated}\nCCO\n```');
  assert.match(html, /^<svg class="smiles" id="[^"]+"><\/svg>/);
  assert.equal(reported.length, 1);
});

test('several lines become a row of molecules, each label beneath its structure', () => {
  const md = markdownPlugin(new MarkdownIt(), (smiles) => structure(`<svg id="ocl"><text>${smiles}</text></svg>`));
  const html = md.render('```smiles\nCCO ethanol\nCCC\n```');
  assert.match(html, /^<div class="smiles-row"><div class="smiles-molecule"><svg class="smiles" id="[^"]+"><text>CCO<\/text><\/svg><span class="smiles-label">ethanol<\/span><\/div><div class="smiles-molecule"><svg class="smiles" id="[^"]+"><text>CCC<\/text><\/svg><\/div><\/div>/);
});

test('one labelled molecule is also a row, so the label sits beneath it', () => {
  const md = markdownPlugin(new MarkdownIt(), () => structure('<svg id="ocl"></svg>'));
  assert.match(md.render('```smiles\nCCO ethanol\n```'), /^<div class="smiles-row"><div class="smiles-molecule"><svg[^>]*><\/svg><span class="smiles-label">ethanol<\/span><\/div><\/div>/);
});

test('two identical fences in one document get distinct ids that their styles reference', () => {
  const md = markdownPlugin(new MarkdownIt(), () => structure());
  const html = md.render('```smiles\nCCO\n```\n\n```smiles\nCCO\n```');
  const ids = [...html.matchAll(/<svg class="smiles" id="([^"]+)"/g)].map((m) => m[1]!);
  const refs = [...html.matchAll(/<style> #([^ ]+) text/g)].map((m) => m[1]!);
  assert.equal(ids.length, 2);
  assert.notEqual(ids[0], ids[1]);
  assert.deepEqual(refs, ids);
  assert.doesNotMatch(html, /ocl/);
});

test('namespaceSvg replaces the root id and every style selector, nothing else', () => {
  const svg = '<svg id="ocl"><style> #ocl text {} #ocl line {} </style><text>ocl</text></svg>';
  assert.equal(namespaceSvg(svg, 'x'), '<svg id="x"><style> #x text {} #x line {} </style><text>ocl</text></svg>');
});

const fence = (source: string) => '# Before\n```smiles\n' + source + '\n```\nAfter';

test('a failure quotes the message and the string with a caret at the named position', () => {
  const md = markdownPlugin(new MarkdownIt(), () => ({ status: 'failure', message: 'dangling ring closure: 1; position:4' }));
  const html = md.render(fence('C1CC'));
  assert.match(html, /<div class="smiles-error" role="alert"><pre>dangling ring closure: 1; position:4\n\nC1CC\n    \^<\/pre><\/div>/);
  assert.match(html, /<p>After<\/p>/);
});

test('a failure naming no position, or one past the string, quotes the string without a caret', () => {
  const md = markdownPlugin(new MarkdownIt(), () => ({ status: 'failure', message: '<b>No atoms found.</b> position:99' }));
  assert.match(md.render(fence('CCO')), /<pre>&lt;b&gt;No atoms found\.&lt;\/b&gt; position:99\n\nCCO<\/pre>/);
});

test('an empty fence is reported without calling the renderer', () => {
  const md = markdownPlugin(new MarkdownIt(), () => { throw new Error('must not render'); });
  assert.match(md.render(fence('')), /<div class="smiles-error" role="alert"><pre>The fence is empty\. Write one SMILES string per line\.<\/pre><\/div>/);
});

test('a broken line in a row shows its report while the others still render', () => {
  const md = markdownPlugin(new MarkdownIt(), (smiles) => smiles === 'bad'
    ? { status: 'failure', message: 'unknown element label found. Position:0' }
    : structure());
  const html = md.render('```smiles\nCCO\nbad\nCCC\n```');
  assert.equal((html.match(/<svg class="smiles"/g) ?? []).length, 2);
  assert.match(html, /<div class="smiles-molecule"><div class="smiles-error" role="alert"><pre>unknown element label found\. Position:0\n\nbad\n\^<\/pre><\/div>\n<\/div>/);
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
