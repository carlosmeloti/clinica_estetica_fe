import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ApiService } from '../../services/api.service';
import { NotificationService } from '../../services/notification.service';
import { Agendamento, Paciente, EvolucaoEstetica, Procedimento, Insumo, LocalAplicacao } from '../../models/api.models';
import { forkJoin, catchError, of } from 'rxjs';

@Component({
  selector: 'app-atendimento',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDividerModule,
    MatChipsModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './atendimento.component.html',
  styleUrl: './atendimento.component.scss'
})
export class AtendimentoComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private apiService = inject(ApiService);
  private notificationService = inject(NotificationService);

  agendamentoId!: number;
  agendamento?: Agendamento;
  paciente?: Paciente;
  evolucao?: EvolucaoEstetica;
  procedimentos: Procedimento[] = [];
  locais: LocalAplicacao[] = [];
  insumos: Insumo[] = [];

  atendimentoForm: FormGroup;
  loading = false;
  finalizando = false;

  constructor() {
    this.atendimentoForm = this.fb.group({
      relatoClinico: ['', [Validators.required]],
      observacoes: [''],
      orientacoesPosProcedimento: [''],
      intercorrencias: [''],
      retornoRecomendado: [''],
      procedimentosRealizadosIds: [[]],
      locaisIds: [[]],
      consumos: [[]]
    });
  }

  ngOnInit(): void {
    this.agendamentoId = Number(this.route.snapshot.paramMap.get('id'));
    if (!this.agendamentoId) {
      this.notificationService.showError('Agendamento não identificado.');
      this.router.navigate(['/agendamentos']);
      return;
    }
    this.carregarDados();
  }

  carregarDados(): void {
    this.loading = true;
    forkJoin({
      agendamento: this.apiService.buscarAgendamento(this.agendamentoId),
      procedimentos: this.apiService.listarProcedimentos(),
      locais: this.apiService.listarLocais(),
      insumos: this.apiService.listarInsumos(),
      evolucao: this.apiService.buscarEvolucaoPorAgendamento(this.agendamentoId).pipe(catchError(() => of(null)))
    }).subscribe({
      next: (res) => {
        this.agendamento = res.agendamento;

        // Tratamento de resposta robusto para listas
        this.procedimentos = Array.isArray(res.procedimentos) ? res.procedimentos : (res.procedimentos as any)?.content || [];
        this.locais = Array.isArray(res.locais) ? res.locais : (res.locais as any)?.content || [];
        this.insumos = Array.isArray(res.insumos) ? res.insumos : (res.insumos as any)?.content || [];

        this.evolucao = res.evolucao || undefined;

        if (this.evolucao) {
          this.atendimentoForm.patchValue(this.evolucao);
          if (this.evolucao.finalizado) {
            this.atendimentoForm.disable();
          }
        } else {
          // Preenche procedimentos realizados com os previstos inicialmente
          this.atendimentoForm.patchValue({
            procedimentosRealizadosIds: this.agendamento.procedimentosIds || []
          });
        }

        const pacienteId = this.agendamento.pacienteId ?? this.agendamento.paciente?.id;
        if (pacienteId != null) {
          this.apiService.buscarPaciente(pacienteId).subscribe({
            next: p => this.paciente = p,
            error: err => console.error('Erro ao buscar dados do paciente', err)
          });
        }
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        console.error('Erro ao carregar dados do atendimento', err);
      }
    });
  }

  getProcedimentosNomes(ids: number[]): string {
    return ids.map(id => this.procedimentos.find(p => p.id === id)?.nome || id).join(', ');
  }

  salvar(): void {
    if (this.atendimentoForm.invalid) return;

    this.loading = true;
    const dados: EvolucaoEstetica = {
      ...this.atendimentoForm.getRawValue(),
      agendamentoId: this.agendamentoId,
      pacienteId: this.agendamento!.pacienteId,
      profissionalId: this.agendamento!.profissionalId,
      id: this.evolucao?.id
    };

    const request = dados.id
      ? this.apiService.atualizarEvolucao(dados.id, dados)
      : this.apiService.criarEvolucao(dados);

    request.subscribe({
      next: (res) => {
        this.evolucao = res;
        this.loading = false;
        this.notificationService.showSuccess('Atendimento salvo com sucesso!');
      },
      error: () => {
        this.loading = false;
        this.notificationService.showError('Erro ao salvar atendimento.');
      }
    });
  }

  finalizar(): void {
    if (this.atendimentoForm.invalid) {
      this.atendimentoForm.markAllAsTouched();
      return;
    }

    if (!confirm('Deseja finalizar o atendimento? Após a finalização, não será possível editar.')) return;

    this.finalizando = true;
    const dados: EvolucaoEstetica = {
      ...this.atendimentoForm.getRawValue(),
      agendamentoId: this.agendamentoId,
      pacienteId: this.agendamento!.pacienteId,
      profissionalId: this.agendamento!.profissionalId,
      id: this.evolucao?.id
    };

    const saveRequest = dados.id
      ? this.apiService.atualizarEvolucao(dados.id, dados)
      : this.apiService.criarEvolucao(dados);

    saveRequest.subscribe({
      next: (res) => {
        this.apiService.finalizarEvolucao(res.id!).subscribe({
          next: () => {
            this.finalizando = false;
            this.notificationService.showSuccess('Atendimento finalizado com sucesso!');
            if (confirm('Ir para o caixa para receber o pagamento?')) {
              this.router.navigate(['/caixa'], {
                queryParams: { agendamentoId: this.agendamentoId, tab: 'pendentes' }
              });
            } else {
              this.router.navigate(['/agendamentos']);
            }
          },
          error: () => {
            this.finalizando = false;
            this.notificationService.showError('Erro ao finalizar atendimento.');
          }
        });
      },
      error: () => {
        this.finalizando = false;
        this.notificationService.showError('Erro ao salvar antes de finalizar.');
      }
    });
  }

  voltar(): void {
    this.router.navigate(['/agendamentos']);
  }

  irParaCaixa(): void {
    this.router.navigate(['/caixa'], {
      queryParams: { agendamentoId: this.agendamentoId, tab: 'pendentes' }
    });
  }
}
