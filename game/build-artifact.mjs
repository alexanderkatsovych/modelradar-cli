#!/usr/bin/env node
// Derives game/artifact.html from game/index.html.
//
// The Artifact host wraps the uploaded file in its own <!doctype>/<head>/<body>
// skeleton, so a published page must be body-content only. index.html stays the
// single source of truth; this strips the document wrapper and nothing else.

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, 'index.html'), 'utf8');

const style = src.match(/<style>[\s\S]*?<\/style>/);
const body  = src.match(/<body>([\s\S]*?)<\/body>/);
if (!style || !body) {
  console.error('build-artifact: could not find <style> or <body> in index.html');
  process.exit(1);
}

const out = `<!-- Generated from game/index.html by build-artifact.mjs — do not edit. -->\n`
  + style[0] + '\n' + body[1].trim() + '\n';

// The wrapper is all that may be dropped; everything else must survive intact.
for (const needle of ['<canvas id="game">', 'GATE COMMANDER', 'function project(']) {
  if (!out.includes(needle)) {
    console.error(`build-artifact: expected content missing after strip: ${needle}`);
    process.exit(1);
  }
}
if (/<\/?(html|head|body|!doctype)/i.test(out)) {
  console.error('build-artifact: document wrapper survived the strip');
  process.exit(1);
}

writeFileSync(join(here, 'artifact.html'), out);
console.log(`build-artifact: wrote artifact.html (${out.length} bytes)`);
