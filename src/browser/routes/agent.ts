import type { Express, Request, Response } from "express";
import type { Page } from "playwright";
import { browserLogger } from "../logger.js";
import type { ProfileManager } from "../profiles/manager.js";
import {
  BrowserNotStartedError,
  BrowserTabNotFoundError,
  ElementNotFoundError,
} from "../errors.js";
import type {
  SnapshotOptions,
  ScreenshotOptions,
  ClickOptions,
  TypeOptions,
} from "../types.js";

export function registerAgentRoutes(
  app: Express,
  profileManager: ProfileManager,
) {
  app.get("/snapshot", async (req: Request, res: Response) => {
    try {
      const { profile = "default", targetId, format = "ai" } = req.query;

      const browser = await profileManager.getBrowser(profile as string);

      if (!browser) {
        throw new BrowserNotStartedError(profile as string);
      }

      let page: Page | null = null;

      if (targetId) {
        page = findPageByGuid(browser, targetId as string);

        if (!page) {
          throw new BrowserTabNotFoundError(targetId as string);
        }
      } else {
        const contexts = browser.contexts();

        if (contexts.length > 0) {
          const pages = contexts[0].pages();

          if (pages.length > 0) {
            page = pages[pages.length - 1];
          }
        }
      }

      if (!page) {
        return res.status(400).json({
          error: "No page available",
          message:
            "No page found. Please open a URL first or specify targetId.",
        });
      }

      const snapshot = await getSnapshot(page, {
        format: format as "ai" | "aria",
      });

      res.json({
        snapshot,
        url: page.url(),
        title: await page.title(),
      });
    } catch (error) {
      browserLogger.error({ error }, "Failed to get snapshot");

      if (error instanceof BrowserNotStartedError) {
        return res.status(503).json({
          error: "Browser not started",
          message: error.message,
        });
      }

      if (error instanceof BrowserTabNotFoundError) {
        return res.status(404).json({
          error: "Tab not found",
          message: error.message,
        });
      }

      res.status(500).json({
        error: "Failed to get snapshot",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  app.post("/screenshot", async (req: Request, res: Response) => {
    try {
      const {
        profile = "default",
        targetId,
        fullPage = false,
        ref,
        type = "png",
      } = req.body;

      const browser = await profileManager.getBrowser(profile as string);

      if (!browser) {
        throw new BrowserNotStartedError(profile as string);
      }

      let page: Page | null = null;

      if (targetId) {
        page = findPageByGuid(browser, targetId);

        if (!page) {
          throw new BrowserTabNotFoundError(targetId);
        }
      } else {
        const contexts = browser.contexts();

        if (contexts.length > 0) {
          const pages = contexts[0].pages();

          if (pages.length > 0) {
            page = pages[pages.length - 1];
          }
        }
      }

      if (!page) {
        return res.status(400).json({
          error: "No page available",
        });
      }

      const screenshot = await takeScreenshot(page, {
        fullPage,
        ref,
        type: type as "png" | "jpeg",
      });

      res.set("Content-Type", `image/${type}`);
      res.send(Buffer.from(screenshot));
    } catch (error) {
      browserLogger.error({ error }, "Failed to take screenshot");

      if (error instanceof BrowserNotStartedError) {
        return res.status(503).json({
          error: "Browser not started",
          message: error.message,
        });
      }

      if (error instanceof BrowserTabNotFoundError) {
        return res.status(404).json({
          error: "Tab not found",
          message: error.message,
        });
      }

      res.status(500).json({
        error: "Failed to take screenshot",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  app.post("/click", async (req: Request, res: Response) => {
    try {
      const { ref, profile = "default", targetId, ...options } = req.body;

      if (!ref) {
        return res.status(400).json({
          error: "Bad Request",
          message: "ref is required",
        });
      }

      const browser = await profileManager.getBrowser(profile as string);

      if (!browser) {
        throw new BrowserNotStartedError(profile as string);
      }

      let page: Page | null = null;

      if (targetId) {
        page = findPageByGuid(browser, targetId);

        if (!page) {
          throw new BrowserTabNotFoundError(targetId);
        }
      } else {
        const contexts = browser.contexts();

        if (contexts.length > 0) {
          const pages = contexts[0].pages();

          if (pages.length > 0) {
            page = pages[pages.length - 1];
          }
        }
      }

      if (!page) {
        return res.status(400).json({
          error: "No page available",
        });
      }

      await clickElement(page, ref, options as ClickOptions);

      res.json({
        success: true,
        message: `Clicked element ${ref}`,
      });
    } catch (error) {
      browserLogger.error({ error }, "Failed to click element");

      if (error instanceof BrowserNotStartedError) {
        return res.status(503).json({
          error: "Browser not started",
          message: error.message,
        });
      }

      if (error instanceof BrowserTabNotFoundError) {
        return res.status(404).json({
          error: "Tab not found",
          message: error.message,
        });
      }

      if (error instanceof ElementNotFoundError) {
        return res.status(404).json({
          error: "Element not found",
          message: error.message,
        });
      }

      res.status(500).json({
        error: "Failed to click element",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  app.post("/type", async (req: Request, res: Response) => {
    try {
      const { ref, text, profile = "default", targetId, ...options } = req.body;

      if (!ref || text === undefined) {
        return res.status(400).json({
          error: "Bad Request",
          message: "ref and text are required",
        });
      }

      const browser = await profileManager.getBrowser(profile as string);

      if (!browser) {
        throw new BrowserNotStartedError(profile as string);
      }

      let page: Page | null = null;

      if (targetId) {
        page = findPageByGuid(browser, targetId);

        if (!page) {
          throw new BrowserTabNotFoundError(targetId);
        }
      } else {
        const contexts = browser.contexts();

        if (contexts.length > 0) {
          const pages = contexts[0].pages();

          if (pages.length > 0) {
            page = pages[pages.length - 1];
          }
        }
      }

      if (!page) {
        return res.status(400).json({
          error: "No page available",
        });
      }

      await typeText(page, ref, text, options as TypeOptions);

      res.json({
        success: true,
        message: `Typed text into element ${ref}`,
      });
    } catch (error) {
      browserLogger.error({ error }, "Failed to type text");

      if (error instanceof BrowserNotStartedError) {
        return res.status(503).json({
          error: "Browser not started",
          message: error.message,
        });
      }

      if (error instanceof BrowserTabNotFoundError) {
        return res.status(404).json({
          error: "Tab not found",
          message: error.message,
        });
      }

      if (error instanceof ElementNotFoundError) {
        return res.status(404).json({
          error: "Element not found",
          message: error.message,
        });
      }

      res.status(500).json({
        error: "Failed to type text",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  app.post("/navigate", async (req: Request, res: Response) => {
    try {
      const { url, profile = "default", targetId } = req.body;

      if (!url) {
        return res.status(400).json({
          error: "Bad Request",
          message: "url is required",
        });
      }

      const browser = await profileManager.getBrowser(profile as string);

      if (!browser) {
        throw new BrowserNotStartedError(profile as string);
      }

      let page: Page | null = null;

      if (targetId) {
        page = findPageByGuid(browser, targetId);

        if (!page) {
          throw new BrowserTabNotFoundError(targetId);
        }
      } else {
        const contexts = browser.contexts();

        if (contexts.length > 0) {
          const pages = contexts[0].pages();

          if (pages.length > 0) {
            page = pages[pages.length - 1];
          }
        }
      }

      if (!page) {
        return res.status(400).json({
          error: "No page available",
        });
      }

      await page.goto(url, { waitUntil: "domcontentloaded" });

      res.json({
        success: true,
        url,
        title: await page.title(),
      });
    } catch (error) {
      browserLogger.error({ error }, "Failed to navigate");

      if (error instanceof BrowserNotStartedError) {
        return res.status(503).json({
          error: "Browser not started",
          message: error.message,
        });
      }

      if (error instanceof BrowserTabNotFoundError) {
        return res.status(404).json({
          error: "Tab not found",
          message: error.message,
        });
      }

      res.status(500).json({
        error: "Failed to navigate",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });
}

function findPageByGuid(browser: any, guid: string): any | null {
  const contexts = browser.contexts();

  for (const context of contexts) {
    const pages = context.pages();

    for (const page of pages) {
      if (page.guid === guid) {
        return page;
      }
    }
  }

  return null;
}

async function getSnapshot(
  page: Page,
  options?: SnapshotOptions,
): Promise<string> {
  try {
    const snapshot = await page.locator("body").ariaSnapshot();

    if (options?.format === "ai") {
      return addNumericRefs(snapshot, options.limit);
    }

    return snapshot;
  } catch (error) {
    throw new Error(
      `Failed to get snapshot: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

async function takeScreenshot(
  page: Page,
  options?: ScreenshotOptions,
): Promise<Buffer> {
  try {
    if (options?.ref) {
      const element = page.getByTestId(`ref-${options.ref}`);

      const screenshot = await element.screenshot({
        type: options.type || "png",
      });

      return screenshot as Buffer;
    } else {
      const screenshot = await page.screenshot({
        fullPage: options?.fullPage,
        type: options?.type || "png",
      });

      return screenshot as Buffer;
    }
  } catch (error) {
    throw new Error(
      `Failed to take screenshot: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

async function clickElement(
  page: Page,
  ref: string,
  options?: ClickOptions,
): Promise<void> {
  try {
    const element = page.getByTestId(`ref-${ref}`);

    const count = await element.count();

    if (count === 0) {
      throw new ElementNotFoundError(ref);
    }

    await element.click({
      clickCount: options?.double ? 2 : 1,
      button: options?.button || "left",
    });
  } catch (error) {
    if (error instanceof ElementNotFoundError) {
      throw error;
    }

    throw new Error(
      `Failed to click element: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

async function typeText(
  page: Page,
  ref: string,
  text: string,
  options?: TypeOptions,
): Promise<void> {
  try {
    const element = page.getByTestId(`ref-${ref}`);

    const count = await element.count();

    if (count === 0) {
      throw new ElementNotFoundError(ref);
    }

    await element.fill(text, { delay: options?.slowly ? 50 : 0 });

    if (options?.submit) {
      await element.press("Enter");
    }
  } catch (error) {
    if (error instanceof ElementNotFoundError) {
      throw error;
    }

    throw new Error(
      `Failed to type text: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

function addNumericRefs(snapshot: string, limit?: number): string {
  const lines = snapshot.split("\n");
  let refCounter = 1;

  const processedLines = lines.map((line) => {
    const indent = line.match(/^\s*/)?.[0] || "";
    const content = line.trim();

    if (content && !content.startsWith("-")) {
      return line;
    }

    const refNumber = refCounter++;

    if (limit && refCounter > limit) {
      return line;
    }

    return `${indent}- [${refNumber}] ${content}`;
  });

  return processedLines.join("\n");
}
