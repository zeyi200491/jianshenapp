const path = require('path');
const { THROTTLER_LIMIT, THROTTLER_TTL } = require(path.join(
  __dirname,
  '../../../node_modules/@nestjs/throttler/dist/throttler.constants.js',
));
const { AuthController } = require(path.join(__dirname, 'auth.controller.ts'));

describe('AuthController throttling', () => {
  it('applies stricter rate limits to otp and admin login endpoints', () => {
    const requestCode = AuthController.prototype.requestCode;
    const verifyCode = AuthController.prototype.verifyCode;
    const adminLogin = AuthController.prototype.adminLogin;

    expect(Reflect.getMetadata(`${THROTTLER_LIMIT}default`, requestCode)).toBe(3);
    expect(Reflect.getMetadata(`${THROTTLER_TTL}default`, requestCode)).toBe(60000);

    expect(Reflect.getMetadata(`${THROTTLER_LIMIT}default`, verifyCode)).toBe(5);
    expect(Reflect.getMetadata(`${THROTTLER_TTL}default`, verifyCode)).toBe(60000);

    expect(Reflect.getMetadata(`${THROTTLER_LIMIT}default`, adminLogin)).toBe(5);
    expect(Reflect.getMetadata(`${THROTTLER_TTL}default`, adminLogin)).toBe(60000);
  });

  it('forwards presented session headers to the logout revocation flow', async () => {
    const authService = {
      logout: jest.fn().mockResolvedValue({ success: true }),
    };
    const controller = new AuthController(authService);
    const response = {
      setHeader: jest.fn(),
    };
    const request = {
      headers: {
        authorization: 'Bearer access-token',
        cookie: 'campusfit_refresh_token=refresh-token',
      },
    };

    await expect(controller.logout(request, response)).resolves.toEqual({ success: true });
    expect(authService.logout).toHaveBeenCalledWith(request.headers);
  });
});
