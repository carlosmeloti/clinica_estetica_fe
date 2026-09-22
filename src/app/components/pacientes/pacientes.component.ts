import { Component, OnInit, inject, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatPaginatorIntl } from '@angular/material/paginator';
import { ApiService } from '../../services/api.service';
import { Paciente, Agendamento, EvolucaoEstetica, Procedimento } from '../../models/api.models';
import { NotificationService } from '../../services/notification.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-pacientes',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatTabsModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './pacientes.component.html',
  styleUrl: './pacientes.component.scss',
  encapsulation: ViewEncapsulation.None
})
export class PacientesComponent implements OnInit {
  private apiService = inject(ApiService);
  private fb = inject(FormBuilder);
  private notificationService = inject(NotificationService);
  private router = inject(Router);

  pacientes: Paciente[] = [];
  totalElements = 0;
  pageSize = 10;
  pageIndex = 0;
  termoPesquisa = '';
  loading = false;

  pacienteForm: FormGroup;
  pacienteSelecionado: Paciente | null = null;
  historicoAgendamentos: Agendamento[] = [];
  historicoEvolucoes: EvolucaoEstetica[] = [];
  procedimentos: Procedimento[] = [];

  displayedColumns: string[] = ['nome', 'cpf', 'email', 'telefone'];

  constructor() {
    this.pacienteForm = this.fb.group({
      id: [{ value: null, disabled: true }],
      nome: ['', [Validators.required, Validators.minLength(3)]],
      cpf: ['', [Validators.pattern(/^\d{3}\.\d{3}\.\d{3}-\d{2}$|^\d{11}$/)]],
      dataNascimento: [''],
      tipoSanguineo: [''],
      nomeResponsavel: [''],
      email: ['', [Validators.email]],
      telefone: ['', [Validators.pattern(/^\(?\d{2}\)?\s?\d{4,5}-?\d{4}$/)]],
      endereco: this.fb.group({
        logradouro: [''],
        numero: [''],
        bairro: [''],
        cidade: [''],
        estado: [''],
        complemento: [''],
        cep: ['']
      }),
      observacoesGerais: ['']
    });

    const paginatorIntl = inject(MatPaginatorIntl);
    paginatorIntl.itemsPerPageLabel = 'Itens por página:';
    paginatorIntl.nextPageLabel = 'Próxima';
    paginatorIntl.previousPageLabel = 'Anterior';
  }

  ngOnInit(): void {
    this.carregarPacientes();
    this.apiService.listarProcedimentos().subscribe(res => this.procedimentos = res);
  }

  carregarPacientes(): void {
    this.loading = true;
    this.apiService.buscarPacientesPorCriterios(this.termoPesquisa, undefined, undefined, this.pageIndex, this.pageSize, 'nome,asc').subscribe({
      next: (page) => {
        if (page && page.content) {
          this.pacientes = page.content;
          this.totalElements = page.totalElements || 0;
        } else if (Array.isArray(page)) {
          // Fallback caso o backend retorne array direto (não paginado)
          this.pacientes = page;
          this.totalElements = page.length;
        } else {
          this.pacientes = [];
          this.totalElements = 0;
        }
        this.loading = false;
      },
      error: (error) => {
        this.loading = false;
        // O erro já deve ter sido mostrado pelo Interceptor, mas garantimos aqui se necessário
        console.error('Erro ao carregar pacientes', error);
      }
    });
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.carregarPacientes();
  }

  pesquisar(): void {
    this.pageIndex = 0;
    this.carregarPacientes();
  }

  novoPaciente(): void {
    this.pacienteSelecionado = null;
    this.pacienteForm.reset();
  }

  selecionarPaciente(paciente: Paciente): void {
    this.pacienteSelecionado = paciente;
    this.pacienteForm.patchValue(paciente);
    this.carregarHistorico(paciente.id!);
  }

  carregarHistorico(pacienteId: number): void {
    this.apiService.listarAgendamentosPorPaciente(pacienteId).subscribe({
      next: (res) => {
        const agendamentos = Array.isArray(res) ? res : (res as any)?.content || [];
        this.historicoAgendamentos = agendamentos.sort((a: Agendamento, b: Agendamento) => new Date(b.dataHoraInicio).getTime() - new Date(a.dataHoraInicio).getTime());
      },
      error: (err) => console.error('Erro ao carregar histórico de agendamentos', err)
    });
    this.apiService.buscarEvolucoesPorPaciente(pacienteId).subscribe({
      next: (res) => {
        const evolucoes = Array.isArray(res) ? res : (res as any)?.content || [];
        this.historicoEvolucoes = evolucoes.sort((a: EvolucaoEstetica, b: EvolucaoEstetica) => new Date(b.dataAtendimento || 0).getTime() - new Date(a.dataAtendimento || 0).getTime());
      },
      error: (err) => console.error('Erro ao carregar histórico de evoluções', err)
    });
  }

  getProcedimentosNomes(ids: number[]): string {
    return ids.map(id => this.procedimentos.find(p => p.id === id)?.nome || id).join(', ');
  }

  verAtendimento(agendamentoId: number): void {
    this.router.navigate(['/agendamentos', agendamentoId, 'atendimento']);
  }

  salvar(): void {
    if (this.pacienteForm.invalid) {
      this.pacienteForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    const dados = this.pacienteForm.getRawValue();
    if (this.pacienteSelecionado && this.pacienteSelecionado.id) {
      this.apiService.atualizarPaciente(this.pacienteSelecionado.id, dados).subscribe({
        next: () => {
          this.loading = false;
          this.carregarPacientes();
          this.notificationService.showSuccess('Paciente atualizado com sucesso!');
        },
        error: (err) => {
          this.loading = false;
          console.error('Erro ao atualizar paciente', err);
        }
      });
    } else {
      this.apiService.criarPaciente(dados).subscribe({
        next: () => {
          this.loading = false;
          this.novoPaciente();
          this.carregarPacientes();
          this.notificationService.showSuccess('Paciente criado com sucesso!');
        },
        error: (err) => {
          this.loading = false;
          console.error('Erro ao criar paciente', err);
        }
      });
    }
  }

  deletarPaciente(): void {
    if (!this.pacienteSelecionado || !this.pacienteSelecionado.id) return;

    if (confirm('Tem certeza que deseja excluir este paciente?')) {
      this.apiService.deletarPaciente(this.pacienteSelecionado.id).subscribe(() => {
        this.novoPaciente();
        this.carregarPacientes();
      });
    }
  }
}
