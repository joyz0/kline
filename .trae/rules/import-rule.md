1. **No Internal Index Imports**: Inside a module directory, sub-modules must NEVER import from `./index.js`, `./index.ts`, or `.`.
2. **Explicit Relative Paths**: Sub-modules must import dependencies using explicit filenames (e.g., `import { x } from './y.js'`).
3. **Index Purpose**: `index.js` is strictly for aggregating exports for **external** consumers only.
4. **Circular Dependency Prevention**: Importing from `index` within the same directory creates a circular dependency in Node.js ESM and will cause runtime errors. Always avoid this pattern.
