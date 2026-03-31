# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- Install dependencies: `pnpm install`
- Run the main gateway server in dev mode: `pnpm dev`
- Build TypeScript: `pnpm build`
- Start the built gateway server: `pnpm start`
- Type-check without emitting: `pnpm typecheck`

### Test scripts

This repo does not use a single test runner. The existing tests are standalone `tsx` scripts under `test/browser/`.

- Run CDP connectivity test: `pnpm test:cdp`
- Run Playwright-over-CDP test: `pnpm test:playwright`
- Run browser HTTP API test: `pnpm test:api`
- Run a single test file directly: `pnpm exec tsx test/browser/test-cdp-connection.ts`

### MCP server commands

The Yahoo Finance MCP server is built from the same TypeScript source tree.

- Dev run (stdio): `pnpm dev:yahoo-finance2`
- Build and run compiled server: `pnpm start:yahoo-finance2`
- Run compiled server over stdio: `pnpm start:yahoo-finance2:stdio`
- Run compiled server over HTTP: `pnpm start:yahoo-finance2:http`
- Inspect the MCP server: `pnpm inspect:yahoo-finance2`

## Architecture

### Big picture

This is a TypeScript backend for stock analysis. The main app is an Express gateway that accepts analysis requests, enqueues them in Bull/Redis, runs a LangGraph-based analysis pipeline, and exposes task/report APIs plus WebSocket progress updates.

The main bootstrap is `src/index.ts`. It starts the HTTP server and registers the Bull worker that hands each job to `taskOrchestrator.processAnalysisTask()`.

### Request and execution flow

1. `POST /api/analyze` in `src/gateway/routes/analysis.route.ts` validates `selectedDate` and creates a Bull job.
2. The queue layer in `src/infra/queue/analysis-queue.ts` stores task state in Bull/Redis.
3. The worker calls `src/gateway/task-orchestrator.ts`.
4. The orchestrator calls `agentRuntime.runAnalysis()` from `src/agent/agent-runtime.ts`.
5. `src/agent/graph/causal-graph.ts` runs a linear LangGraph pipeline:
   `web_tool -> news_collector -> event_extractor -> causal_chain_inferrer -> stock_screener -> report_generator`
6. Completed reports are cached by `src/gateway/routes/report.route.ts` and served via `/api/reports`.

### Analysis pipeline

The analysis system is organized under `src/agent/` and `src/execution/`.

- `src/agent/graph/nodes/*.ts` defines graph nodes.
- `src/agent/graph/state.ts` defines the shared analysis state.
- `src/execution/*.ts` contains the concrete extraction, causal inference, stock recommendation, and report generation logic used by the nodes.

Despite the LangGraph/tool structure, much of the current MVP behavior is deterministic and rule-based rather than fully model-driven. Keep that in mind before introducing extra LLM complexity.

### Gateway and realtime updates

- `src/gateway/express-server.ts` wires HTTP routes and WebSocket handlers.
- `src/gateway/routes/analysis.route.ts` exposes task submission/status/cancel APIs.
- `src/gateway/routes/report.route.ts` exposes report fetch/list APIs.
- `src/gateway/websocket/progress-handler.ts` streams task progress.
- `src/gateway/server-methods/browser.ts` and `src/gateway/websocket/browser-ws.ts` bridge the main server to the browser control subsystem.

Reports are currently cached in an in-memory `Map`, not persisted to a database. A process restart loses cached reports.

### Browser control subsystem

The browser automation service is separate from the main analysis flow and lives under `src/browser/`.

- `src/browser/control-service.ts` starts a local Express service on `127.0.0.1:18791`.
- It manages browser profiles via `src/browser/profiles/manager.ts`.
- Routes are split across `src/browser/routes/basic.ts`, `tabs.ts`, and `agent.ts`.
- Security middleware lives under `src/browser/security/`, including SSRF protection and optional auth.

The LangGraph browser tool does not talk to Playwright directly. It goes through the gateway/browser bridge, which can lazily start and proxy to the local browser control service.

### MCP integrations

There are two different MCP patterns in this repo:

1. A standalone Yahoo Finance MCP server under `src/mcp/yahoo-finance2/`.
   - `index.ts` is the CLI entrypoint.
   - `server.ts` creates the server.
   - `toolRegistration.ts` registers MCP tools.
   - `transports/` contains the stdio vs HTTP transport strategy abstraction.

2. An embedded Akshare MCP client under `src/agent/tools/akshare.ts` and `src/mcp/akshare/`.
   - The app launches and talks to a Python MCP process, then exposes it as internal agent tools.

### Tool registry behavior

`src/agent/tools/langgraph-tools.ts` owns the in-process tool registry. Tool definitions used by prompts and runtime execution come from the same registry. If you change tool availability or definitions, make sure initialization still happens before tool calls are attempted.

### Configuration

Runtime config is centered on `.kline/` rather than root-level config files.

- Main config file: `.kline/kline.json5`
- Env file: `.kline/.env`
- Loader: `src/config/index.ts`

Important behavior from the config loader:

- Missing `.kline/kline.json5` falls back to built-in defaults.
- `${env:VAR}` placeholders in JSON5 are expanded before validation.
- Paths in browser profile config are resolved relative to `.kline/`, not necessarily the repo root.

If behavior depends on ports, browser executables, Redis, or API keys, check `.kline` config first.

## Repository-specific notes

- This is a NodeNext ESM TypeScript project. Preserve `.js` import specifiers in TypeScript source.
- `tsconfig.json` only includes `src/**/*`, so the browser test scripts are not part of the compile output.
- The browser test scripts expect local services and/or a Chrome instance with CDP enabled; they are integration-style checks, not isolated unit tests.
- The queue uses Bull with Redis and retries jobs automatically.
- Akshare now has a stable in-repo Python entrypoint at `python/akshare_mcp_server/server.py`; the implementation currently delegates to the legacy `akshare/` Python project for compatibility.
