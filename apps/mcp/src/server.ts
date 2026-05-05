import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { PrismaClient } from '@prisma/client';
import {
  createBoardSchema,
  createTodoSchema,
  deleteBoardSchema,
  deleteTodoSchema,
  getBoardSchema,
  getTodoSchema,
  InZoneMcpTools,
  listTodosSchema,
  updateBoardSchema,
  updateCurrentUserSchema,
  updateTodoSchema,
} from './tools.js';

export function createInZoneMcpServer(prisma: PrismaClient, userId: string): McpServer {
  const server = new McpServer({
    name: 'inzone-mcp',
    version: '0.1.0',
  });
  const tools = new InZoneMcpTools(prisma, userId);

  server.registerTool(
    'get-current-user',
    {
      title: 'Get current user',
      description: 'Get the InZone user associated with the current MCP token',
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    () => tools.getCurrentUser(),
  );

  server.registerTool(
    'update-current-user',
    {
      title: 'Update current user',
      description: 'Update profile fields for the InZone user associated with the current MCP token',
      inputSchema: updateCurrentUserSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    },
    (input) => tools.updateCurrentUser(input),
  );

  server.registerTool(
    'delete-current-user',
    {
      title: 'Delete current user',
      description: 'Delete the InZone user associated with the current MCP token',
      annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
    },
    () => tools.deleteCurrentUser(),
  );

  server.registerTool(
    'list-boards',
    {
      title: 'List boards',
      description: 'List boards owned by the current InZone user',
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    () => tools.listBoards(),
  );

  server.registerTool(
    'get-board',
    {
      title: 'Get board',
      description: 'Get one board owned by the current InZone user',
      inputSchema: getBoardSchema,
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    (input) => tools.getBoard(input),
  );

  server.registerTool(
    'create-board',
    {
      title: 'Create board',
      description: 'Create a board for the current InZone user',
      inputSchema: createBoardSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    },
    (input) => tools.createBoard(input),
  );

  server.registerTool(
    'update-board',
    {
      title: 'Update board',
      description: 'Update a board owned by the current InZone user',
      inputSchema: updateBoardSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    },
    (input) => tools.updateBoard(input),
  );

  server.registerTool(
    'delete-board',
    {
      title: 'Delete board',
      description: 'Delete a board owned by the current InZone user',
      inputSchema: deleteBoardSchema,
      annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
    },
    (input) => tools.deleteBoard(input),
  );

  server.registerTool(
    'list-todos',
    {
      title: 'List todos',
      description: 'List todos from boards owned by the current InZone user',
      inputSchema: listTodosSchema,
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    (input) => tools.listTodos(input),
  );

  server.registerTool(
    'get-todo',
    {
      title: 'Get todo',
      description: 'Get one todo from a board owned by the current InZone user',
      inputSchema: getTodoSchema,
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    (input) => tools.getTodo(input),
  );

  server.registerTool(
    'create-todo',
    {
      title: 'Create todo',
      description: 'Create a todo in a column owned by the current InZone user',
      inputSchema: createTodoSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    },
    (input) => tools.createTodo(input),
  );

  server.registerTool(
    'update-todo',
    {
      title: 'Update todo',
      description: 'Update a todo from a board owned by the current InZone user',
      inputSchema: updateTodoSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    },
    (input) => tools.updateTodo(input),
  );

  server.registerTool(
    'delete-todo',
    {
      title: 'Delete todo',
      description: 'Delete a todo from a board owned by the current InZone user',
      inputSchema: deleteTodoSchema,
      annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
    },
    (input) => tools.deleteTodo(input),
  );

  return server;
}
