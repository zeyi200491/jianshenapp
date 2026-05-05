const path = require('path');
const { HttpException, HttpStatus } = require('@nestjs/common');
const { AppExceptionFilter } = require(path.join(__dirname, 'app-exception.filter.ts'));

function createHost(response, request = { requestId: 'req-test' }) {
  return {
    switchToHttp() {
      return {
        getResponse() {
          return response;
        },
        getRequest() {
          return request;
        },
      };
    },
  };
}

describe('AppExceptionFilter', () => {
  it('preserves throttle http exceptions instead of rewriting them to internal errors', () => {
    const filter = new AppExceptionFilter();
    const response = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const exception = new HttpException(
      {
        code: 'TOO_MANY_REQUESTS',
        message: '验证码发送过于频繁，请在 36 秒后重试',
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );

    filter.catch(exception, createHost(response));

    expect(response.status).toHaveBeenCalledWith(429);
    expect(response.json).toHaveBeenCalledWith({
      code: 'TOO_MANY_REQUESTS',
      message: '验证码发送过于频繁，请在 36 秒后重试',
      data: null,
      requestId: 'req-test',
    });
  });

  it('translates generic throttler messages into a user-facing Chinese message', () => {
    const filter = new AppExceptionFilter();
    const response = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const exception = new HttpException(
      {
        statusCode: 429,
        message: 'ThrottlerException: Too Many Requests',
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );

    filter.catch(exception, createHost(response));

    expect(response.status).toHaveBeenCalledWith(429);
    expect(response.json).toHaveBeenCalledWith({
      code: 'TOO_MANY_REQUESTS',
      message: '请求过于频繁，请稍后再试',
      data: null,
      requestId: 'req-test',
    });
  });

  it('translates string-based throttler responses into a user-facing Chinese message', () => {
    const filter = new AppExceptionFilter();
    const response = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const exception = new HttpException('Too Many Requests', HttpStatus.TOO_MANY_REQUESTS);

    filter.catch(exception, createHost(response));

    expect(response.status).toHaveBeenCalledWith(429);
    expect(response.json).toHaveBeenCalledWith({
      code: 'TOO_MANY_REQUESTS',
      message: '请求过于频繁，请稍后再试',
      data: null,
      requestId: 'req-test',
    });
  });
});
