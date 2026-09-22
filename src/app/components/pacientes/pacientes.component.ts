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
import { MatPaginatorIntl } from '@angular/material/paginator';
import { ApiService } from '../../services/api.service';
import { Paciente } from '../../models/api.models';
import { NotificationService } from '../../services/notification.service';

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
    MatInputModule
  ],
  templateUrl: './pacientes.component.html',
  styleUrl: './pacientes.component.scss',
  encapsulation: ViewEncapsulation.None
})
export class PacientesComponent implements OnInit {
  private apiService = inject(ApiService);
  private fb = inject(FormBuilder);
  private notificationService = inject(NotificationService);

  pacientes: Paciente[] = [];
  totalElements = 0;
  pageSize = 10;
  pageIndex = 0;
  termoPesquisa = '';
  loading = false;

  pacienteForm: FormGroup;
  pacienteSelecionado: Paciente | null = null;

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
  }

  carregarPacientes(): void {
    this.loading = true;
    this.apiService.buscarPacientesPorCriterios(this.termoPesquisa, undefined, undefined, this.pageIndex, this.pageSize, 'nome,asc').subscribe({
      next: (page) => {
        this.pacientes = page.content || [];
        this.totalElements = page.totalElements || 0;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.notificationService.showError('Erro ao carregar pacientes.');
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
  }

  salvar(): void {
    if (this.pacienteForm.invalid) return;

    this.loading = true;
    const dados = this.pacienteForm.getRawValue();
    if (this.pacienteSelecionado && this.pacienteSelecionado.id) {
      this.apiService.atualizarPaciente(this.pacienteSelecionado.id, dados).subscribe({
        next: () => {
          this.loading = false;
          this.carregarPacientes();
          this.notificationService.showSuccess('Paciente atualizado com sucesso!');
        },
        error: () => this.loading = false
      });
    } else {
      this.apiService.criarPaciente(dados).subscribe({
        next: () => {
          this.loading = false;
          this.novoPaciente();
          this.carregarPacientes();
          this.notificationService.showSuccess('Paciente criado com sucesso!');
        },
        error: () => this.loading = false
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
