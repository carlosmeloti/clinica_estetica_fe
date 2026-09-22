import { Component, Inject, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { ApiService } from '../../../services/api.service';
import { Paciente, Procedimento, Agendamento, UsuarioResponse } from '../../../models/api.models';
import { Observable } from 'rxjs';

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
    MatSelectModule
  ],
  template: `
    <h2 mat-dialog-title>{{ data?.agendamento ? 'Editar Agendamento' : 'Novo Agendamento' }}</h2>
    <mat-dialog-content>
      <form [formGroup]="agendamentoForm" class="form-container">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Paciente</mat-label>
          <mat-select formControlName="pacienteId" required>
            @for (p of pacientes$ | async; track p.id) {
              <mat-option [value]="p.id">{{ p.nome }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Procedimentos</mat-label>
          <mat-select formControlName="procedimentosIds" multiple required>
            @for (pr of procedimentos$ | async; track pr.id) {
              <mat-option [value]="pr.id">{{ pr.nome }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Profissional</mat-label>
          <mat-select formControlName="profissionalId" required>
             @for (u of profissionais$ | async; track u.login) {
               <!-- Usando login como ID temporário se não houver ID numérico -->
               <mat-option [value]="1">{{ u.nome }}</mat-option>
             }
          </mat-select>
          <mat-hint>Selecione o profissional que realizará o atendimento</mat-hint>
        </mat-form-field>

        <div class="form-row">
          <mat-form-field appearance="outline">
            <mat-label>Início</mat-label>
            <input matInput type="datetime-local" formControlName="dataHoraInicio" required>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Fim (Opcional)</mat-label>
            <input matInput type="datetime-local" formControlName="dataHoraFim">
          </mat-form-field>
        </div>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Motivo da Consulta</mat-label>
          <textarea matInput formControlName="motivoConsulta" rows="2"></textarea>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancelar</button>
      <button mat-raised-button class="btn-agendar" [disabled]="agendamentoForm.invalid" (click)="onSave()">
        {{ data?.agendamento ? 'Salvar Alterações' : 'Agendar' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .form-container {
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding-top: 10px;
      min-width: 400px;
    }
    .full-width {
      width: 100%;
    }
    .form-row {
      display: flex;
      gap: 15px;
    }
    .form-row mat-form-field {
      flex: 1;
    }
    .btn-agendar {
      background-color: #A97C6E !important;
      color: white !important;
    }
  `]
})
export class AgendamentoDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private apiService = inject(ApiService);

  agendamentoForm: FormGroup;
  pacientes$!: Observable<any>;
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
    // Carregar dados para os selects
    this.pacientes$ = new Observable(obs => {
        this.apiService.listarPacientes(0, 100).subscribe({
          next: res => {
            obs.next(res.content);
            obs.complete();
          },
          error: err => {
            console.error('Erro ao carregar pacientes', err);
            obs.error(err);
          }
        });
    });

    this.procedimentos$ = this.apiService.listarProcedimentos();
    this.profissionais$ = this.apiService.listarUsuarios();

    if (this.data) {
        if (this.data.agendamento) {
            // Se for edição
            const ag = this.data.agendamento;
            this.agendamentoForm.patchValue({
              ...ag,
              dataHoraInicio: this.formatarParaInput(ag.dataHoraInicio),
              dataHoraFim: this.formatarParaInput(ag.dataHoraFim)
            });
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
