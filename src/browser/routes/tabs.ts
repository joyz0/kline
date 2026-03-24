import type { Express, Request, Response } from "express";
import { browserLogger } from "../logger.js";
import type { ProfileManager } from "../profiles/manager.js";
import { BrowserTabNotFoundError, BrowserNotStartedError, InvalidUrlError } from "../errors.js";
import { validateUrl } from "../security/ssrf-protection.js";

export function registerTabsRoutes(
  app: Express,
  profileManager: ProfileManager,
) {
  app.get("/tabs", async (req: Request, res: Response) => {
    try {
      const { profile = "default" } = req.query;

      const browser = await profileManager.getBrowser(profile as string);

      if (!browser) {
        throw new BrowserNotStartedError(profile as string);
      }

      const contexts = browser.contexts();
      const tabs: Array<{
        targetId: string;
        url: string;
        title: string;
        profile: string;
      }> = [];

      for (const context of contexts) {
        const pages = context.pages();

        for (const page of pages) {
          tabs.push({
            targetId: page.guid,
            url: page.url(),
            title: await page.title(),
            profile: profile as string,
          });
        }
      }

      res.json({ tabs });
    } catch (error) {
      browserLogger.error({ error }, "Failed to list tabs");

      if (error instanceof BrowserNotStartedError) {
        return res.status(503).json({
          error: "Browser not started",
          message: error.message,
        });
      }

      res.status(500).json({
        error: "Failed to list tabs",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  app.post("/tabs/open", async (req: Request, res: Response) => {
    try {
      const { url, profile = "default" } = req.body;

      if (!url) {
        return res.status(400).json({
          error: "Bad Request",
          message: "URL is required",
        });
      }

      if (!validateUrl(url)) {
        return res.status(400).json({
          error: "Bad Request",
          message: "Invalid URL. Private IP addresses and non-HTTP protocols are not allowed.",
          code: "INVALID_URL",
        });
      }

      const browser = await profileManager.getBrowser(profile as string);

      if (!browser) {
        throw new BrowserNotStartedError(profile as string);
      }

      const context = browser.contexts()[0] || await browser.newContext();
      const page = await context.newPage();

      await page.goto(url, { waitUntil: "domcontentloaded" });

      const tabInfo = {
        targetId: page.guid,
        url,
        title: await page.title(),
        profile: profile as string,
      };

      browserLogger.info(
        { url, targetId: tabInfo.targetId, profile },
        "Tab opened successfully",
      );

      res.json(tabInfo);
    } catch (error) {
      browserLogger.error({ error }, "Failed to open tab");

      if (error instanceof BrowserNotStartedError) {
        return res.status(503).json({
          error: "Browser not started",
          message: error.message,
        });
      }

      if (error instanceof InvalidUrlError) {
        return res.status(400).json({
          error: "Invalid URL",
          message: error.message,
          code: "INVALID_URL",
        });
      }

      res.status(500).json({
        error: "Failed to open tab",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  app.post("/tabs/focus", async (req: Request, res: Response) => {
    try {
      const { targetId, profile = "default" } = req.body;

      if (!targetId) {
        return res.status(400).json({
          error: "Bad Request",
          message: "targetId is required",
        });
      }

      const browser = await profileManager.getBrowser(profile as string);

      if (!browser) {
        throw new BrowserNotStartedError(profile as string);
      }

      const page = findPageByGuid(browser, targetId);

      if (!page) {
        throw new BrowserTabNotFoundError(targetId);
      }

      await page.bringToFront();

      res.json({
        success: true,
        message: `Focused tab ${targetId}`,
      });
    } catch (error) {
      browserLogger.error({ error }, "Failed to focus tab");

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
        error: "Failed to focus tab",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  app.delete("/tabs/:targetId", async (req: Request, res: Response) => {
    try {
      const { targetId } = req.params;
      const { profile = "default" } = req.query;

      const browser = await profileManager.getBrowser(profile as string);

      if (!browser) {
        throw new BrowserNotStartedError(profile as string);
      }

      const page = findPageByGuid(browser, targetId);

      if (!page) {
        throw new BrowserTabNotFoundError(targetId);
      }

      await page.close();

      res.json({
        success: true,
        message: `Closed tab ${targetId}`,
      });
    } catch (error) {
      browserLogger.error({ error }, "Failed to close tab");

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
        error: "Failed to close tab",
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
