import { Component, Inject, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ApiService } from '../../../services/api.service';
import { Paciente, Procedimento, Agendamento, UsuarioResponse } from '../../../models/api.models';
import { Observable, of, debounceTime, distinctUntilChanged, switchMap, tap, finalize, catchError, filter, startWith } from 'rxjs';

@Component({
  selector: 'app-agendamento-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatAutocompleteModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatDividerModule,
    MatTooltipModule
  ],
  template: `
    <div class="dialog-header">
      <div class="header-info">
        <div class="header-icon-container">
          <mat-icon class="header-icon">calendar_today</mat-icon>
        </div>
        <div class="header-text">
          <h2 class="header-title">{{ data?.agendamento ? 'Editar Agendamento' : 'Novo Agendamento' }}</h2>
          <p class="header-subtitle">Preencha os dados para criar um novo horário na agenda</p>
        </div>
      </div>
      <button mat-icon-button (click)="onCancel()" class="close-button" matTooltip="Fechar">
        <mat-icon>close</mat-icon>
      </button>
    </div>

    <mat-dialog-content class="dialog-content">
      <form [formGroup]="agendamentoForm" class="form-container">
        <!-- Seção 1: Paciente -->
        <div class="form-section">
          <div class="section-header">
            <mat-icon class="section-icon">person</mat-icon>
            <h3 class="section-title">Paciente</h3>
          </div>

          <mat-form-field appearance="outline" class="full-width search-field">
            <mat-label>Buscar Paciente</mat-label>
            <input type="text"
                   matInput
                   [formControl]="pacienteSearchControl"
                   [matAutocomplete]="auto"
                   placeholder="Digite o nome, CPF ou telefone do paciente"
                   required>
            <mat-icon matPrefix>search</mat-icon>
            @if (pacienteSearchControl.value && !isLoadingPatients()) {
              <button matSuffix mat-icon-button aria-label="Limpar" (click)="limparPaciente($event)">
                <mat-icon>close</mat-icon>
              </button>
            }

            <mat-autocomplete #auto="matAutocomplete"
                              [displayWith]="displayPaciente"
                              (optionSelected)="onPacienteSelected($event)"
                              panelClass="paciente-autocomplete-panel"
                              (opened)="autocompletePacientesAberto.set(true)"
                              (closed)="autocompletePacientesAberto.set(false)">
              @if (isLoadingPatients()) {
                <mat-option disabled class="loading-option">
                  <mat-spinner diameter="20"></mat-spinner>
                  <span>Buscando pacientes...</span>
                </mat-option>
              }

              @if (!isLoadingPatients() && (pacienteSearchControl.value?.length || 0) < 2 && !pacienteSelecionado()) {
                 <mat-option disabled class="info-option">Digite pelo menos 2 caracteres para pesquisar</mat-option>
              }

              @for (p of filteredPacientes$ | async; track p.id) {
                <mat-option [value]="p" class="paciente-option-item">
                  <div class="paciente-option-content">
                    <span class="paciente-nome-result">{{ p.nome }}</span>
                    <div class="paciente-info-result">
                      @if (p.cpf) { <span>CPF: {{ p.cpf }}</span> }
                      @if (p.telefone) { <span> | Tel: {{ p.telefone }}</span> }
                      @if (!p.telefone && p.email) { <span> | Email: {{ p.email }}</span> }
                    </div>
                  </div>
                </mat-option>
              }

              @if (!isLoadingPatients() && (pacienteSearchControl.value?.length || 0) >= 2 && (filteredPacientes$ | async)?.length === 0) {
                <mat-option disabled class="info-option">Nenhum paciente encontrado</mat-option>
              }
            </mat-autocomplete>
          </mat-form-field>

          @if (autocompletePacientesAberto() && !pacienteSelecionado()) {
            <div class="paciente-autocomplete-spacer"></div>
          }

          @if (pacienteSelecionado()) {
            <div class="paciente-card-summary">
              <div class="paciente-card-avatar">
                <mat-icon>account_circle</mat-icon>
              </div>
              <div class="paciente-card-info">
                <span class="paciente-card-name">{{ pacienteSelecionado()?.nome }}</span>
                <div class="paciente-card-details">
                  <span class="paciente-card-detail">
                    <strong>CPF:</strong> {{ pacienteSelecionado()?.cpf || 'Não informado' }}
                  </span>
                  <span class="paciente-card-divider">|</span>
                  <span class="paciente-card-detail">
                    <strong>Telefone:</strong> {{ pacienteSelecionado()?.telefone || 'Não informado' }}
                  </span>
                </div>
              </div>
            </div>
          }
          @if (agendamentoForm.get('pacienteId')?.touched && agendamentoForm.get('pacienteId')?.invalid) {
            <mat-error class="field-error">O paciente é obrigatório</mat-error>
          }
        </div>

        <mat-divider></mat-divider>

        <!-- Seção 2: Atendimento -->
        <div class="form-section">
          <div class="section-header">
            <mat-icon class="section-icon">medical_services</mat-icon>
            <h3 class="section-title">Atendimento</h3>
          </div>

          <div class="grid-row">
            <mat-form-field appearance="outline" class="col-6">
              <mat-label>Profissional</mat-label>
              <mat-select formControlName="profissionalId" required>
                @for (u of profissionais$ | async; track u.login) {
                  <mat-option [value]="u.id || u.login">{{ u.nome }} {{ u.registroProfissional ? '(' + u.registroProfissional + ')' : '' }}</mat-option>
                }
              </mat-select>
              <mat-icon matPrefix>person_outline</mat-icon>
              @if (agendamentoForm.get('profissionalId')?.touched && agendamentoForm.get('profissionalId')?.invalid) {
                <mat-error>O profissional é obrigatório</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline" class="col-6">
              <mat-label>Procedimentos</mat-label>
              <mat-select formControlName="procedimentosIds" multiple required>
                @for (pr of procedimentos$ | async; track pr.id) {
                  <mat-option [value]="pr.id">{{ pr.nome }}</mat-option>
                }
              </mat-select>
              <mat-icon matPrefix>format_list_bulleted</mat-icon>
              @if (agendamentoForm.get('procedimentosIds')?.touched && agendamentoForm.get('procedimentosIds')?.invalid) {
                <mat-error>Selecione pelo menos um procedimento</mat-error>
              }
            </mat-form-field>
          </div>
        </div>

        <mat-divider></mat-divider>

        <!-- Seção 3: Data e Horário -->
        <div class="form-section">
          <div class="section-header">
            <mat-icon class="section-icon">schedule</mat-icon>
            <h3 class="section-title">Data e Horário</h3>
          </div>

          <div class="grid-row">
            <mat-form-field appearance="outline" class="col-6">
              <mat-label>Início</mat-label>
              <input matInput type="datetime-local" formControlName="dataHoraInicio" required>
              <mat-icon matPrefix>calendar_today</mat-icon>
              @if (agendamentoForm.get('dataHoraInicio')?.touched && agendamentoForm.get('dataHoraInicio')?.invalid) {
                <mat-error>
                  @if (agendamentoForm.get('dataHoraInicio')?.hasError('required')) { Início é obrigatório }
                  @if (agendamentoForm.get('dataHoraInicio')?.hasError('dataPassada')) { Data no passado }
                </mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline" class="col-6">
              <mat-label>Fim</mat-label>
              <input matInput type="datetime-local" formControlName="dataHoraFim" required>
              <mat-icon matPrefix>event_busy</mat-icon>
              @if (agendamentoForm.get('dataHoraFim')?.touched && agendamentoForm.get('dataHoraFim')?.invalid) {
                <mat-error>Término é obrigatório</mat-error>
              }
            </mat-form-field>
          </div>

          @if (duracaoEstimada()) {
            <div class="duration-indicator">
              <mat-icon>timer</mat-icon>
              <span>Duração estimada: <strong>{{ duracaoEstimada() }}</strong></span>
            </div>
          }

          @if (agendamentoForm.hasError('periodoInvalido')) {
            <div class="form-error-alert">
              <mat-icon>error_outline</mat-icon>
              <span>A data de término deve ser posterior à data de início.</span>
            </div>
          }
        </div>

        <mat-divider></mat-divider>

        <!-- Seção 4: Observações -->
        <div class="form-section">
          <div class="section-header">
            <mat-icon class="section-icon">notes</mat-icon>
            <h3 class="section-title">Observações</h3>
          </div>
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Motivo da Consulta / Observações</mat-label>
            <textarea matInput formControlName="motivoConsulta" rows="3" placeholder="Descreva informações importantes para o atendimento"></textarea>
          </mat-form-field>
        </div>
      </form>
    </mat-dialog-content>

    <div class="dialog-footer">
      <button mat-button (click)="onCancel()" class="btn-secondary">Cancelar</button>
      <button mat-raised-button
              color="primary"
              class="btn-primary"
              [disabled]="agendamentoForm.invalid || isSaving()"
              (click)="onSave()">
        @if (isSaving()) {
          <div class="loading-btn">
            <mat-spinner diameter="20" color="accent"></mat-spinner>
            <span>Agendando...</span>
          </div>
        } @else {
          {{ data?.agendamento ? 'Salvar Alterações' : 'Agendar' }}
        }
      </button>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      background: #fff;
      border-radius: 12px;
      overflow: hidden;
    }

    .dialog-header {
      padding: 24px 32px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background-color: #fcfcfc;
      border-bottom: 1px solid #f0f0f0;
    }

    .header-info {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .header-icon-container {
      background-color: rgba(169, 124, 110, 0.1);
      color: #A97C6E;
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .header-title {
      margin: 0;
      font-size: 20px;
      font-weight: 600;
      color: #333;
    }

    .header-subtitle {
      margin: 4px 0 0 0;
      font-size: 14px;
      color: #777;
    }

    .close-button {
      color: #999;
    }

    .dialog-content {
      padding: 32px !important;
      max-width: 760px;
      width: 100vw;
      max-height: 70vh;
    }

    .form-container {
      display: flex;
      flex-direction: column;
      gap: 32px;
    }

    .form-section {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .section-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 4px;
    }

    .section-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
      color: #A97C6E;
    }

    .section-title {
      font-size: 16px;
      font-weight: 600;
      color: #444;
      margin: 0;
    }

    .full-width {
      width: 100%;
    }

    .grid-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
    }

    .search-field {
      margin-bottom: 0;
    }

    .paciente-card-summary {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px;
      background-color: #f9f9f9;
      border: 1px solid #eee;
      border-radius: 10px;
      margin-top: -8px;
      animation: fadeIn 0.3s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-5px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .paciente-card-avatar {
      color: #A97C6E;
      display: flex;
      align-items: center;
    }

    .paciente-card-avatar mat-icon {
      font-size: 40px;
      width: 40px;
      height: 40px;
    }

    .paciente-card-name {
      display: block;
      font-weight: 600;
      font-size: 15px;
      color: #333;
    }

    .paciente-card-details {
      display: flex;
      gap: 8px;
      font-size: 13px;
      color: #666;
      margin-top: 2px;
    }

    .paciente-card-divider {
      color: #ddd;
    }

    .duration-indicator {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background-color: #f0f4f8;
      border-radius: 6px;
      color: #555;
      font-size: 13px;
      align-self: flex-start;
      margin-top: -8px;
    }

    .duration-indicator mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .form-error-alert {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px;
      background-color: #fff1f0;
      border: 1px solid #ffa39e;
      border-radius: 6px;
      color: #cf1322;
      font-size: 13px;
    }

    .form-error-alert mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .field-error {
      font-size: 12px;
      margin-top: 4px;
    }

    .paciente-autocomplete-spacer {
      height: 150px;
      flex-shrink: 0;
    }

    .dialog-footer {
      padding: 24px 32px;
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      background-color: #fcfcfc;
      border-top: 1px solid #f0f0f0;
    }

    .btn-primary {
      height: 48px;
      padding: 0 32px !important;
      border-radius: 8px !important;
      font-weight: 600 !important;
      background-color: #A97C6E !important;
      color: white !important;
    }

    .btn-secondary {
      height: 48px;
      padding: 0 24px !important;
      border-radius: 8px !important;
      font-weight: 500 !important;
      color: #666 !important;
    }

    .loading-btn {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    @media (max-width: 600px) {
      .grid-row {
        grid-template-columns: 1fr;
        gap: 0;
      }

      .dialog-header, .dialog-content, .dialog-footer {
        padding: 16px 20px !important;
      }

      .header-subtitle {
        display: none;
      }

      .paciente-card-details {
        flex-direction: column;
        gap: 2px;
      }

      .paciente-card-divider {
        display: none;
      }

      .dialog-footer {
        flex-direction: column;
      }

      .btn-primary, .btn-secondary {
        width: 100%;
      }
    }
  `]
})
export class AgendamentoDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private apiService = inject(ApiService);

  agendamentoForm: FormGroup;
  pacienteSearchControl = new FormControl('');
  filteredPacientes$!: Observable<Paciente[]>;
  isLoadingPatients = signal(false);
  pacienteSelecionado = signal<Paciente | null>(null);
  autocompletePacientesAberto = signal(false);
  isSaving = signal(false);

  duracaoEstimada = computed(() => {
    const inicio = this.agendamentoForm.get('dataHoraInicio')?.value;
    const fim = this.agendamentoForm.get('dataHoraFim')?.value;
    if (inicio && fim) {
      const diffMs = new Date(fim).getTime() - new Date(inicio).getTime();
      if (diffMs > 0) {
        const diffHrs = Math.floor(diffMs / 3600000);
        const diffMins = Math.round((diffMs % 3600000) / 60000);
        let result = '';
        if (diffHrs > 0) result += `${diffHrs}h `;
        if (diffMins > 0) result += `${diffMins}min`;
        return result.trim();
      }
    }
    return null;
  });

  procedimentos$!: Observable<Procedimento[]>;
  profissionais$!: Observable<UsuarioResponse[]>;

  constructor(
    public dialogRef: MatDialogRef<AgendamentoDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.agendamentoForm = this.fb.group({
      pacienteId: [null, Validators.required],
      procedimentosIds: [[], [Validators.required, Validators.minLength(1)]],
      profissionalId: [null, Validators.required],
      dataHoraInicio: ['', [Validators.required, this.validarDataFutura]],
      dataHoraFim: ['', Validators.required],
      motivoConsulta: [''],
      status: ['AGENDADO']
    }, { validators: this.validarPeriodo });
  }

  validarDataFutura(control: any) {
    if (!control.value) return null;
    const data = new Date(control.value);
    return data < new Date() ? { dataPassada: true } : null;
  }

  validarPeriodo(group: FormGroup) {
    const inicio = group.get('dataHoraInicio')?.value;
    const fim = group.get('dataHoraFim')?.value;
    if (inicio && fim && new Date(fim) <= new Date(inicio)) {
      return { periodoInvalido: true };
    }
    return null;
  }

  ngOnInit(): void {
    // Configurar Autocomplete de Pacientes
    this.filteredPacientes$ = this.pacienteSearchControl.valueChanges.pipe(
      startWith(''),
      debounceTime(400),
      distinctUntilChanged(),
      switchMap(value => {
        const query = typeof value === 'string' ? value : '';

        if (query.length < 2) {
          this.isLoadingPatients.set(false);
          return of([]);
        }

        this.isLoadingPatients.set(true);
        return this.apiService.buscarPacientesPorCriterios(query, undefined, undefined, 0, 10).pipe(
          tap(() => this.isLoadingPatients.set(false)),
          switchMap(res => {
            const lista = (res as any)?.content || (Array.isArray(res) ? res : []);
            return of(lista);
          }),
          catchError(err => {
            console.error('Erro ao buscar pacientes', err);
            this.isLoadingPatients.set(false);
            return of([]);
          })
        );
      })
    );

    this.procedimentos$ = new Observable(obs => {
      this.apiService.listarProcedimentos().subscribe({
        next: res => {
          const lista = Array.isArray(res) ? res : (res as any)?.content || [];
          obs.next(lista);
          obs.complete();
        },
        error: err => {
          console.error('Erro ao carregar procedimentos', err);
          obs.error(err);
        }
      });
    });

    this.profissionais$ = new Observable(obs => {
      this.apiService.listarUsuarios().subscribe({
        next: res => {
          const lista = (Array.isArray(res) ? res : (res as any)?.content || [])
            .filter((u: UsuarioResponse) => u.perfil === 'MEDICO');
          obs.next(lista);
          obs.complete();
        },
        error: err => {
          console.error('Erro ao carregar usuários', err);
          obs.error(err);
        }
      });
    });

    if (this.data) {
        if (this.data.agendamento) {
            // Se for edição
            const ag = this.data.agendamento;
            this.agendamentoForm.patchValue({
              ...ag,
              dataHoraInicio: this.formatarParaInput(ag.dataHoraInicio),
              dataHoraFim: this.formatarParaInput(ag.dataHoraFim)
            });

            // Carregar dados do paciente para o autocomplete
            if (ag.pacienteId) {
              this.apiService.buscarPaciente(ag.pacienteId).subscribe(paciente => {
                this.pacienteSelecionado.set(paciente);
                this.pacienteSearchControl.setValue(paciente as any, { emitEvent: false });
              });
            }
        } else if (this.data.data) {
            // Se veio uma data do calendário (novo)
            const date = new Date(this.data.data);
            const isoString = this.formatarParaInput(date);
            const endIsoString = this.formatarParaInput(new Date(date.getTime() + 60 * 60000));
            this.agendamentoForm.patchValue({
              dataHoraInicio: isoString,
              dataHoraFim: endIsoString
            });
        }
    }
  }

  displayPaciente(paciente: Paciente | string | null): string {
    if (!paciente) return '';
    if (typeof paciente === 'string') return paciente;
    return paciente.nome || '';
  }

  onPacienteSelected(event: any): void {
    const paciente = event.option.value as Paciente;
    this.pacienteSelecionado.set(paciente);
    this.agendamentoForm.get('pacienteId')?.setValue(paciente.id);
    this.autocompletePacientesAberto.set(false);
  }

  limparPaciente(event: MouseEvent): void {
    event.stopPropagation();
    this.pacienteSearchControl.setValue('');
    this.pacienteSelecionado.set(null);
    this.agendamentoForm.get('pacienteId')?.setValue(null);
  }

  private formatarParaInput(dateStr: string | Date): string {
    const date = new Date(dateStr);
    return new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    if (this.agendamentoForm.valid) {
      this.isSaving.set(true);
      const formValue = this.agendamentoForm.value;
      if (!formValue.dataHoraFim) {
          // Definir 1 hora depois se estiver vazio
          const start = new Date(formValue.dataHoraInicio);
          const end = new Date(start.getTime() + 60 * 60000);
          formValue.dataHoraFim = new Date(end.getTime() - (end.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
      }

      // Simular um pequeno delay para mostrar o estado de carregamento,
      // ou apenas fechar se a regra for síncrona no componente pai
      setTimeout(() => {
        this.dialogRef.close(formValue);
        this.isSaving.set(false);
      }, 600);
    }
  }
}
