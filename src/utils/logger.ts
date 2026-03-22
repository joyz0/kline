import pino from "pino";

const transport = pino.transport({
  targets: [
    {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "SYS:standard",
        ignore: "pid,hostname",
      },
    },
  ],
});

export const logger = pino(
  {
    level: process.env.LOG_LEVEL || "info",
    redact: {
      paths: ["password", "secret", "apiKey", "token"],
      censor: "***REDACTED***",
    },
  },
  transport,
);
