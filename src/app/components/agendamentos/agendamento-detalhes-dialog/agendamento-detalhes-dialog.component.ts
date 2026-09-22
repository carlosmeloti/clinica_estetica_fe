import { Component, Inject, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ApiService } from '../../../services/api.service';
import { Agendamento, Procedimento, Paciente } from '../../../models/api.models';
import { AgendamentoDialogComponent } from '../agendamento-dialog/agendamento-dialog.component';
import { NotificationService } from '../../../services/notification.service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-agendamento-detalhes-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatChipsModule,
    MatProgressSpinnerModule
  ],
  template: `
    <h2 mat-dialog-title>Detalhes do Agendamento</h2>
    <mat-dialog-content class="detalhes-container">
      <div *ngIf="loading" class="loading-overlay">
        <mat-spinner diameter="40"></mat-spinner>
      </div>
      <div class="info-group">
        <label>Paciente:</label>
        <span>{{ paciente?.nome || 'Carregando...' }}</span>
      </div>
      <div class="info-group">
        <label>Procedimentos:</label>
        <mat-chip-set>
          @for (p of procedimentos; track p.id) {
            <mat-chip>{{ p.nome }}</mat-chip>
          }
        </mat-chip-set>
      </div>
      <div class="info-group">
        <label>Horário:</label>
        <span>{{ agendamento.dataHoraInicio | date:'dd/MM/yyyy HH:mm' }} até {{ agendamento.dataHoraFim | date:'HH:mm' }}</span>
      </div>
      <div class="info-group">
        <label>Status:</label>
        <span [class]="'status-badge ' + agendamento.status">{{ agendamento.status }}</span>
      </div>
      <div class="info-group" *ngIf="agendamento.motivoConsulta">
        <label>Motivo:</label>
        <p>{{ agendamento.motivoConsulta }}</p>
      </div>

      <mat-divider></mat-divider>

      <div class="acoes-ciclo-vida">
        <button mat-stroked-button color="primary" *ngIf="podeConfirmar()" (click)="confirmar()">
          Confirmar
        </button>
        <button mat-stroked-button color="accent" *ngIf="podeIniciar()" (click)="iniciar()">
          Iniciar Atendimento
        </button>
        <button mat-stroked-button class="btn-concluir" *ngIf="podeConcluir()" (click)="concluir()">
          Concluir
        </button>
        <button mat-stroked-button color="warn" *ngIf="podeCancelar()" (click)="cancelar()">
          Cancelar
        </button>
        <button mat-stroked-button color="warn" *ngIf="podeMarcarFalta()" (click)="marcarFalta()">
          Não Compareceu
        </button>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="editar()" [disabled]="agendamento.status === 'CONCLUIDO' || agendamento.status === 'CANCELADO'">
        <mat-icon>edit</mat-icon> Editar
      </button>
      <button mat-button mat-dialog-close>Fechar</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .detalhes-container {
      display: flex;
      flex-direction: column;
      gap: 15px;
      min-width: 400px;
    }
    .info-group {
      display: flex;
      flex-direction: column;
    }
    .info-group label {
      font-weight: bold;
      font-size: 0.9em;
      color: #666;
    }
    .status-badge {
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 0.85em;
      width: fit-content;
      font-weight: 500;
    }
    .AGENDADO { background: #e8eaf6; color: #3f51b5; }
    .CONFIRMADO { background: #e8f5e9; color: #4caf50; }
    .EM_ATENDIMENTO { background: #fff3e0; color: #ff9800; }
    .CONCLUIDO { background: #f5f5f5; color: #9e9e9e; }
    .CANCELADO { background: #ffe0b2; color: #f44336; }
    .NAO_COMPARECEU { background: #efebe9; color: #795548; }

    .acoes-ciclo-vida {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 10px;
    }
    .btn-concluir {
      border-color: #4caf50 !important;
      color: #4caf50 !important;
    }
  `]
})
export class AgendamentoDetalhesDialogComponent implements OnInit {
  private apiService = inject(ApiService);
  private dialog = inject(MatDialog);
  private notificationService = inject(NotificationService);

