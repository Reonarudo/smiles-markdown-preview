import type MarkdownItConstructor from 'markdown-it';
type MarkdownIt = InstanceType<typeof MarkdownItConstructor>;
import type { Notation, RenderInput, RenderResult } from '@reonarudo/smiles-renderer';
import { parseAttributes, type FenceAttributes } from './attributes';
import { parseMolecules, type MoleculeLine } from './molecules';

/** The class on every structure's root `<svg>`, so the preview stylesheet can select it. */
export const BASE_CLASS = 'smiles';

/**
 * `smiles` or `smarts`, alone or followed by an attribute block. First word only, case-sensitive;
 * the tag is the notation every line of the fence is parsed in.
 *
 * A fence whose block is malformed is still claimed: the attributes are dropped and the structure
 * renders bare, rather than falling through to another renderer as a raw string (ADR 0002).
 */
const CLAIMED = /^(smiles|smarts)(?:\s+\{|$)/;

/** How the error reports name what a line of each notation holds. */
const WORDING: Record<Notation, { name: string; line: string; whole: string }> = {
  smiles: { name: 'SMILES', line: 'SMILES string', whole: 'molecule' },
  smarts: { name: 'SMARTS', line: 'SMARTS pattern', whole: 'pattern' }
};

export type Render = (input: RenderInput) => RenderResult;
export type Report = (message: string) => void;

/**
 * Claim `smiles` and `smarts` fences and render each of their lines as a structure.
 *
 * Each line is its own render of the bare string, so the library draws it alone and unlabelled,
 * and the row, the labels and a failing line's report are this extension's HTML: a bad molecule
 * costs only its own cell, and the row wraps to the preview column.
 *
 * Every fence we do not claim is delegated to whichever fence renderer was registered before us
 * (markdown-it's default, or another extension's, e.g. a Graphviz or Pikchr preview).
 */
export function markdownPlugin(md: MarkdownIt, render: Render, report: Report = () => {}): MarkdownIt {
  const original = md.renderer.rules.fence;
  md.renderer.rules.fence = (tokens, index, options, env, self) => {
    const token = tokens[index]!;
    const info = token.info.trim();
    const claimed = CLAIMED.exec(info);
    if (!claimed) {
      return original
        ? original(tokens, index, options, env, self)
        : self.renderToken(tokens, index, options);
    }
    const { attributes, diagnostics } = parseAttributes(info);
    for (const diagnostic of diagnostics) {
      report(diagnostic);
    }
    const notation = claimed[1] as Notation;
    const molecules = parseMolecules(token.content);
    if (molecules.length === 0) {
      return errorReport(md, `The fence is empty. Write one ${WORDING[notation].line} per line.`);
    }
    // A pattern's structure also carries `smarts`, so it can be styled apart from a molecule.
    const extra = [notation === 'smarts' ? 'smarts' : undefined, attributes.class].filter(Boolean).join(' ') || undefined;
    const structures = molecules.map((molecule) => {
      let result: RenderResult;
      try {
        result = render({ source: molecule.smiles, notation });
      } catch (error) {
        // A throw inside a markdown-it rule would remove the whole extension from the preview.
        result = { status: 'failure', message: error instanceof Error ? error.message : String(error) };
      }
      if (result.status !== 'success') {
        return { molecule, html: errorReport(md, describe(result, molecule, notation)) };
      }
      return { molecule, html: sized(withClass(md, result.output, extra)) };
    });
    return wrap(md, row(md, structures), attributes);
  };
  return md;
}

/** The library's root `<svg viewBox="…" class="smiles" id="…">`, up to its closing `>`. */
const ROOT = /^<svg\b[^>]*>/;

/** Add the extra classes — `smarts`, the author's — escaped, beside the one the library put on the root. */
function withClass(md: MarkdownIt, svg: string, extra: string | undefined): string {
  if (!extra) return svg;
  return svg.replace(ROOT, (tag) => tag.replace(`class="${BASE_CLASS}"`, `class="${BASE_CLASS} ${md.utils.escapeHtml(extra)}"`));
}

/**
 * Give the structure its natural width, which the library leaves to the consumer: its SVG carries a
 * `viewBox` only, in OpenChemLib's pixels. Without it a small molecule would stretch to the column;
 * the stylesheet still scales a wide one down.
 */
function sized(svg: string): string {
  return svg.replace(ROOT, (tag) => {
    const width = Number(/\bviewBox="[^"]*?([\d.]+)\s+[\d.]+"/.exec(tag)?.[1]);
    return width > 0 ? tag.replace(/^<svg\b/, `<svg width="${width}px"`) : tag;
  });
}

/**
 * A single unlabelled molecule stands alone; several, or one with a label, sit side by side in a
 * row with each label beneath its structure.
 */
function row(md: MarkdownIt, structures: { molecule: MoleculeLine; html: string }[]): string {
  const [only] = structures;
  if (structures.length === 1 && only!.molecule.label === undefined) return only!.html;
  const cells = structures.map(({ molecule, html }) => {
    const label = molecule.label === undefined
      ? ''
      : `<span class="smiles-label">${md.utils.escapeHtml(molecule.label)}</span>`;
    return `<div class="smiles-molecule">${html}${label}</div>`;
  });
  return `<div class="smiles-row">${cells.join('')}</div>`;
}

function wrap(md: MarkdownIt, structure: string, attributes: FenceAttributes): string {
  const escape = md.utils.escapeHtml;
  let html = structure;
  if (attributes.alt !== undefined) {
    // `role="img"` sits inside the figure so that a caption stays outside the image role and
    // remains available to assistive technology.
    html = `<div role="img" aria-label="${escape(attributes.alt)}">${html}</div>`;
  }
  if (attributes.caption === undefined && attributes.align === undefined) {
    return html;
  }
  const classes = attributes.align
    ? `smiles-figure smiles-align-${attributes.align}`
    : 'smiles-figure';
  const caption = attributes.caption === undefined
    ? ''
    : `<figcaption>${escape(attributes.caption)}</figcaption>`;
  return `<figure class="${classes}">${html}${caption}</figure>`;
}

/** The text of the error report shown in place of one structure. */
function describe(result: Exclude<RenderResult, { status: 'success' }>, molecule: MoleculeLine, notation: Notation): string {
  const wording = WORDING[notation];
  if (result.status === 'timeout') {
    const seconds = (result.budget / 1000).toLocaleString('en-US', { maximumFractionDigits: 1 });
    return `Depiction took longer than ${seconds} s (smiles.depictionTimeout). ` +
      `Shorten the ${wording.line}, split the ${wording.whole}, or raise the limit.`;
  }
  if (result.status === 'unavailable') {
    return `The ${wording.name} renderer could not start: ${result.reason}. It will retry on the next render.`;
  }
  // The library saw the string alone, so its column counts from the string's first character; the
  // author's counts from the start of the fence line.
  const { smiles } = molecule;
  const column = result.column;
  const where = column === undefined
    ? `at line ${molecule.line}`
    : `at line ${molecule.line}, column ${molecule.offset + column}`;
  // Echo the string with a caret under the column, so the author need not count characters.
  const caret = column !== undefined && column >= 1 && column <= smiles.length + 1
    ? `\n${' '.repeat(column - 1)}^`
    : '';
  return `${result.message} ${where}\n\n${smiles}${caret}`;
}

function errorReport(md: MarkdownIt, text: string): string {
  return `<div class="smiles-error" role="alert"><pre>${md.utils.escapeHtml(text)}</pre></div>\n`;
}
