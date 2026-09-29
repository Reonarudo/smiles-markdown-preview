import type MarkdownItConstructor from 'markdown-it';
type MarkdownIt = InstanceType<typeof MarkdownItConstructor>;
import { SVG_ID, type Notation, type RenderResult } from './renderer';
import { parseAttributes, type FenceAttributes } from './attributes';
import { parseMolecules, type MoleculeLine } from './molecules';
import { randomBytes } from 'node:crypto';

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

export type Render = (source: string, notation: Notation) => RenderResult;
export type Report = (message: string) => void;

/**
 * Claim `smiles` and `smarts` fences and render each of their lines as a structure.
 *
 * Every fence we do not claim is delegated to whichever fence renderer was registered before us
 * (markdown-it's default, or another extension's, e.g. a Graphviz or Pikchr preview).
 */
export function markdownPlugin(md: MarkdownIt, render: Render, report: Report = () => {}): MarkdownIt {
  const original = md.renderer.rules.fence;
  // OpenChemLib writes the same id into every structure's <svg> and <style>, and a cached
  // structure can appear twice, so every occurrence gets its own.
  const session = randomBytes(6).toString('hex');
  let occurrence = 0;
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
      const result = render(molecule.smiles, notation);
      if (result.status !== 'success') {
        return { molecule, html: errorReport(md, describe(result, molecule.smiles, notation)) };
      }
      const svg = withClass(md, namespaceSvg(result.output, `sm-${session}-${++occurrence}`), extra);
      return { molecule, html: svg };
    });
    return wrap(md, row(md, structures), attributes);
  };
  return md;
}

/** Replace the fixed id OpenChemLib wrote on the root `<svg>` and in its `<style>` selectors. */
export function namespaceSvg(svg: string, id: string): string {
  return svg.replace(`id="${SVG_ID}"`, `id="${id}"`).replaceAll(`#${SVG_ID} `, `#${id} `);
}

/** Put our base class — and the author's, if any — on the root `<svg>`. */
function withClass(md: MarkdownIt, svg: string, extra: string | undefined): string {
  const classes = extra ? `${BASE_CLASS} ${extra}` : BASE_CLASS;
  return svg.replace(/^<svg\b/, `<svg class="${md.utils.escapeHtml(classes)}"`);
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
function describe(result: Exclude<RenderResult, { status: 'success' }>, smiles: string, notation: Notation): string {
  const wording = WORDING[notation];
  if (result.status === 'timeout') {
    const seconds = (result.budget / 1000).toLocaleString('en-US', { maximumFractionDigits: 1 });
    return `Depiction took longer than ${seconds} s (smiles.depictionTimeout). ` +
      `Shorten the ${wording.line}, split the ${wording.whole}, or raise the limit.`;
  }
  if (result.status === 'unavailable') {
    return `The ${wording.name} renderer could not start: ${result.reason}. It will retry on the next render.`;
  }
  // Echo the string with a caret under the position OpenChemLib names, so the author need not
  // count characters.
  let text = result.message;
  const position = Number(/\bposition:\s*(\d+)/i.exec(text)?.[1]);
  if (position >= 0 && position <= smiles.length) {
    text += `\n\n${smiles}\n${' '.repeat(position)}^`;
  } else {
    text += `\n\n${smiles}`;
  }
  return text;
}

function errorReport(md: MarkdownIt, text: string): string {
  return `<div class="smiles-error" role="alert"><pre>${md.utils.escapeHtml(text)}</pre></div>\n`;
}
