import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { DiagnosticsService } from '../../features/diagnostics/diagnostics.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const diagnosticsService = inject(DiagnosticsService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let errorMessage = 'Unknown network or simulation error';
      if (error.error instanceof ErrorEvent) {
        errorMessage = `Client error: ${error.error.message}`;
      } else {
        const detail = error.error?.detail ? JSON.stringify(error.error.detail) : error.message;
        errorMessage = `HTTP ${error.status} [${req.method} ${req.url}]: ${detail}`;
      }

      diagnosticsService.recordError({
        timestamp: new Date().toISOString(),
        status: error.status,
        url: req.url,
        message: errorMessage,
        raw: error.error
      });

      return throwError(() => error);
    })
  );
};
