import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { LoginRequest } from '../../models/api.models';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent implements OnInit {
  loginData: LoginRequest = {
    login: '',
    password: ''
  };
  loading = false;
  errorMessage = ''; // Mantido por compatibilidade interna, embora o HTML tenha sido limpo
  infoMessage = '';

  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private notificationService = inject(NotificationService);

  constructor() {
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/dashboard']);
    }
  }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['expired'] === 'true') {
        this.infoMessage = 'Sua sessão expirou. Por favor, faça login novamente para continuar.';
      }
    });
  }

  onSubmit(event: Event) {
    event.preventDefault();
    if (!this.loginData.login || !this.loginData.password) {
      this.notificationService.showError('Por favor, preencha todos os campos.');
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    this.authService.login(this.loginData).subscribe({
      next: () => {
        const redirectUrl = this.authService.getAndClearRedirectUrl();
        this.router.navigate([redirectUrl || '/dashboard']);
      },
      error: (err) => {
        this.loading = false;
        // A notificação de erro já é tratada pelo authInterceptor
        console.error('Login error', err);
      }
    });
  }
}
