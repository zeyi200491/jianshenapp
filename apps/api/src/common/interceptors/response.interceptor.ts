import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { map, Observable } from 'rxjs';
import { serializeValue } from '../utils/serialize.util';

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, unknown> {
  intercept(_context: ExecutionContext, next: CallHandler<T>): Observable<unknown> {
    return next.handle().pipe(
      map((data) => {
        if (data && typeof data === 'object' && 'code' in (data as Record<string, unknown>) && 'message' in (data as Record<string, unknown>)) {
          return data;
        }

        return {
          code: 'OK',
          message: 'success',
          data: serializeValue(data),
        };
      }),
    );
  }
}
