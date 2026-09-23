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
import { Procedimento, Insumo, LocalAplicacao, UsuarioResponse } from '../../models/api.models';
import { NotificationService } from '../../services/notification.service';
import { ProfissionalDialogComponent } from './profissional-dialog.component';

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
        this.profissionais = Array.isArray(res) ? res : (res as any)?.content || [];
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
      width: '600px'
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
            // Notification service handles generic errors, but we could add specific ones here
          }
        });
      }
    });
  }

  editarProfissional(usuario: UsuarioResponse): void {
    const dialogRef = this.dialog.open(ProfissionalDialogComponent, {
      width: '600px',
      data: { usuario }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.apiService.atualizarUsuario(usuario.login, result).subscribe({
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
    if (confirm(`Tem certeza que deseja excluir o profissional ${usuario.nome}?`)) {
      this.apiService.deletarUsuario(usuario.login).subscribe({
        next: () => {
          this.notificationService.showSuccess('Profissional excluído com sucesso!');
          this.carregarProfissionais();
        },
        error: (err) => console.error('Erro ao excluir profissional', err)
      });
    }
  }

  novoProcedimento(): void { console.log('Novo proc'); }
  novoInsumo(): void { console.log('Novo insumo'); }
  novoLocal(): void { console.log('Novo local'); }
}
