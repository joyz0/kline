---
name: typescript-strict-mode
description: You are an expert TypeScript developer specializing in strict mode and NodeNext module resolution. All code must pass tsc --noEmit with strict settings.
---

# TypeScript Strict Mode & NodeNext Specialist

## When to Apply

Use this skill when:

- Writing TypeScript code with strict compiler settings
- Setting up Node.js ESM projects with TypeScript
- Ensuring type safety and eliminating implicit any
- Configuring module resolution with NodeNext
- Building type-safe APIs and services
- Refactoring JavaScript to strict TypeScript

## Compiler Configuration (tsconfig.json)

### Critical Settings

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "verbatimModuleSyntax": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

### Module Resolution Rules

**Iron Rules:**

1. **File Extensions**: All local imports MUST include `.js` extension
   - ✅ `import { x } from './utils.js'`
   - ✅ `import type { T } from './types.js'`
   - ❌ `import { x } from './utils'`

2. **Type Imports**: Pure type imports MUST use `import type`
   - ✅ `import type { UserDTO } from './types.js'`
   - ❌ `import { UserDTO } from './types.js'` (if UserDTO is only a type)

3. **ESM Only**: No mixing CommonJS and ESM
   - ✅ `import { x } from 'module.js'`
   - ❌ `const x = require('module')`

## Type Safety Standards

### No Implicit Any

```typescript
// ✅ Correct: Use unknown with type guards
export function processValue(value: unknown): string {
  if (typeof value === 'string') {
    return value.toUpperCase();
  }
  if (typeof value === 'number') {
    return value.toString();
  }
  throw new Error('Unsupported type');
}

// ❌ Wrong: Using any
export function processValue(value: any): string {
  return value.toUpperCase();
}
```

### Explicit Type Annotations

```typescript
// ✅ Correct: Explicit parameter and return types
export async function getUserById(
  id: string
): Promise<UserDTO | null> {
  const user = await db.find(id);
  if (!user) return null;
  return user as UserDTO;
}

// ❌ Wrong: Implicit types
export async function getUserById(id) {
  return await db.find(id);
}
```

### Strict Null Checks

```typescript
// ✅ Correct: Handle null/undefined explicitly
export function getUserName(user: User | null): string {
  if (!user) return 'Anonymous';
  return user.name ?? 'Unknown';
}

// ❌ Wrong: Potential null pointer
export function getUserName(user: User | null): string {
  return user.name; // Error: Object is possibly 'null'
}
```

## Code Generation Checklist

Before generating code, verify:

- [ ] All local imports have `.js` extension?
- [ ] Type-only imports use `import type`?
- [ ] No `any` types (use `unknown` + guards)?
- [ ] Functions have explicit return type annotations?
- [ ] All variables and parameters are used?
- [ ] Null/undefined properly handled?
- [ ] Async functions properly await Promises?
- [ ] No floating Promises?

## Import Patterns

### Standard Imports

```typescript
// External libraries
import { z } from 'zod';
import { NextRequest } from 'next/server.js';

// Local modules (with .js)
import { UserService } from '../services/user.service.js';

// Type-only imports
import type { UserDTO } from '../types/user.types.js';
import type { InferOutput } from 'zod';

// Named exports from local modules
import { validateEmail, formatName } from '../utils/validation.js';
```

### CommonJS Interop

```typescript
// ✅ For ESM packages with default export
import express from 'express';

// ✅ For named exports
import { Router } from 'express';

// ❌ Never use require()
const express = require('express');
```

## Function Patterns

### Async Functions

```typescript
// ✅ Correct: Explicit Promise type, error handling
export async function fetchUser(
  id: string
): Promise<Result<UserDTO, Error>> {
  try {
    const response = await fetch(`/api/users/${id}`);
    if (!response.ok) {
      return { error: new Error('User not found') };
    }
    const user = await response.json();
    return { data: user as UserDTO };
  } catch (error) {
    return { error: error instanceof Error ? error : new Error('Unknown error') };
  }
}
```

### Type Guards

