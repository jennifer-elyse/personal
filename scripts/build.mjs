import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import * as sass from 'sass';
import postcss from 'postcss';
import autoprefixer from 'autoprefixer';

const root = fileURLToPath(new URL('../', import.meta.url));
const source = `${root}src`;
const output = `${root}dist`;

await rm(output, { recursive: true, force: true });
await mkdir(`${output}/css`, { recursive: true });

for (const directory of ['images', 'data', 'js', 'downloads']) {
  await cp(`${source}/${directory}`, `${output}/${directory}`, { recursive: true });
}

for (const name of ['main', 'resume', 'trochoid']) {
  const compiled = sass.compile(`${source}/css/${name}.scss`, { style: 'expanded' });
  const result = await postcss([autoprefixer]).process(compiled.css, { from: undefined });
  await writeFile(`${output}/css/${name}.css`, result.css);
}

const pages = [
  ['home.html', 'index.html'],
  ['index.html', 'old/index.html'],
  ['resume.html', 'resume.html'],
];
for (const [name, dest] of pages) {
  const html = await readFile(`${source}/${name}`, 'utf8');
  const builtHtml = html
    .replaceAll('.scss"', '.css"')
    .replaceAll('"./css/', '"/css/')
    .replaceAll('"./js/', '"/js/');
  await mkdir(`${output}/${dest}`.replace(/[^/]+$/, ''), { recursive: true });
  await writeFile(`${output}/${dest}`, builtHtml);
}

await cp(`${root}clay-demo/assets`, `${output}/assets`, { recursive: true });
const clay = await readFile(`${root}clay-demo/index.html`, 'utf8');
const gate = `<nav class="site-links" aria-label="Site"><a href="/">Home</a><a href="/old">Old Site</a><a href="/resume">Resume</a><a href="/downloads/Clay-Studio-2026.11.16.zip">Clay Studio</a><a href="https://frostly.net">frostly.net</a><a href="https://pong-bong.netlify.app/">Pong Bong</a><a href="https://trochos.netlify.app/">Trochos</a></nav><p class="download-gate">Download <a href="/downloads/Clay-Studio-2026.11.16.zip">Clay Studio</a> to use Cursor, Codex, or Copilot. This page is read-only.</p><style>.site-links,.download-gate{font-family:Roboto,sans-serif}.site-links{display:flex;flex-wrap:wrap;gap:.8rem;padding:.55rem 1rem;background:#fff;border-bottom:1px solid #eadfce}.site-links a,.download-gate a{color:#9a2758}.download-gate{margin:0;padding:.7rem 1rem;background:#fff6ea;color:#3d2a22}#root .clay-shell{height:calc(100vh - 5.6rem);min-height:0}</style>`;
const studio = clay
  .replace('<html lang="en">', '<html lang="en" data-clay="download">')
  .replace('<div id="root"></div>', `${gate}<div id="root" inert></div>`);
await mkdir(`${output}/clay`, { recursive: true });
await writeFile(`${output}/clay/index.html`, studio);

// A missing local asset must fail the build rather than ship a broken sticker.
const skills = JSON.parse(await readFile(`${output}/data/skillz.json`, 'utf8'));
for (const skill of skills.skill) {
  if (!skill.imgSrc.startsWith('/images/')) throw new Error(`Non-local image: ${skill.id}`);
  await readFile(`${output}${skill.imgSrc}`);
}
console.log(`Built the trochoid homepage with ${skills.skill.length} local sticker images.`);
