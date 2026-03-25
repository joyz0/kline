import type { Express, Request, Response } from 'express';
import { browserLogger } from '../logger.js';
import type { ProfileManager } from '../profiles/manager.js';

export function registerBasicRoutes(
  app: Express,
  profileManager: ProfileManager,
) {
  app.post("/start", async (req: Request, res: Response) => {
    try {
      const { profile = "default" } = req.body;

      const profileConfig = profileManager.getProfile(profile);

      if (!profileConfig) {
        return res.status(404).json({
          error: "Profile not found",
          message: `Profile "${profile}" not found`,
        });
      }

      if (profileManager.isBrowserRunning(profile)) {
        return res.status(200).json({
          success: true,
          message: `Browser for profile "${profile}" is already running`,
        });
      }

      await profileManager.ensureBrowser(profileConfig);

      browserLogger.info({ profile, subsystem: 'browser' }, 'Browser started successfully');

      res.json({
        success: true,
        message: `Browser for profile "${profile}" started successfully`,
        profile,
      });
    } catch (error) {
      browserLogger.error({ error, subsystem: 'browser' }, 'Failed to start browser');

      res.status(500).json({
        error: "Failed to start browser",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  app.post("/stop", async (req: Request, res: Response) => {
    try {
      const { profile = "default" } = req.body;

      await profileManager.stopBrowser(profile);

      res.json({
        success: true,
        message: `Browser for profile "${profile}" stopped successfully`,
      });
    } catch (error) {
      browserLogger.error({ error, subsystem: 'browser' }, 'Failed to stop browser');

      res.status(500).json({
        error: "Failed to stop browser",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  app.get("/status", async (req: Request, res: Response) => {
    try {
      const { profile = "default" } = req.query;

      const profileConfig = profileManager.getProfile(profile as string);

      if (!profileConfig) {
        return res.status(404).json({
          error: "Profile not found",
        });
      }

      const isRunning = profileManager.isBrowserRunning(profile as string);

      res.json({
        profile: profile,
        running: isRunning,
        config: profileConfig,
      });
    } catch (error) {
      browserLogger.error({ error, subsystem: 'browser' }, 'Failed to get status');

      res.status(500).json({
        error: "Failed to get status",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  app.get("/profiles", async (req: Request, res: Response) => {
    try {
      const profiles = profileManager.getAllProfiles();
      const runningBrowsers = profileManager.getRunningBrowsers();

      res.json({
        profiles: profiles.map((p) => ({
          ...p,
          running: runningBrowsers.includes(p.name),
        })),
      });
    } catch (error) {
      browserLogger.error({ error, subsystem: 'browser' }, 'Failed to list profiles');

      res.status(500).json({
        error: "Failed to list profiles",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });
}
