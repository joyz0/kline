---
name: project-guidelines
description: Project-specific guidelines and conventions. Invoke when implementing features to ensure compliance with project standards and注意事项.
---

# Project Guidelines

This document contains project-specific guidelines and conventions that must be followed during development. As the project evolves, additional guidelines will be added.

## Current Guidelines

### 1. Runtime Type Validation with Zod Schema

**Rule**: Any type that requires runtime validation MUST have a corresponding Zod schema file in the same directory as the type definition.

**Purpose**: Ensures type safety at runtime and maintains a clear separation between compile-time types and runtime validation logic.

**Implementation**:

```typescript
// ✅ Correct: Schema file in same directory
// types/user.types.ts
export type User = {
  id: string;
  email: string;
  name: string;
};

// schemas/user.schemas.ts (same directory or parallel structure)
import { z } from 'zod';

export const userSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().min(1),
});

export type UserInput = z.infer<typeof userSchema>;
```

**Directory Structure Example**:

```
src/
├── user/
│   ├── user.types.ts
│   └── user.schemas.ts          # ✅ Schema alongside service
```

**Key Points**:

1. **Co-location**: Schema files must be in the same directory as their corresponding type definitions
2. **Naming Convention**: Use `<feature>.schemas.ts` for schema files
3. **Type Inference**: Use `z.infer<typeof schema>` to derive TypeScript types from schemas
4. **Validation**: Always validate external input using the schema before type casting

**Example Usage**:

```typescript
import { userSchema } from './user.schemas.js';
import type { User } from './user.types.js';

export async function createUser(input: unknown): Promise<User> {
  // Runtime validation first
  const validated = userSchema.parse(input);

  // Now safe to use as User type
  return await db.users.create(validated);
}
```

### 2. Module index.js Only for Aggregated Exports

**Rule**: Each module directory must have an `index.js` file that aggregates exports for **external** consumers only.

**Purpose**: Ensures that the `index.js` file is only used for aggregating exports, and not for internal use.

### 3. Module index.js Can not contains any internal logic

**Rule**: The `index.js` file must not contain any internal logic or side effects.

**Purpose**: Ensures that the `index.js` file is only used for aggregating exports, and not for internal use.

**Example Usage**:

```typescript
// ✅ Correct: No internal logic in index.js
export { createUser } from './user.js';

// ❌ Incorrect: Internal logic in index.js
export const createUser = async (input: unknown): Promise<User> => {
  // Internal logic
  return await db.users.create(input);
};
```

```


### 4. Module index.js Can not import from `./index.js` or `./index.ts` or `.`

**Rule**: The `index.js` file must not import from `./index.js`, `./index.ts`, or `.`.

**Purpose**: Prevents circular dependencies in Node.js ESM and ensures that the `index.js` file is only used for aggregating exports, and not for internal use.


### 5. Module index.js Can not import from `index` within the same directory

**Rule**: Importing from `index` within the same directory creates a circular dependency in Node.js ESM and will cause runtime errors. Always avoid this pattern.

**Purpose**: Prevents circular dependencies in Node.js ESM and ensures that the `index.js` file is only used for aggregating exports, and not for internal use.


## Guidelines Checklist

Before implementing a feature, verify:

- [ ] Runtime-validated types have corresponding Zod schemas in the same directory
- [ ] Schema files follow the naming convention: `<feature>.schemas.ts`
- [ ] Types are inferred from schemas using `z.infer` when possible
- [ ] All external inputs are validated with schemas before use

---

## Future Guidelines

_This section will be updated as the project evolves. Add new guidelines here to maintain consistency across the codebase._
```
