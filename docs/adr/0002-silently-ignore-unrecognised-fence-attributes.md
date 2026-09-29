# Unrecognised fence attributes are ignored silently

A SMILES fence whose attribute block contains an unknown key, an unknown alignment,
a duplicate key or malformed syntax still renders its structure; the offending
attributes are dropped and a line is written to the extension's output channel.
Losing a structure is a worse outcome for an author than a typo that quietly does
nothing, and a preview that grows warning banners is worse than one that quietly does
less.

## Considered options

This is the policy of the sibling
[pikchr-markdown-preview](https://github.com/Reonarudo/pikchr-markdown-preview)
(its ADR 0002), whose attribute parser this extension copies. The other sibling,
[gnuplot-markdown-preview](https://github.com/Reonarudo/gnuplot-markdown-preview),
also degrades silently since 0.2.5 but skips only the malformed field and logs
nothing. The sibling extensions share one attribute *grammar* — braces, quoted values,
the same `alt` and `caption` spellings — so that an author writing several kinds of
fence in one document need remember only one syntax. Pikchr's variant was chosen for
its output-channel feedback.

## Consequences

The parser must be total: it may not throw on any input. VS Code applies markdown-it
plugins inside a `try`/`catch` and silently drops a plugin that throws, so an
exception would not degrade a single fence — it would remove the entire extension from
the preview, taking every structure in the document with it.

Because malformed attributes produce no visible feedback, a fence with a broken
attribute block is still *claimed* rather than delegated: it renders as a bare
structure. Falling through to another renderer would show the author a raw SMILES
string.

Reversing this later is a breaking change — documents written against a forgiving
parser begin erroring the day it becomes strict.