  agendamento: Agendamento;
  paciente?: Paciente;
  procedimentos: Procedimento[] = [];
  loading = false;

  constructor(
    public dialogRef: MatDialogRef<AgendamentoDetalhesDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { agendamento: Agendamento }
  ) {
    this.agendamento = data.agendamento;
  }

  ngOnInit(): void {
    this.carregarDados();
  }

  carregarDados() {
    this.apiService.buscarPaciente(this.agendamento.pacienteId).subscribe(p => this.paciente = p);

    if (this.agendamento.procedimentosIds?.length) {
      forkJoin(
        this.agendamento.procedimentosIds.map(id => this.apiService.listarProcedimentos())
      ).subscribe(res => {
        // Nota: O backend deveria ter um buscarProcedimento(id).
        // Como não vi no ApiService, vou filtrar da lista.
        const listaCompleta = res[0];
        this.procedimentos = listaCompleta.filter(p => this.agendamento.procedimentosIds.includes(p.id!));
      });
    }
  }

  podeConfirmar() { return this.agendamento.status === 'AGENDADO'; }
  podeIniciar() { return ['AGENDADO', 'CONFIRMADO'].includes(this.agendamento.status!); }
  podeConcluir() { return this.agendamento.status === 'EM_ATENDIMENTO'; }
  podeCancelar() { return !['CONCLUIDO', 'CANCELADO'].includes(this.agendamento.status!); }
  podeMarcarFalta() { return ['AGENDADO', 'CONFIRMADO'].includes(this.agendamento.status!); }

  confirmar() {
    this.loading = true;
    this.apiService.confirmarAgendamento(this.agendamento.id!).subscribe({
      next: () => {
        this.loading = false;
        this.notificationService.showSuccess('Agendamento confirmado!');
        this.atualizarLocal('CONFIRMADO');
      },
      error: () => this.loading = false
    });
  }

  iniciar() {
    this.loading = true;
    const atualizado = { ...this.agendamento, status: 'EM_ATENDIMENTO' as any };
    this.apiService.atualizarAgendamento(this.agendamento.id!, atualizado).subscribe({
      next: () => {
        this.loading = false;
        this.notificationService.showSuccess('Atendimento iniciado!');
        this.atualizarLocal('EM_ATENDIMENTO');
      },
      error: () => this.loading = false
    });
  }

  concluir() {
    this.loading = true;
    this.apiService.concluirAgendamento(this.agendamento.id!).subscribe({
      next: () => {
        this.loading = false;
        this.notificationService.showSuccess('Agendamento concluído!');
        this.atualizarLocal('CONCLUIDO');
      },
      error: () => this.loading = false
    });
  }

  cancelar() {
    if (confirm('Deseja realmente cancelar este agendamento?')) {
      this.loading = true;
      this.apiService.cancelarAgendamento(this.agendamento.id!).subscribe({
        next: () => {
          this.loading = false;
          this.notificationService.showSuccess('Agendamento cancelado!');
          this.atualizarLocal('CANCELADO');
        },
        error: () => this.loading = false
      });
    }
  }

  marcarFalta() {
    this.loading = true;
    this.apiService.marcarNaoCompareceu(this.agendamento.id!).subscribe({
      next: () => {
        this.loading = false;
        this.notificationService.showSuccess('Paciente marcado como faltoso.');
        this.atualizarLocal('NAO_COMPARECEU');
      },
      error: () => this.loading = false
    });
  }

  private atualizarLocal(novoStatus: any) {
    this.agendamento.status = novoStatus;
    this.dialogRef.close(true);
  }

  editar() {
    const editRef = this.dialog.open(AgendamentoDialogComponent, {
      width: '500px',
      data: { agendamento: this.agendamento }
    });

    editRef.afterClosed().subscribe(result => {
      if (result) {
        this.apiService.atualizarAgendamento(this.agendamento.id!, result).subscribe(() => {
          this.dialogRef.close(true);
        });
      }
    });
  }
}
