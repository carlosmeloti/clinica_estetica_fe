import { Component, Inject, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Procedimento } from '../../models/api.models';

export interface ProcedimentoDialogData {
  procedimento: Procedimento | null;
}

@Component({
  selector: 'app-procedimento-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule
  ],
  template: `
    <div class="dialog-header">
      <div class="header-info">
        <div class="header-icon-container">
          <mat-icon>medical_services</mat-icon>
        </div>
        <div class="header-text">
          <h2 class="header-title">{{ isEdit ? 'Editar Procedimento' : 'Novo Procedimento' }}</h2>
          <p class="header-subtitle">Nome e preço são obrigatórios</p>
        </div>
      </div>
      <button mat-icon-button type="button" (click)="onCancel()" class="close-button" matTooltip="Fechar">
        <mat-icon>close</mat-icon>
      </button>
    </div>

    <mat-dialog-content class="dialog-content">
      <form [formGroup]="form" class="form-container">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Nome</mat-label>
          <input matInput formControlName="nome" required>
          @if (form.get('nome')?.hasError('required')) {
            <mat-error>Nome é obrigatório</mat-error>
          }
        </mat-form-field>

        <div class="grid-row">
          <mat-form-field appearance="outline">
            <mat-label>Preço sugerido</mat-label>
            <span matTextPrefix>R$&nbsp;</span>
            <input matInput type="number" formControlName="precoSugerido" min="0" step="0.01" required>
            @if (form.get('precoSugerido')?.hasError('required')) {
              <mat-error>Preço é obrigatório</mat-error>
            }
            @if (form.get('precoSugerido')?.hasError('min')) {
              <mat-error>Preço deve ser ≥ 0</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Duração (minutos)</mat-label>
            <input matInput type="number" formControlName="duracaoMinutos" min="1" step="1">
          </mat-form-field>
        </div>
      </form>
    </mat-dialog-content>

    <div class="dialog-footer">
      <button mat-button type="button" (click)="onCancel()" class="btn-secondary">Cancelar</button>
      <button mat-raised-button type="button" class="btn-primary"
              [disabled]="form.invalid || isSaving()"
              (click)="onSave()">
        @if (isSaving()) {
          <span class="loading-btn">
            <mat-spinner diameter="20"></mat-spinner>
            Salvando...
          </span>
        } @else {
          Salvar
        }
      </button>
    </div>
  `,
  styles: [`
    :host { display: block; background: #fff; border-radius: 12px; overflow: hidden; }
    .dialog-header {
      padding: 24px 32px; display: flex; justify-content: space-between; align-items: center;
      background-color: #fcfcfc; border-bottom: 1px solid #f0f0f0;
    }
    .header-info { display: flex; align-items: center; gap: 16px; }
    .header-icon-container {
      background-color: rgba(169, 124, 110, 0.1); color: #A97C6E;
      width: 48px; height: 48px; border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
    }
    .header-title { margin: 0; font-size: 20px; font-weight: 600; color: #333; }
    .header-subtitle { margin: 4px 0 0 0; font-size: 14px; color: #777; }
    .close-button { color: #999; }
    .dialog-content { padding: 24px 32px !important; max-height: 70vh; }
    .form-container { display: flex; flex-direction: column; gap: 8px; padding-top: 8px; }
    .full-width { width: 100%; }
    .grid-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .dialog-footer {
      display: flex; justify-content: flex-end; gap: 12px;
      padding: 16px 32px 24px; border-top: 1px solid #f0f0f0; background: #fff;
    }
    .btn-primary {
      height: 44px; padding: 0 28px !important; border-radius: 8px !important;
      font-weight: 600 !important; background-color: #A97C6E !important; color: white !important;
    }
    .btn-primary:disabled { background-color: #d4c4be !important; color: #fff !important; opacity: 0.7; }
    .btn-secondary {
      height: 44px; padding: 0 20px !important; border-radius: 8px !important;
      font-weight: 500 !important; color: #666 !important;
    }
    .loading-btn { display: inline-flex; align-items: center; gap: 8px; }
    @media (max-width: 600px) {
      .grid-row { grid-template-columns: 1fr; }
      .dialog-footer { flex-direction: column-reverse; }
      .btn-primary, .btn-secondary { width: 100%; }
    }
  `]
})
export class ProcedimentoDialogComponent {
  private fb = inject(FormBuilder);
  isSaving = signal(false);
  form: FormGroup;
  isEdit = false;

  constructor(
    public dialogRef: MatDialogRef<ProcedimentoDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ProcedimentoDialogData | null
  ) {
    this.isEdit = !!this.data?.procedimento;
    this.form = this.fb.group({
      nome: [this.data?.procedimento?.nome || '', Validators.required],
      precoSugerido: [
        this.data?.procedimento?.precoSugerido ?? null,
        [Validators.required, Validators.min(0)]
      ],
      duracaoMinutos: [this.data?.procedimento?.duracaoMinutos ?? null]
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    const payload: Procedimento = {
      nome: raw.nome?.trim(),
      precoSugerido: Number(raw.precoSugerido),
      duracaoMinutos: raw.duracaoMinutos != null && raw.duracaoMinutos !== ''
        ? Number(raw.duracaoMinutos)
        : undefined
    };
    if (this.data?.procedimento?.id != null) {
      payload.id = this.data.procedimento.id;
    }
    this.dialogRef.close(payload);
  }
}
