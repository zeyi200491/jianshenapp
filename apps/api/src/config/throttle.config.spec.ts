const path = require('path');
const { shouldSkipThrottle } = require(path.join(__dirname, 'throttle.config.ts'));

function createContext(request) {
  return {
    switchToHttp() {
      return {
        getRequest() {
          return request;
        },
      };
    },
  };
}

describe('shouldSkipThrottle', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalProvider = process.env.AUTH_EMAIL_PROVIDER;

  afterEach(() => {
    if (originalNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = originalNodeEnv;
    }

    if (originalProvider === undefined) {
      delete process.env.AUTH_EMAIL_PROVIDER;
    } else {
      process.env.AUTH_EMAIL_PROVIDER = originalProvider;
    }
  });

  it('skips throttling for mock email otp requests in non-production environments', () => {
    process.env.NODE_ENV = 'development';
    process.env.AUTH_EMAIL_PROVIDER = 'mock';

    const context = createContext({
      method: 'POST',
      originalUrl: '/api/v1/auth/email/request-code',
      route: {
        path: '/auth/email/request-code',
      },
    });

    expect(shouldSkipThrottle(context)).toBe(true);
  });

  it('keeps throttling enabled for production even on the same endpoint', () => {
    process.env.NODE_ENV = 'production';
    process.env.AUTH_EMAIL_PROVIDER = 'mock';

    const context = createContext({
      method: 'POST',
      originalUrl: '/api/v1/auth/email/request-code',
      route: {
        path: '/auth/email/request-code',
      },
    });

    expect(shouldSkipThrottle(context)).toBe(false);
  });

  it('keeps throttling enabled for smtp provider in development', () => {
    process.env.NODE_ENV = 'development';
    process.env.AUTH_EMAIL_PROVIDER = 'smtp';

    const context = createContext({
      method: 'POST',
      originalUrl: '/api/v1/auth/email/request-code',
      route: {
        path: '/auth/email/request-code',
      },
    });

    expect(shouldSkipThrottle(context)).toBe(false);
  });

  it('does not skip unrelated routes', () => {
    process.env.NODE_ENV = 'development';
    process.env.AUTH_EMAIL_PROVIDER = 'mock';

    const context = createContext({
      method: 'POST',
      originalUrl: '/api/v1/auth/email/verify-code',
      route: {
        path: '/auth/email/verify-code',
      },
    });

    expect(shouldSkipThrottle(context)).toBe(false);
  });
});
