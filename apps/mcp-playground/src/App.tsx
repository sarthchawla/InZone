import { useEffect, useMemo, useRef, useState } from 'react';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import type { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import {
  callPlaygroundTool,
  connectPlaygroundClient,
  listPlaygroundTools,
  type ToolSummary,
} from './mcp-client';
import './styles.css';

const DEFAULT_ARGS = '{}';

type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

function formatJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function getDefaultArgs(tool?: ToolSummary): string {
  const properties = (tool?.inputSchema as { properties?: Record<string, unknown> } | undefined)?.properties;
  if (!properties) return DEFAULT_ARGS;

  const args = Object.fromEntries(
    Object.entries(properties).map(([key]) => [key, key.endsWith('Id') || key === 'id' ? `${key}-value` : '']),
  );
  return formatJson(args);
}

export function App() {
  const [endpoint, setEndpoint] = useState('/api/mcp');
  const [token, setToken] = useState(() => localStorage.getItem('inzone-mcp-playground-token') ?? '');
  const [status, setStatus] = useState<ConnectionState>('disconnected');
  const [tools, setTools] = useState<ToolSummary[]>([]);
  const [selectedToolName, setSelectedToolName] = useState('');
  const [argsText, setArgsText] = useState(DEFAULT_ARGS);
  const [resultText, setResultText] = useState('');
  const [errorText, setErrorText] = useState('');
  const [isCallingTool, setIsCallingTool] = useState(false);
  const clientRef = useRef<Client | null>(null);
  const transportRef = useRef<StreamableHTTPClientTransport | null>(null);

  const selectedTool = useMemo(
    () => tools.find((tool) => tool.name === selectedToolName),
    [selectedToolName, tools],
  );

  useEffect(() => {
    localStorage.setItem('inzone-mcp-playground-token', token);
  }, [token]);

  async function disconnect() {
    await transportRef.current?.close().catch(() => {});
    clientRef.current = null;
    transportRef.current = null;
    setStatus('disconnected');
  }

  async function handleConnect() {
    setStatus('connecting');
    setErrorText('');
    setResultText('');
    setTools([]);

    try {
      await disconnect();
      const { client, transport } = await connectPlaygroundClient(endpoint, token);
      const nextTools = await listPlaygroundTools(client);
      clientRef.current = client;
      transportRef.current = transport;
      setTools(nextTools);
      setSelectedToolName(nextTools[0]?.name ?? '');
      setArgsText(getDefaultArgs(nextTools[0]));
      setStatus('connected');
      setResultText(formatJson({
        server: client.getServerVersion(),
        capabilities: client.getServerCapabilities(),
        tools: nextTools.map((tool) => tool.name),
      }));
    } catch (error) {
      setStatus('error');
      setErrorText(error instanceof Error ? error.message : 'Failed to connect to MCP server.');
    }
  }

  function handleToolChange(toolName: string) {
    const nextTool = tools.find((tool) => tool.name === toolName);
    setSelectedToolName(toolName);
    setArgsText(getDefaultArgs(nextTool));
    setResultText('');
    setErrorText('');
  }

  async function handleCallTool() {
    if (!clientRef.current || !selectedToolName) return;

    setIsCallingTool(true);
    setErrorText('');
    setResultText('');

    try {
      const parsedArgs = JSON.parse(argsText) as Record<string, unknown>;
      const result = await callPlaygroundTool(clientRef.current, selectedToolName, parsedArgs);
      setResultText(formatJson(result));
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : 'Failed to call MCP tool.');
    } finally {
      setIsCallingTool(false);
    }
  }

  return (
    <main className="playground-shell">
      <header className="topbar">
        <div>
          <h1>InZone MCP Playground</h1>
          <p>Streamable HTTP client backed by the official MCP TypeScript SDK.</p>
        </div>
        <div className={`status-pill status-${status}`} data-testid="connection-status">
          {status}
        </div>
      </header>

      <section className="panel connection-panel" aria-label="MCP connection">
        <label>
          Endpoint
          <input value={endpoint} onChange={(event) => setEndpoint(event.target.value)} />
        </label>
        <label>
          Bearer token
          <input
            value={token}
            onChange={(event) => setToken(event.target.value)}
            placeholder="iz_mcp_..."
            type="password"
            autoComplete="off"
          />
        </label>
        <div className="button-row">
          <button type="button" onClick={handleConnect} disabled={!token.trim() || status === 'connecting'}>
            {status === 'connecting' ? 'Connecting' : 'Connect'}
          </button>
          <button type="button" className="secondary" onClick={disconnect}>
            Disconnect
          </button>
        </div>
      </section>

      <section className="workspace-grid">
        <aside className="panel tools-panel" aria-label="MCP tools">
          <h2>Tools</h2>
          {tools.length === 0 ? (
            <p className="muted">Connect to list tools.</p>
          ) : (
            <div className="tool-list">
              {tools.map((tool) => (
                <button
                  key={tool.name}
                  type="button"
                  className={tool.name === selectedToolName ? 'tool-item active' : 'tool-item'}
                  onClick={() => handleToolChange(tool.name)}
                >
                  <span>{tool.name}</span>
                  {tool.description && <small>{tool.description}</small>}
                </button>
              ))}
            </div>
          )}
        </aside>

        <section className="panel call-panel" aria-label="MCP tool runner">
          <div className="runner-header">
            <div>
              <h2>Call Tool</h2>
              <p>{selectedToolName || 'No tool selected'}</p>
            </div>
            <button
              type="button"
              onClick={handleCallTool}
              disabled={status !== 'connected' || !selectedToolName || isCallingTool}
            >
              {isCallingTool ? 'Running' : 'Run Tool'}
            </button>
          </div>

          <label>
            Arguments JSON
            <textarea
              value={argsText}
              onChange={(event) => setArgsText(event.target.value)}
              rows={10}
              spellCheck={false}
            />
          </label>

          {selectedTool && (
            <details>
              <summary>Input schema</summary>
              <pre>{formatJson(selectedTool.inputSchema)}</pre>
            </details>
          )}
        </section>
      </section>

      {(errorText || resultText) && (
        <section className="panel result-panel" aria-label="MCP result">
          <h2>{errorText ? 'Error' : 'Result'}</h2>
          <pre className={errorText ? 'error-output' : ''}>{errorText || resultText}</pre>
        </section>
      )}
    </main>
  );
}
