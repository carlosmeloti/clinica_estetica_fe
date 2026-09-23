import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { Procedimento, Insumo, LocalAplicacao, UsuarioResponse, PerfilUsuario } from '../../models/api.models';
import { NotificationService } from '../../services/notification.service';
import { ProfissionalDialogComponent } from './profissional-dialog.component';
import { ProcedimentoDialogComponent } from './procedimento-dialog.component';
import { InsumoDialogComponent } from './insumo-dialog.component';

@Component({
  selector: 'app-configuracoes',
  standalone: true,
  imports: [
    CommonModule,
    MatTabsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatDialogModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './configuracoes.component.html',
  styles: ``
})
export class ConfiguracoesComponent implements OnInit {
  private apiService = inject(ApiService);
  private dialog = inject(MatDialog);
  private notificationService = inject(NotificationService);
  public authService = inject(AuthService);

  procedimentos: Procedimento[] = [];
  insumos: Insumo[] = [];
  locais: LocalAplicacao[] = [];
  profissionais: UsuarioResponse[] = [];
  loadingProfissionais = signal(false);

  ngOnInit(): void {
    this.carregarDados();
  }

  carregarDados(): void {
    this.apiService.listarProcedimentos().subscribe(p => this.procedimentos = p);
    this.apiService.listarInsumos().subscribe(i => this.insumos = i);
    this.apiService.listarLocais().subscribe(l => this.locais = l);
    if (this.authService.userProfile() === 'ADMIN') {
      this.carregarProfissionais();
    }
  }

  carregarProfissionais(): void {
    this.loadingProfissionais.set(true);
    this.apiService.listarUsuarios().subscribe({
      next: (res) => {
        this.profissionais = res;
        this.loadingProfissionais.set(false);
      },
      error: (err) => {
        console.error('Erro ao carregar profissionais', err);
        this.loadingProfissionais.set(false);
      }
    });
  }

  novoProfissional(): void {
    const dialogRef = this.dialog.open(ProfissionalDialogComponent, {
      width: '600px',
      maxWidth: '95vw',
      panelClass: 'modern-dialog-container',
      data: { usuario: null }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.apiService.criarUsuario(result).subscribe({
          next: () => {
            this.notificationService.showSuccess('Profissional cadastrado com sucesso!');
            this.carregarProfissionais();
          },
          error: (err) => {
            console.error('Erro ao criar profissional', err);
          }
        });
      }
    });
  }

  editarProfissional(usuario: UsuarioResponse): void {
    const dialogRef = this.dialog.open(ProfissionalDialogComponent, {
      width: '600px',
      maxWidth: '95vw',
      panelClass: 'modern-dialog-container',
      data: { usuario }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && usuario.id != null) {
        this.apiService.atualizarUsuario(usuario.id, result).subscribe({
          next: () => {
            this.notificationService.showSuccess('Profissional atualizado com sucesso!');
            this.carregarProfissionais();
          },
          error: (err) => console.error('Erro ao atualizar profissional', err)
        });
      }
    });
  }

  excluirProfissional(usuario: UsuarioResponse): void {
    if (usuario.id == null) {
      console.error('Usuário sem id; não é possível excluir.');
      return;
    }
    if (confirm(`Tem certeza que deseja excluir o profissional ${usuario.nome}?`)) {
      this.apiService.deletarUsuario(usuario.id).subscribe({
        next: () => {
          this.notificationService.showSuccess('Profissional excluído com sucesso!');
          this.carregarProfissionais();
        },
        error: (err) => console.error('Erro ao excluir profissional', err)
      });
    }
  }

  novoProcedimento(): void {
    const dialogRef = this.dialog.open(ProcedimentoDialogComponent, {
      width: '520px',
      maxWidth: '95vw',
      panelClass: 'modern-dialog-container',
      data: { procedimento: null }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.apiService.criarProcedimento(result).subscribe({
          next: () => {
            this.notificationService.showSuccess('Procedimento cadastrado com sucesso!');
            this.apiService.listarProcedimentos().subscribe(p => this.procedimentos = p);
          },
          error: (err) => console.error('Erro ao criar procedimento', err)
        });
      }
    });
  }

  novoInsumo(): void {
    const dialogRef = this.dialog.open(InsumoDialogComponent, {
      width: '520px',
      maxWidth: '95vw',
      panelClass: 'modern-dialog-container',
      data: { insumo: null }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.apiService.criarInsumo(result).subscribe({
          next: () => {
            this.notificationService.showSuccess('Insumo cadastrado com sucesso!');
            this.apiService.listarInsumos().subscribe(i => this.insumos = i);
          },
          error: (err) => console.error('Erro ao criar insumo', err)
        });
      }
    });
  }

  novoLocal(): void { console.log('Novo local'); }

  rotuloPerfil(perfil: string): string {
    const labels: Record<PerfilUsuario, string> = {
      ADMIN: 'Administrador',
      PROFISSIONAL: 'Profissional',
      RECEPCAO: 'Recepcionista',
      FINANCEIRO: 'Gestor Financeiro'
    };
    return labels[perfil as PerfilUsuario] ?? perfil;
  }
}
