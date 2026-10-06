/* eslint-disable no-console */
/**
 * Smoke check for the validation layer.
 *
 * Requiring a validator only proves the module parses; zod v4 builds schemas
 * lazily, so a schema built from a missing helper (e.g. `gender: undefined`)
 * only explodes on the first `parse`. This walks every exported schema object
 * and runs `.parse({})` / `.safeParse({})` against each so shape errors surface.
 *
 * Usage: node scripts/checkValidators.js
 */
const path = require('path');
const fs = require('fs');

const dir = path.join(__dirname, '..', 'src', 'validators');

let checked = 0;
const failures = [];

function probe(label, schema) {
  if (!schema || typeof schema.parse !== 'function') return;
  checked += 1;
  try {
    schema.safeParse({});
  } catch (error) {
    failures.push(`${label}: ${error.message.split('\n')[0]}`);
  }
}

function walk(label, value, seen) {
  if (!value || typeof value !== 'object' || seen.has(value)) return;
  seen.add(value);

  if (typeof value.parse === 'function' && typeof value.safeParse === 'function') {
    probe(label, value);
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => walk(`${label}[${index}]`, item, seen));
    return;
  }

  for (const [key, child] of Object.entries(value)) walk(`${label}.${key}`, child, seen);
}

for (const file of fs.readdirSync(dir).filter((name) => name.endsWith('.validator.js')).sort()) {
  const label = file.replace('.validator.js', '');
  let loaded;
  try {
    loaded = require(path.join(dir, file));
  } catch (error) {
    failures.push(`${label}: require failed -> ${error.message.split('\n')[0]}`);
    continue;
  }
  walk(label, loaded, new Set());
}

if (failures.length) {
  console.error(`Validation layer check FAILED (${failures.length} of ${checked} schemas):`);
  failures.forEach((failure) => console.error(`  - ${failure}`));
  process.exit(1);
}

console.log(`Validation layer OK: ${checked} schemas built and probeable.`);