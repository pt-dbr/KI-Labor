import {cp, mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const destination = new URL('../dist/', import.meta.url);
await mkdir(destination, {recursive: true});
for (const entry of ['index.html', 'style.css', 'app.mjs', 'expert.mjs', 'if-pe.png', 'images.mjs', 'ml.mjs', 'vendor', 'model']) {
  await cp(root + entry, new URL(entry, destination), {recursive: true});
}
console.log('Produktionsdateien liegen in dist/.');
