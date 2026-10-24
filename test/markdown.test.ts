import { test } from 'node:test';
import assert from 'node:assert/strict';
import MarkdownIt from 'markdown-it';
import type { RenderResult } from '@reonarudo/smiles-renderer';
import { markdownPlugin } from '../src/markdown';

/** The shape of the library's root: a viewBox, its class and its id, no size. */
const svg = (inner = '', width = 75) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} 36" class="smiles" id="smiles-0000abcd-root">${inner}</svg>`;
const structure = (output = svg()): RenderResult => ({ status: 'success', output, notes: [] });

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
  assert.match(md.render('```smiles\nc1ccccc1\n```'), /^<svg width="58\.5px" xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 58\.5 36" class="smiles" id="smiles-0000abcd-root"><\/svg>\n?$/);
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
  assert.match(html, /^<svg [^>]*class="smiles wide &amp;quot;x&quot; onload=&quot;y" id="[^"]+"><g class="smiles"><\/g><\/svg>/);
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
  assert.match(html, /^<svg [^>]*class="smiles"/);
  assert.equal(reported.length, 1);
});

test('several lines become a row of molecules, each label beneath its structure', () => {
  const md = markdownPlugin(new MarkdownIt(), ({ source }) => structure(svg(`<text>${source}</text>`)));
  const html = md.render('```smiles\nCCO ethanol\nCCC\n```');
  assert.match(html, /^<div class="smiles-row"><div class="smiles-molecule"><svg [^>]*><text>CCO<\/text><\/svg><span class="smiles-label">ethanol<\/span><\/div><div class="smiles-molecule"><svg [^>]*><text>CCC<\/text><\/svg><\/div><\/div>/);
});

test('one labelled molecule is also a row, so the label sits beneath it', () => {
  const md = markdownPlugin(new MarkdownIt(), () => structure());
  assert.match(md.render('```smiles\nCCO ethanol\n```'), /^<div class="smiles-row"><div class="smiles-molecule"><svg[^>]*><\/svg><span class="smiles-label">ethanol<\/span><\/div><\/div>/);
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
  assert.equal((html.match(/<svg /g) ?? []).length, 2);
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
