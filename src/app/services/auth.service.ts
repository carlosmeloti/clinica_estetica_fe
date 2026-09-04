import { Injectable, signal, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { ApiService } from '../services/api.service';
import { LoginRequest, TokenResponse } from '../models/api.models';
import { tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly TOKEN_KEY = 'auth_token';
  private readonly USER_NAME_KEY = 'user_name';
  private readonly USER_PROFILE_KEY = 'user_profile';
  private readonly REDIRECT_URL_KEY = 'redirect_url';
  private platformId = inject(PLATFORM_ID);

  currentUser = signal<string | null>(this.getToken());
  userName = signal<string | null>(this.getUserName());
  userProfile = signal<string | null>(this.getUserProfile());

  constructor(private apiService: ApiService, private router: Router) {}

  login(request: LoginRequest) {
    return this.apiService.login(request).pipe(
      tap((response: TokenResponse) => {
        if (isPlatformBrowser(this.platformId)) {
          localStorage.setItem(this.TOKEN_KEY, response.token);
          localStorage.setItem(this.USER_NAME_KEY, response.nome);
          localStorage.setItem(this.USER_PROFILE_KEY, response.perfil);
        }
        this.currentUser.set(response.token);
        this.userName.set(response.nome);
        this.userProfile.set(response.perfil);
      })
    );
  }

  logout() {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem(this.TOKEN_KEY);
      localStorage.removeItem(this.USER_NAME_KEY);
      localStorage.removeItem(this.USER_PROFILE_KEY);
      // Não remover REDIRECT_URL_KEY aqui, pois pode ter sido definido logo antes do logout por expiração
    }
    this.currentUser.set(null);
    this.userName.set(null);
    this.userProfile.set(null);
    if (!this.router.url.includes('/login')) {
      this.router.navigate(['/login']);
    }
  }

  setRedirectUrl(url: string) {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(this.REDIRECT_URL_KEY, url);
    }
  }

  getAndClearRedirectUrl(): string | null {
    if (isPlatformBrowser(this.platformId)) {
      const url = localStorage.getItem(this.REDIRECT_URL_KEY);
      localStorage.removeItem(this.REDIRECT_URL_KEY);
      return url;
    }
    return null;
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  getToken(): string | null {
    if (isPlatformBrowser(this.platformId)) {
      return localStorage.getItem(this.TOKEN_KEY);
    }
    return null;
  }

  getUserName(): string | null {
    if (isPlatformBrowser(this.platformId)) {
      return localStorage.getItem(this.USER_NAME_KEY);
    }
    return null;
  }

  getUserProfile(): string | null {
    if (isPlatformBrowser(this.platformId)) {
      return localStorage.getItem(this.USER_PROFILE_KEY);
    }
    return null;
  }
}
