import { z } from "zod";

const browserProfileSchema = z.object({
  cdpPort: z.number().optional(),
  cdpUrl: z.string().optional(),
  userDataDir: z.string().optional(),
  headless: z.boolean().default(false),
  executablePath: z.string().optional(),
  extraArgs: z.array(z.string()).optional(),
  color: z.string().optional(),
});

const browserSecurityConfigSchema = z.object({
  authEnabled: z.boolean().default(false),
  authSecret: z.string().optional(),
  rateLimitEnabled: z.boolean().default(true),
  rateLimitMaxRequests: z.number().default(100),
  rateLimitWindowMs: z.number().default(60000),
  ssrfProtectionEnabled: z.boolean().default(true),
});

export const browserConfigSchema = z.object({
  enabled: z.boolean().default(true),
  defaultProfile: z.string().default("default"),
  profiles: z.record(z.string(), browserProfileSchema),
  security: browserSecurityConfigSchema.optional(),
});

export type BrowserConfig = z.infer<typeof browserConfigSchema>;
export type BrowserProfile = z.infer<typeof browserProfileSchema>;
export type BrowserSecurityConfig = z.infer<typeof browserSecurityConfigSchema>;
