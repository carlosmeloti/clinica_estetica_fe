import { Component, Inject, OnInit, inject, signal } from '@angular/core';
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
    MatProgressSpinnerModule
  ],
  template: `
    <h2 mat-dialog-title class="dialog-title">{{ data?.agendamento ? 'Editar Agendamento' : 'Novo Agendamento' }}</h2>
    <mat-dialog-content class="dialog-content">
      <form [formGroup]="agendamentoForm" class="form-container">
        <!-- Seção Paciente -->
        <div class="form-section">
          <h3 class="section-title">Informações do Paciente</h3>
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Paciente</mat-label>
            <input type="text"
                   matInput
                   [formControl]="pacienteSearchControl"
                   [matAutocomplete]="auto"
                   placeholder="Digite o nome do paciente"
                   required>
            <mat-icon matPrefix>person</mat-icon>
            @if (pacienteSearchControl.value && !isLoadingPatients()) {
              <button matSuffix mat-icon-button aria-label="Limpar" (click)="limparPaciente($event)">
                <mat-icon>close</mat-icon>
              </button>
            }
            <mat-autocomplete #auto="matAutocomplete" [displayWith]="displayPaciente" (optionSelected)="onPacienteSelected($event)">
              @if (isLoadingPatients()) {
                <mat-option disabled class="loading-option">
                  <mat-spinner diameter="20"></mat-spinner>
                  <span>Buscando pacientes...</span>
                </mat-option>
              }

              @if (!isLoadingPatients() && (pacienteSearchControl.value?.length || 0) < 2 && !pacienteSelecionado()) {
                 <mat-option disabled>Digite pelo menos 2 caracteres para pesquisar</mat-option>
              }

              @for (p of filteredPacientes$ | async; track p.id) {
                <mat-option [value]="p">
                  <div class="paciente-option">
                    <span class="paciente-nome">{{ p.nome }}</span>
                    <div class="paciente-info">
                      @if (p.cpf) { <span>CPF: {{ p.cpf }}</span> }
                      @if (p.telefone) { <span> | Tel: {{ p.telefone }}</span> }
                      @if (!p.telefone && p.email) { <span> | Email: {{ p.email }}</span> }
                    </div>
                  </div>
                </mat-option>
              }

              @if (!isLoadingPatients() && (pacienteSearchControl.value?.length || 0) >= 2 && (filteredPacientes$ | async)?.length === 0) {
                <mat-option disabled>Nenhum paciente encontrado</mat-option>
              }
            </mat-autocomplete>
            @if (agendamentoForm.get('pacienteId')?.touched && agendamentoForm.get('pacienteId')?.invalid) {
              <mat-error>O paciente é obrigatório</mat-error>
            }
          </mat-form-field>
        </div>

        <!-- Seção Atendimento -->
        <div class="form-section">
          <h3 class="section-title">Detalhes do Atendimento</h3>
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Profissional</mat-label>
            <mat-select formControlName="profissionalId" required>
               @for (u of profissionais$ | async; track u.login) {
                 <mat-option [value]="1">{{ u.nome }}</mat-option>
               }
            </mat-select>
            <mat-icon matPrefix>medical_services</mat-icon>
            @if (agendamentoForm.get('profissionalId')?.touched && agendamentoForm.get('profissionalId')?.invalid) {
              <mat-error>O profissional é obrigatório</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Procedimentos</mat-label>
            <mat-select formControlName="procedimentosIds" multiple required>
              @for (pr of procedimentos$ | async; track pr.id) {
                <mat-option [value]="pr.id">{{ pr.nome }}</mat-option>
              }
            </mat-select>
            <mat-icon matPrefix>list</mat-icon>
            @if (agendamentoForm.get('procedimentosIds')?.touched && agendamentoForm.get('procedimentosIds')?.invalid) {
              <mat-error>Selecione pelo menos um procedimento</mat-error>
            }
          </mat-form-field>
        </div>

        <!-- Seção Horário -->
        <div class="form-section">
          <h3 class="section-title">Data e Horário</h3>
          <div class="form-row">
            <mat-form-field appearance="outline">
              <mat-label>Início</mat-label>
              <input matInput type="datetime-local" formControlName="dataHoraInicio" required>
              @if (agendamentoForm.get('dataHoraInicio')?.touched && agendamentoForm.get('dataHoraInicio')?.invalid) {
                <mat-error>
                  @if (agendamentoForm.get('dataHoraInicio')?.hasError('required')) { Data de início é obrigatória }
                  @if (agendamentoForm.get('dataHoraInicio')?.hasError('dataPassada')) { Data não pode ser no passado }
                </mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Fim</mat-label>
              <input matInput type="datetime-local" formControlName="dataHoraFim" required>
              @if (agendamentoForm.get('dataHoraFim')?.touched && agendamentoForm.get('dataHoraFim')?.invalid) {
                <mat-error>Data de término é obrigatória</mat-error>
              }
              @if (agendamentoForm.hasError('periodoInvalido')) {
                <mat-error class="form-error">Data fim deve ser após a data início</mat-error>
              }
            </mat-form-field>
          </div>
        </div>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Motivo da Consulta / Observações</mat-label>
          <textarea matInput formControlName="motivoConsulta" rows="2"></textarea>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end" class="dialog-actions">
      <button mat-button (click)="onCancel()">Cancelar</button>
      <button mat-raised-button
              class="btn-agendar"
              [disabled]="agendamentoForm.invalid"
              (click)="onSave()">
        {{ data?.agendamento ? 'Salvar Alterações' : 'Agendar' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-title {
      margin-bottom: 0;
      padding-bottom: 16px;
      border-bottom: 1px solid #eee;
    }
    .dialog-content {
      padding-top: 20px !important;
      max-width: 600px;
      width: 100vw;
    }
    .form-container {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .form-section {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .section-title {
      font-size: 14px;
      font-weight: 500;
      color: #666;
      margin: 8px 0 4px 0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .full-width {
      width: 100%;
    }
    .form-row {
      display: flex;
      gap: 16px;
    }
    .form-row mat-form-field {
      flex: 1;
    }
    .btn-agendar {
      background-color: #A97C6E !important;
      color: white !important;
      padding: 0 24px;
    }
    .btn-agendar[disabled] {
      background-color: rgba(0,0,0,0.12) !important;
      color: rgba(0,0,0,0.26) !important;
    }
    .dialog-actions {
      padding: 16px 24px;
      border-top: 1px solid #eee;
    }
    .paciente-option {
      display: flex;
      flex-direction: column;
      line-height: 1.4;
      padding: 8px 0;
    }
    .paciente-nome {
      font-weight: 500;
      color: #333;
    }
    .paciente-info {
      font-size: 12px;
      color: #666;
    }
    .loading-option {
      display: flex;
      align-items: center;
      gap: 12px;
      height: 48px;
    }
    .form-error {
      font-size: 12px;
      margin-top: -8px;
      margin-bottom: 8px;
      color: #f44336;
    }
    @media (max-width: 600px) {
      .form-row {
        flex-direction: column;
        gap: 0;
      }
      .dialog-content {
        min-width: unset;
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

  procedimentos$!: Observable<Procedimento[]>;
  profissionais$!: Observable<UsuarioResponse[]>;

  constructor(
    public dialogRef: MatDialogRef<AgendamentoDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.agendamentoForm = this.fb.group({
      pacienteId: [null, Validators.required],
      procedimentosIds: [[], [Validators.required, Validators.minLength(1)]],
      profissionalId: [1, Validators.required],
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
      filter(value => typeof value === 'string'),
      tap(value => {
        if (value.length >= 2) {
          this.isLoadingPatients.set(true);
        } else {
          this.isLoadingPatients.set(false);
        }
      }),
      switchMap(value => {
        if (value.length < 2) {
          return of([]);
        }
        return this.apiService.buscarPacientesPorCriterios(value, undefined, undefined, 0, 10).pipe(
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
          const lista = Array.isArray(res) ? res : (res as any)?.content || [];
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

  displayPaciente(paciente: Paciente): string {
    return paciente && paciente.nome ? paciente.nome : '';
  }

  onPacienteSelected(event: any): void {
    const paciente = event.option.value as Paciente;
    this.pacienteSelecionado.set(paciente);
    this.agendamentoForm.get('pacienteId')?.setValue(paciente.id);
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
      const formValue = this.agendamentoForm.value;
      if (!formValue.dataHoraFim) {
          // Definir 1 hora depois se estiver vazio
          const start = new Date(formValue.dataHoraInicio);
          const end = new Date(start.getTime() + 60 * 60000);
          formValue.dataHoraFim = new Date(end.getTime() - (end.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
      }
      this.dialogRef.close(formValue);
    }
  }
}
