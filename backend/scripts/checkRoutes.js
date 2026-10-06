/* eslint-disable no-console */
/**
 * Boots every sub-router in-process and reports the fully-qualified route table.
 *
 * Catches the class of bug where a route points at a controller export that does
 * not exist (`undefined` in the handler chain), which otherwise only surfaces as
 * a 500 when a client happens to call that endpoint.
 *
 * Express 5 does not expose mount paths on a router layer, so the mount table
 * is read from `src/routes/index.js` rather than guessed from the stack.
 *
 * Usage: node scripts/checkRoutes.js
 */
process.env.NODE_ENV = process.env.NODE_ENV || 'test';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const routesIndex = path.join(ROOT, 'src', 'routes', 'index.js');
const controllersDir = path.join(ROOT, 'src', 'controllers');

/* Mount table, parsed from the router index so paths are authoritative. */
const source = fs.readFileSync(routesIndex, 'utf8');
const mounts = [...source.matchAll(/router\.use\(\s*'([^']+)'\s*,\s*require\('([^']+)'\)\s*\)/g)].map(
  ([, mountPath, modulePath]) => ({ mountPath, modulePath }),
);

if (!mounts.length) {
  console.error('No router.use() mounts found in src/routes/index.js');
  process.exit(1);
}

const problems = [];
const table = [];

/** Express 5 wraps every handler; the callable is on `.handle`. */
function handlersOf(route) {
  return (route.stack || []).map((layer) => (typeof layer === 'function' ? layer : layer.handle));
}

for (const { mountPath, modulePath } of mounts) {
  const full = path.resolve(path.dirname(routesIndex), `${modulePath}.js`);
  if (!fs.existsSync(full)) {
    problems.push(`index.js mounts "${mountPath}" from missing file ${modulePath}`);
    continue;
  }

  let router;
  try {
    router = require(full);
  } catch (error) {
    problems.push(`routes/${modulePath} failed to load: ${error.message.split('\n')[0]}`);
    continue;
  }

  // Walk the sub-router directly and prefix with the mount path from index.js,
  // because Express 5 does not expose mount paths on a mounted router layer.
  const walk = (stack, prefix) => {
    for (const layer of stack) {
      if (layer.route) {
        const fullPath = prefix + layer.route.path;
        Object.keys(layer.route.methods).forEach((method) => {
          table.push({ method: method.toUpperCase(), path: fullPath });
          handlersOf(layer.route).forEach((fn, index) => {
            if (typeof fn !== 'function') {
              problems.push(`${method.toUpperCase()} ${fullPath} handler #${index} is ${typeof fn}`);
            }
          });
        });
        continue;
      }
      if (layer.handle?.stack?.length) walk(layer.handle.stack, prefix);
    }
  };

  walk(router.stack, mountPath);
}

/* Every controller export must be callable. */
for (const file of fs.readdirSync(controllersDir)) {
  if (!file.endsWith('.controller.js')) continue;
  const loaded = require(path.join(controllersDir, file));
  Object.entries(loaded).forEach(([key, value]) => {
    if (key === 'validateSchemas' || key === 'validate') return;
    if (typeof value !== 'function') {
      problems.push(`controllers/${file} export "${key}" is ${typeof value}, expected a function`);
    }
  });
}

if (problems.length) {
  console.error(`Route check FAILED (${problems.length} problems across ${table.length} routes):`);
  problems.forEach((problem) => console.error(`  - ${problem}`));
  process.exit(1);
}

console.log(`Routes OK: ${table.length} routes across ${mounts.length} mounted modules.`);
table.forEach(({ method, path: routePath }) => console.log(`  ${method.padEnd(6)} ${routePath}`));