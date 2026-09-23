import { Component, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Observable } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import { AuthService } from './services/auth.service';
import { computed } from '@angular/core';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatSidenavModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatDividerModule
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'Clínica Estética';

  private breakpointObserver = inject(BreakpointObserver);
  public authService = inject(AuthService);

  userName = computed(() => this.authService.userName() || 'Usuário');

  userProfileLabel = computed(() => {
    const profile = this.authService.userProfile();
    if (!profile) return '';

    const profileMap: { [key: string]: string } = {
      'ADMIN': 'Administrador',
      'PROFISSIONAL': 'Profissional',
      'RECEPCAO': 'Recepcionista',
      'FINANCEIRO': 'Gestor Financeiro'
    };

    return profileMap[profile] || profile;
  });

  userInitials = computed(() => {
    const name = this.authService.userName();
    if (!name) return 'U';

    const names = name.split(' ');
    if (names.length >= 2) {
      return (names[0][0] + names[names.length - 1][0]).toUpperCase();
    }
    return name[0].toUpperCase();
  });

  isHandset$: Observable<boolean> = this.breakpointObserver.observe(Breakpoints.Handset)
    .pipe(
      map(result => result.matches),
      shareReplay()
    );

  menuItems = [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/pacientes', label: 'Pacientes' },
    { path: '/agendamentos', label: 'Agendamentos' },
    { path: '/caixa', label: 'Caixa' },
    { path: '/configuracoes', label: 'Configurações' }
  ];

  logout() {
    this.authService.logout();
  }
}
