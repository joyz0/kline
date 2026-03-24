import type { Browser as PlaywrightBrowser, Page } from "playwright";

export interface BrowserProfile {
  name: string;
  cdpPort?: number;
  cdpUrl?: string;
  userDataDir?: string;
  headless: boolean;
  executablePath?: string;
  extraArgs?: string[];
  color?: string;
}

export interface BrowserProfileInput {
  cdpPort?: number;
  cdpUrl?: string;
  userDataDir?: string;
  headless: boolean;
  executablePath?: string;
  extraArgs?: string[];
  color?: string;
}

export interface BrowserSecurityConfig {
  authEnabled: boolean;
  authSecret?: string;
  rateLimitEnabled: boolean;
  rateLimitMaxRequests: number;
  rateLimitWindowMs: number;
  ssrfProtectionEnabled: boolean;
}

export interface BrowserConfig {
  enabled: boolean;
  defaultProfile: string;
  profiles: Record<string, BrowserProfile>;
  security?: BrowserSecurityConfig;
}

export interface RunningChrome {
  pid: number;
  exe: string;
  userDataDir: string;
  cdpPort: number;
  startedAt: number;
}

export interface TabInfo {
  targetId: string;
  url: string;
  title: string;
  page: Page;
}

export interface BrowserState {
  browsers: Map<string, PlaywrightBrowser>;
  chromeProcesses: Map<string, RunningChrome>;
}

export interface SnapshotOptions {
  format?: "ai" | "aria";
  limit?: number;
}

export interface ScreenshotOptions {
  fullPage?: boolean;
  ref?: string;
  type?: "png" | "jpeg";
}

export interface ClickOptions {
  double?: boolean;
  button?: "left" | "right" | "middle";
}

export interface TypeOptions {
  slowly?: boolean;
  submit?: boolean;
}