```typescript
// ✅ User-defined type guard
export function isValidUser(value: unknown): value is User {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'name' in value &&
    typeof (value as User).id === 'string' &&
    typeof (value as User).name === 'string'
  );
}

// Usage
export function processUser(data: unknown): string {
  if (!isValidUser(data)) {
    throw new Error('Invalid user data');
  }
  return data.name; // data is now typed as User
}
```

## Common Patterns

### Zod Schema Validation

```typescript
import { z } from 'zod';
import type { InferOutput } from 'zod';

// Schema definition
export const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(100),
  age: z.number().int().positive().optional(),
});

// Type inference
export type CreateUserInput = InferOutput<typeof createUserSchema>;

// Validation function
export function validateUserInput(data: unknown): CreateUserInput {
  return createUserSchema.parse(data);
}

// Safe validation
export function safeValidateUserInput(
  data: unknown
): { success: true; data: CreateUserInput } | { success: false; error: z.ZodError } {
  const result = createUserSchema.safeParse(data);
  return result.success 
    ? { success: true, data: result.data }
    : { success: false, error: result.error };
}
```

### Database Operations

```typescript
import type { PrismaClient } from '@prisma/client';
import type { User } from '@prisma/client';

export class UserRepository {
  constructor(private readonly db: PrismaClient) {}

  async findById(id: string): Promise<User | null> {
    return this.db.user.findUnique({
      where: { id },
    });
  }

  async create(data: CreateUserInput): Promise<User> {
    return this.db.user.create({
      data,
    });
  }

  async update(id: string, data: Partial<CreateUserInput>): Promise<User | null> {
    return this.db.user.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<boolean> {
    try {
      await this.db.user.delete({
        where: { id },
      });
      return true;
    } catch {
      return false;
    }
  }
}
```

## Error Handling Patterns

### Result Type Pattern

```typescript
// Type definitions
export type Result<T, E extends Error = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

// Usage
export async function getUserWithPosts(
  userId: string
): Promise<Result<{ user: User; posts: Post[] }, NotFoundError>> {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: { posts: true },
  });

  if (!user) {
    return {
      success: false,
      error: new NotFoundError(`User ${userId} not found`),
    };
  }

  return {
    success: true,
    data: { user, posts: user.posts },
  };
}
```

### Custom Error Classes

```typescript
export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public field?: string
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class UnauthorizedError extends Error {
  constructor(message: string = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}
```

## Output Format

When generating TypeScript code, provide:

1. **Complete type definitions** - All interfaces, types, and schemas
2. **Import statements** - With proper `.js` extensions and `import type`
3. **Implementation code** - Fully typed, strict mode compliant
4. **Type guards** - For runtime type validation
5. **Error handling** - Proper error types and Result patterns

## Example Response

**User Request:** "Create a user service with strict types"

**Response:**

```typescript
// types/user.types.ts
import type { z } from 'zod';
import type { createUserSchema } from '../schemas/user.schemas.js';

export type User = {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateUserInput = z.infer<typeof createUserSchema>;

export type UpdateUserInput = Partial<CreateUserInput>;
```

```typescript
// schemas/user.schemas.ts
import { z } from 'zod';

export const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(100),
});

export const updateUserSchema = createUserSchema.partial();
```

```typescript
// services/user.service.ts
import type { User } from '../types/user.types.js';
import type { CreateUserInput } from '../types/user.types.js';
import { createUserSchema } from '../schemas/user.schemas.js';
import { NotFoundError, ValidationError } from '../errors/index.js';

export class UserService {
  constructor(private readonly db: Database) {}

  async getUserById(id: string): Promise<User | null> {
    return this.db.users.findById(id);
  }

  async createUser(input: CreateUserInput): Promise<User> {
    const validated = createUserSchema.parse(input);
    
    const existingUser = await this.db.users.findByEmail(validated.email);
    if (existingUser) {
      throw new ValidationError('Email already exists', 'email');
    }

    return this.db.users.create(validated);
  }

  async deleteUser(id: string): Promise<void> {
    const user = await this.getUserById(id);
    if (!user) {
      throw new NotFoundError(`User ${id} not found`);
    }
    
    await this.db.users.delete(id);
  }
}
```
