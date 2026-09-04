import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { NotificationService } from '../services/notification.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const notificationService = inject(NotificationService);
  const token = authService.getToken();

  let authReq = req;
  if (token) {
    authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      let errorMessage = 'Ocorreu um erro inesperado no servidor. Tente novamente mais tarde.';

      if (error.error && error.error.mensagem) {
        errorMessage = error.error.mensagem;
      } else if (error.error && error.error.message) {
        // Fallback para 'message' caso ocorra em algum endpoint legado ou externo
        errorMessage = error.error.message;
      }

      // 401 Unauthorized ou 500 com mensagem de token expirado
      if (error.status === 401 || (error.status === 500 && (errorMessage.includes('ExpiredJwtException') || errorMessage.includes('JWT expired')))) {
        const currentUrl = router.url;
        if (!currentUrl.includes('/login')) {
          authService.setRedirectUrl(currentUrl);
          router.navigate(['/login'], { queryParams: { expired: 'true' } });
        }
        authService.logout();
        errorMessage = 'Sua sessão expirou. Por favor, faça login novamente.';
      }

      notificationService.showError(errorMessage);
      return throwError(() => error);
    })
  );
};
