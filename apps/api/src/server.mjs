import http from 'node:http';
import { pathToFileURL } from 'node:url';

import { getConfig } from './config.mjs';

function sendJson(response, statusCode, payload) {
  const body = JSON.stringify(payload);
  response.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body)
  });
  response.end(body);
}

export function createServer(config = getConfig()) {
  return http.createServer((request, response) => {
    const requestUrl = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);

    if (request.method === 'GET' && requestUrl.pathname === '/api/v1/health') {
      return sendJson(response, 200, {
        code: 'OK',
        message: 'success',
        data: {
          service: 'campusfit-api',
          status: 'healthy',
          timestamp: new Date().toISOString()
        }
      });
    }

    if (request.method === 'GET' && requestUrl.pathname === '/api/v1/bootstrap') {
      return sendJson(response, 200, {
        code: 'OK',
        message: 'success',
        data: {
          nodeEnv: config.nodeEnv,
          apiBaseUrl: `http://${config.host}:${config.port}`,
          databaseConfigured: config.databaseUrl.length > 0,
          databaseHost: config.postgresHost,
          databasePort: config.postgresPort,
          databaseName: config.postgresDatabase,
          availableRoutes: ['/api/v1/health', '/api/v1/bootstrap']
        }
      });
    }

    if (request.method === 'GET' && requestUrl.pathname === '/') {
      return sendJson(response, 200, {
        code: 'OK',
        message: 'success',
        data: {
          project: 'CampusFit AI',
          hint: '使用 /api/v1/health 检查服务状态'
        }
      });
    }

    return sendJson(response, 404, {
      code: 'NOT_FOUND',
      message: '资源不存在',
      data: null
    });
  });
}

export function startServer(config = getConfig()) {
  const server = createServer(config);

  server.listen(config.port, config.host, () => {
    console.log(`[CampusFit API] 服务已启动: http://${config.host}:${config.port}`);
    console.log('[CampusFit API] 健康检查: /api/v1/health');
    console.log('[CampusFit API] 启动状态: /api/v1/bootstrap');
  });

  return server;
}

const isDirectRun =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  startServer();
}
