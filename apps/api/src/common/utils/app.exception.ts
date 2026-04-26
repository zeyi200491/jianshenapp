import { HttpException, HttpStatus } from '@nestjs/common';
import type { ErrorCode } from '../types/error-code';

export class AppException extends HttpException {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    status: number = HttpStatus.BAD_REQUEST,
  ) {
    super({ code, message }, status);
  }
}
