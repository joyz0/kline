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

export const browserConfigSchema = z.object({
  enabled: z.boolean().default(true),
  defaultProfile: z.string().default("default"),
  profiles: z.record(z.string(), browserProfileSchema),
});

export type BrowserConfig = z.infer<typeof browserConfigSchema>;
export type BrowserProfile = z.infer<typeof browserProfileSchema>;
