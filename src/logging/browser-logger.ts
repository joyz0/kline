import { createLogger, logRequest, logError, type AppLogger, type LogContext } from "./index.js";

export const browserLogger = createLogger("kline:browser");

export { logRequest, logError };
export type { AppLogger, LogContext };
