import test from 'node:test';
import assert from 'node:assert/strict';

import { createServer } from '../src/server.mjs';

function listen(server) {
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      resolve(server.address());
    });
  });
}

function close(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

test('健康检查接口返回 OK', async () => {
  const server = createServer({
    nodeEnv: 'test',
    host: '127.0.0.1',
    port: 0,
    databaseUrl: 'postgresql://demo',
    postgresHost: '127.0.0.1',
    postgresPort: 5432,
    postgresDatabase: 'campusfit_ai'
  });
  const address = await listen(server);

  try {
    const response = await fetch(`http://127.0.0.1:${address.port}/api/v1/health`);
    const payload = await response.json();

    assert.equal(response.status, 200);
    assert.equal(payload.code, 'OK');
    assert.equal(payload.data.service, 'campusfit-api');
  } finally {
    await close(server);
  }
});

test('启动状态接口返回数据库配置摘要', async () => {
  const server = createServer({
    nodeEnv: 'test',
    host: '127.0.0.1',
    port: 0,
    databaseUrl: 'postgresql://demo',
    postgresHost: '127.0.0.1',
    postgresPort: 5432,
    postgresDatabase: 'campusfit_ai'
  });
  const address = await listen(server);

  try {
    const response = await fetch(`http://127.0.0.1:${address.port}/api/v1/bootstrap`);
    const payload = await response.json();

    assert.equal(response.status, 200);
    assert.equal(payload.code, 'OK');
    assert.equal(payload.data.databaseConfigured, true);
    assert.equal(payload.data.databaseName, 'campusfit_ai');
  } finally {
    await close(server);
  }
});
