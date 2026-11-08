import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from '../interfaces/api-response.interface.js';

interface ResultPayload {
  message?: string;
  data?: unknown;
  [key: string]: unknown;
}

@Injectable()
export class TransformResponseInterceptor<T>
  implements NestInterceptor<T, ApiResponse<unknown>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiResponse<unknown>> {
    const httpContext = context.switchToHttp();
    const response = httpContext.getResponse<{ statusCode: number }>();
    const statusCode = response.statusCode || 200;

    return next.handle().pipe(
      map((result: unknown): ApiResponse<unknown> => {
        let message = 'Thành công';
        let data: unknown = result;

        if (
          result !== null &&
          typeof result === 'object' &&
          !Array.isArray(result)
        ) {
          const payload = result as ResultPayload;
          if (typeof payload.message === 'string') {
            message = payload.message;
            if ('data' in payload) {
              data = payload.data;
            } else {
              const { message: _m, ...rest } = payload;
              data = Object.keys(rest).length > 0 ? rest : null;
            }
          }
        }

        return {
          statusCode,
          message,
          data,
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}

