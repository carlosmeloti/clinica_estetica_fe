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

  // Se o token estiver expirado localmente, nem envia a request e desloga
  if (token && authService.isTokenExpired(token)) {
    authService.logout();
    const currentUrl = router.url;
    if (!currentUrl.includes('/login')) {
      authService.setRedirectUrl(currentUrl);
      router.navigate(['/login'], { queryParams: { expired: 'true' } });
      notificationService.showError('Sua sessão expirou. Por favor, faça login novamente.');
    }
    return throwError(() => new Error('JWT Expired'));
  }

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

      // 401 Unauthorized, 403 Forbidden ou 500 com mensagem de token expirado
      if (error.status === 401 || error.status === 403 || (error.status === 500 && (errorMessage.includes('ExpiredJwtException') || errorMessage.includes('JWT expired')))) {
        const currentUrl = router.url;
        if (!currentUrl.includes('/login')) {
          authService.setRedirectUrl(currentUrl);
          if (error.status === 401 || (error.status === 500 && (errorMessage.includes('ExpiredJwtException') || errorMessage.includes('JWT expired')))) {
            router.navigate(['/login'], { queryParams: { expired: 'true' } });
            errorMessage = 'Sua sessão expirou. Por favor, faça login novamente.';
          } else {
            errorMessage = 'Você não tem permissão para acessar este recurso.';
          }
        }
        if (error.status === 401 || (error.status === 500 && (errorMessage.includes('ExpiredJwtException') || errorMessage.includes('JWT expired')))) {
          authService.logout();
        }
      }

      notificationService.showError(errorMessage);

      if (error.status === 409) {
        // Conflito de regra de negócio, ex: agendamento duplicado
        return throwError(() => ({ ...error, friendlyMessage: errorMessage }));
      }

      return throwError(() => error);
    })
  );
};
