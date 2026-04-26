const path = require('path');
const { PrismaService } = require(path.join(__dirname, 'prisma.service.ts'));

describe('PrismaService', () => {
  const previousEnv = { ...process.env };

  afterEach(async () => {
    process.env = { ...previousEnv };
    jest.restoreAllMocks();
  });

  it('falls back to mock mode when auto mode cannot connect to PostgreSQL', async () => {
    process.env.API_DATA_MODE = 'auto';

    const service = new PrismaService();
    jest.spyOn(service.realClient, '$connect').mockRejectedValue(new Error('db down'));

    await expect(service.onModuleInit()).resolves.toBeUndefined();
    expect(service.getMode()).toBe('mock');
  });

  it('keeps database mode strict when explicitly requested', async () => {
    process.env.API_DATA_MODE = 'database';

    const service = new PrismaService();
    jest.spyOn(service.realClient, '$connect').mockRejectedValue(new Error('db down'));

    await expect(service.onModuleInit()).rejects.toThrow('db down');
    expect(service.getMode()).toBe('database');
  });
});
