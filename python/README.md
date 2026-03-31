# Python integrations

This directory contains Python-side integrations owned by the main Node.js application.

## Akshare MCP server

Current canonical entrypoint:

```bash
uv run --project python akshare-mcp-server
```

Recommended interpreter:

```bash
uv python install 3.12
uv run --project python --python 3.12 akshare-mcp-server
```

Direct script entrypoint is still available when needed:

```bash
python python/akshare_mcp_server/server.py
```

`python/akshare_mcp_server/` is now the standalone Akshare MCP server package launched by the Node.js runtime. It vendors the required service/client logic locally and does not import runtime code from `/akshare`.
