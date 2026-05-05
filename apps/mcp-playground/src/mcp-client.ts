import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

export type PlaygroundClient = {
  client: Client;
  transport: StreamableHTTPClientTransport;
};

export type ToolSummary = {
  name: string;
  description: string;
  inputSchema: unknown;
  annotations: unknown;
};

export function createPlaygroundClient(endpoint: string, token: string): PlaygroundClient {
  const headers = new Headers();
  headers.set('Authorization', `Bearer ${token}`);

  const transport = new StreamableHTTPClientTransport(new URL(endpoint, window.location.origin), {
    requestInit: {
      headers,
    },
  });

  const client = new Client({
    name: 'inzone-mcp-playground',
    version: '0.2.0',
  });

  return { client, transport };
}

export async function connectPlaygroundClient(endpoint: string, token: string): Promise<PlaygroundClient> {
  const playgroundClient = createPlaygroundClient(endpoint, token);
  await playgroundClient.client.connect(playgroundClient.transport);
  return playgroundClient;
}

export async function listPlaygroundTools(client: Client): Promise<ToolSummary[]> {
  const result = await client.listTools();
  return result.tools.map((tool) => ({
    name: tool.name,
    description: tool.description ?? '',
    inputSchema: tool.inputSchema,
    annotations: tool.annotations ?? null,
  }));
}

export async function callPlaygroundTool(
  client: Client,
  name: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  return client.callTool({
    name,
    arguments: args,
  });
}
