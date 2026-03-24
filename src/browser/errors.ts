export class BrowserError extends Error {
  public readonly code: string;
  public readonly status: number;

  constructor(code: string, status: number, message: string) {
    super(message);
    this.name = "BrowserError";
    this.code = code;
    this.status = status;
  }
}

export class BrowserProfileUnavailableError extends BrowserError {
  constructor(profileName: string) {
    super(
      "PROFILE_UNAVAILABLE",
      503,
      `Browser profile "${profileName}" is not available`,
    );
  }
}

export class BrowserTabNotFoundError extends BrowserError {
  constructor(targetId: string) {
    super("TAB_NOT_FOUND", 404, `Tab "${targetId}" not found`);
  }
}

export class BrowserNotStartedError extends BrowserError {
  constructor(profileName: string) {
    super(
      "BROWSER_NOT_STARTED",
      503,
      `Browser for profile "${profileName}" is not started`,
    );
  }
}

export class InvalidUrlError extends BrowserError {
  constructor(url: string) {
    super("INVALID_URL", 400, `Invalid URL: ${url}`);
  }
}

export class ElementNotFoundError extends BrowserError {
  constructor(ref: string) {
    super("ELEMENT_NOT_FOUND", 404, `Element with ref "${ref}" not found`);
  }
}
