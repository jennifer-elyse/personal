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

for (const directory of ['images', 'data', 'js']) {
  await cp(`${source}/${directory}`, `${output}/${directory}`, { recursive: true });
}

for (const name of ['main', 'resume']) {
  const compiled = sass.compile(`${source}/css/${name}.scss`, { style: 'expanded' });
  const result = await postcss([autoprefixer]).process(compiled.css, { from: undefined });
  await writeFile(`${output}/css/${name}.css`, result.css);
}

for (const name of ['index', 'resume']) {
  const html = await readFile(`${source}/${name}.html`, 'utf8');
  const builtHtml = html
    .replaceAll('.scss"', '.css"')
    .replaceAll('"./css/', '"/css/')
    .replaceAll('"./js/', '"/js/')
    .replaceAll('"./index.html"', '"/"')
    .replaceAll('"./resume.html"', '"/resume"');
  await writeFile(`${output}/${name}.html`, builtHtml);
}

// A missing local asset must fail the build rather than ship a broken sticker.
const skills = JSON.parse(await readFile(`${output}/data/skillz.json`, 'utf8'));
for (const skill of skills.skill) {
  if (!skill.imgSrc.startsWith('/images/')) throw new Error(`Non-local image: ${skill.id}`);
  await readFile(`${output}${skill.imgSrc}`);
}
console.log(`Built both pages with ${skills.skill.length} local sticker images.`);
