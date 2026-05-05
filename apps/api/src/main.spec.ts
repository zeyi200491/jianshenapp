const path = require('path');
const { spawn } = require('child_process');

describe('API bootstrap', () => {
  const apiEntry = path.join(__dirname, 'main.ts');

  function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function fetchHealth(port) {
    const response = await fetch(`http://127.0.0.1:${port}/api/v1/health`);
    return response.status;
  }

  async function waitForHealth(port, timeoutMs = 10000) {
    const startAt = Date.now();
    while (Date.now() - startAt < timeoutMs) {
      try {
        const status = await fetchHealth(port);
        if (status === 200) {
          return;
        }
      } catch {
        // 服务尚未就绪时继续轮询。
      }
      await wait(250);
    }
    throw new Error(`API health check did not become ready within ${timeoutMs}ms`);
  }

  it('uses API_PORT when starting the HTTP listener', async () => {
    const port = 3050;
    const child = spawn(process.execPath, ['-r', 'ts-node/register/transpile-only', apiEntry], {
      cwd: path.join(__dirname, '..'),
      env: {
        ...process.env,
        API_PORT: String(port),
        API_HOST: '127.0.0.1',
        API_DATA_MODE: 'mock',
        JWT_SECRET: 'dev-secret-value',
        ADMIN_EMAIL: 'admin@example.com',
        ADMIN_PASSWORD: 'dev-password',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let output = '';
    child.stdout.on('data', (chunk) => {
      output += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      output += chunk.toString();
    });

    try {
      await waitForHealth(port);
      await expect(fetchHealth(port)).resolves.toBe(200);
    } finally {
      child.kill();
      await wait(500);
    }

    expect(output).not.toContain('EACCES');
  }, 15000);
});
