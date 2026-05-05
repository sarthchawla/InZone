import { When, Then } from '@cucumber/cucumber';
import { expect } from 'chai';
import { CustomWorld } from '../support/world';

const initializeRequest = {
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2025-03-26',
    capabilities: {},
    clientInfo: {
      name: 'inzone-bdd',
      version: '0.1.0',
    },
  },
};

function parseMcpBody(response: { body: unknown; text: string }) {
  const dataLine = response.text
    .split('\n')
    .find((line) => line.startsWith('data: '));
  if (dataLine) {
    return JSON.parse(dataLine.slice('data: '.length));
  }

  if (
    response.body &&
    !Buffer.isBuffer(response.body) &&
    Object.keys(response.body as Record<string, unknown>).length > 0
  ) {
    return response.body;
  }
  return response.body;
}

When('I create an MCP token named {string} expiring in {string}', async function (
  this: CustomWorld,
  name: string,
  expiresIn: string,
) {
  const response = await this.getRequest()
    .post('/api/mcp-tokens')
    .send({ name, expiresIn })
    .set('Content-Type', 'application/json');

  this.storeResponse(response.status, response.body, response.headers);
  if (response.body?.id) {
    this.testData.mcpTokenId = response.body.id;
  }
  if (response.body?.token) {
    this.testData.mcpToken = response.body.token;
  }
});

When('I revoke the created MCP token', async function (this: CustomWorld) {
  const tokenId = this.testData.mcpTokenId as string;
  const response = await this.getRequest().delete(`/api/mcp-tokens/${tokenId}`);

  this.storeResponse(response.status, parseMcpBody(response), response.headers);
});

When('I initialize MCP without a bearer token', async function (this: CustomWorld) {
  const response = await this.getRequest()
    .post('/api/mcp')
    .send(initializeRequest)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json, text/event-stream');

  this.testData.mcpRawResponse = response.text;
  this.storeResponse(response.status, parseMcpBody(response), response.headers);
});

When('I initialize MCP with the created token', async function (this: CustomWorld) {
  const token = this.testData.mcpToken as string;
  const response = await this.getRequest()
    .post('/api/mcp')
    .send(initializeRequest)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json, text/event-stream')
    .set('Authorization', `Bearer ${token}`);

  this.testData.mcpRawResponse = response.text;
  this.storeResponse(response.status, parseMcpBody(response), response.headers);
});

Then('the response should include a raw MCP token', function (this: CustomWorld) {
  expect(this.lastResponse?.body).to.have.property('token');
  const token = (this.lastResponse?.body as { token: string }).token;
  expect(token).to.match(/^iz_mcp_/);
});

Then('the MCP response should include server info', function (this: CustomWorld) {
  const body = this.lastResponse?.body as {
    result?: { serverInfo?: { name?: string; version?: string } };
  };

  expect(body.result?.serverInfo?.name).to.equal('inzone-mcp');
  expect(body.result?.serverInfo?.version).to.equal('0.1.0');
});
