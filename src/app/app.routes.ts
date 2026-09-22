import { Routes } from '@angular/router';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { PacientesComponent } from './components/pacientes/pacientes.component';
import { AgendamentosComponent } from './components/agendamentos/agendamentos.component';
import { ConfiguracoesComponent } from './components/configuracoes/configuracoes.component';
import { LoginComponent } from './components/login/login.component';
import { authGuard } from './guards/auth.guard';

import { AtendimentoComponent } from './components/atendimentos/atendimento.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [authGuard]
  },
  {
    path: 'pacientes',
    component: PacientesComponent,
    canActivate: [authGuard]
  },
  {
    path: 'agendamentos',
    component: AgendamentosComponent,
    canActivate: [authGuard]
  },
  {
    path: 'agendamentos/:id/atendimento',
    component: AtendimentoComponent,
    canActivate: [authGuard]
  },
  {
    path: 'configuracoes',
    component: ConfiguracoesComponent,
    canActivate: [authGuard]
  },
  { path: '**', redirectTo: 'dashboard' }
];
