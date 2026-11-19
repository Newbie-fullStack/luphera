import { readFileSync } from 'node:fs';
import yaml from 'js-yaml';

const text = readFileSync('../../docs/API.md', 'utf8');
const blocks = [...text.matchAll(/```yaml\n([\s\S]*?)```/g)].map((m) => m[1]);

if (blocks.length !== 1) {
  console.error(`Expected exactly one yaml block, found ${blocks.length}`);
  process.exit(1);
}

const spec = yaml.load(blocks[0]);
const refs = new Set();

const walk = (node) => {
  if (Array.isArray(node)) return node.forEach(walk);
  if (node === null || typeof node !== 'object') return;

  for (const [key, value] of Object.entries(node)) {
    if (key === '$ref' && typeof value === 'string') refs.add(value);
    else walk(value);
  }
};

walk(spec);

const schemas = new Set(Object.keys(spec.components.schemas));
const responses = new Set(Object.keys(spec.components.responses));
const missing = [];

for (const ref of refs) {
  const match = /^#\/components\/(schemas|responses)\/(.+)$/.exec(ref);
  if (match === null) {
    missing.push(ref);
    continue;
  }

  const [, kind, name] = match;
  const known = kind === 'schemas' ? schemas : responses;

  if (!known.has(name)) missing.push(ref);
}

console.log(`paths=${Object.keys(spec.paths).length} schemas=${schemas.size} refs=${refs.size}`);

if (missing.length > 0) {
  console.error('Broken refs:', missing.join(', '));
  process.exit(1);
}

console.log('OpenAPI block is consistent');
