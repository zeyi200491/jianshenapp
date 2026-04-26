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

  it('uses API_PORT when starting the HTTP listener', async () => {
    const port = 3050;
    const child = spawn(process.execPath, ['-r', 'ts-node/register/transpile-only', apiEntry], {
      cwd: path.join(__dirname, '..'),
      env: {
        ...process.env,
        API_PORT: String(port),
        API_HOST: '127.0.0.1',
        API_DATA_MODE: 'mock',
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
      await wait(5000);
      await expect(fetchHealth(port)).resolves.toBe(200);
    } finally {
      child.kill();
      await wait(500);
    }

    expect(output).not.toContain('EACCES');
  }, 15000);
});
