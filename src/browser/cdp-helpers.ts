import WebSocket from "ws";

export async function fetchCdpJson<T>(cdpUrl: string, path: string): Promise<T> {
  const url = new URL(path, cdpUrl);
  const res = await fetch(url.toString());

  if (!res.ok) {
    throw new Error(`CDP request failed: ${res.status} ${res.statusText}`);
  }

  return (await res.json()) as T;
}

export async function connectToCDP(cdpUrl: string): Promise<WebSocket> {
  const wsUrl = await getWebSocketDebuggerUrl(cdpUrl);

  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);

    ws.on("open", () => resolve(ws));
    ws.on("error", reject);
    ws.on("close", () => {
      // Connection closed
    });
  });
}

export async function getWebSocketDebuggerUrl(
  cdpUrl: string,
): Promise<string> {
  const version = await fetchCdpJson<{ webSocketDebuggerUrl: string }>(
    cdpUrl,
    "/json/version",
  );

  if (!version.webSocketDebuggerUrl) {
    throw new Error("WebSocket debugger URL not found");
  }

  return version.webSocketDebuggerUrl;
}

export function sendCDPCommand<T = unknown>(
  ws: WebSocket,
  method: string,
  params: Record<string, unknown> = {},
): Promise<T> {
  return new Promise((resolve, reject) => {
    const id = Date.now();
    const message = JSON.stringify({ id, method, params });

    const handler = (data: WebSocket.Data) => {
      try {
        const response = JSON.parse(data.toString());

        if (response.id === id) {
          ws.removeListener("message", handler);
          ws.removeListener("error", errorHandler);

          if (response.error) {
            reject(new Error(response.error.message));
          } else {
            resolve(response.result as T);
          }
        }
      } catch (error) {
        reject(error);
      }
    };

    const errorHandler = (error: Error) => {
      ws.removeListener("message", handler);
      reject(error);
    };

    ws.on("message", handler);
    ws.once("error", errorHandler);
    ws.send(message);
  });
}

export async function waitForCDPReady(
  cdpPort: number,
  timeoutMs = 10000,
): Promise<boolean> {
  const startTime = Date.now();
  const cdpUrl = `http://127.0.0.1:${cdpPort}`;

  while (Date.now() - startTime < timeoutMs) {
    try {
      const res = await fetch(`${cdpUrl}/json/version`);

      if (res.ok) {
        return true;
      }
    } catch {
      // Ignore and retry
    }

    await sleep(100);
  }

  throw new Error(`CDP not ready on port ${cdpPort}`);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function listCDPTargets(cdpUrl: string) {
  return await fetchCdpJson<Array<{
    description: string;
    id: string;
    title: string;
    type: string;
    url: string;
    webSocketDebuggerUrl: string;
  }>>(cdpUrl, "/json/list");
}
