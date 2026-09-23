import { Component, Inject, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { UsuarioRequest, UsuarioResponse } from '../../models/api.models';

export interface ProfissionalDialogData {
  usuario: UsuarioResponse | null;
}

@Component({
  selector: 'app-profissional-dialog',
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
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule
  ],
  template: `
    <div class="dialog-header">
      <div class="header-info">
        <div class="header-icon-container">
          <mat-icon class="header-icon">badge</mat-icon>
        </div>
        <div class="header-text">
          <h2 class="header-title">{{ isEdit ? 'Editar Profissional' : 'Novo Profissional' }}</h2>
          <p class="header-subtitle">
            {{ isEdit ? 'Atualize os dados do profissional' : 'Preencha os dados para cadastrar um novo profissional' }}
          </p>
        </div>
      </div>
      <button mat-icon-button (click)="onCancel()" class="close-button" matTooltip="Fechar">
        <mat-icon>close</mat-icon>
      </button>
    </div>

    <mat-dialog-content class="dialog-content">
      <form [formGroup]="profissionalForm" class="form-container">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Nome</mat-label>
          <input matInput formControlName="nome" required>
          @if (profissionalForm.get('nome')?.hasError('required')) {
            <mat-error>Nome é obrigatório</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Login</mat-label>
          <input matInput formControlName="login" required [readonly]="isEdit">
          @if (profissionalForm.get('login')?.hasError('required')) {
            <mat-error>Login é obrigatório</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Email</mat-label>
          <input matInput formControlName="email" type="email">
          @if (profissionalForm.get('email')?.hasError('email')) {
            <mat-error>Email inválido</mat-error>
          }
        </mat-form-field>

        <div class="grid-row">
          <mat-form-field appearance="outline">
            <mat-label>Senha</mat-label>
            <input matInput formControlName="password" type="password" [required]="!isEdit">
            @if (profissionalForm.get('password')?.hasError('required')) {
              <mat-error>Senha é obrigatória</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Confirmar Senha</mat-label>
            <input matInput formControlName="confirmPassword" type="password" [required]="!isEdit">
            @if (profissionalForm.hasError('mismatch')) {
              <mat-error>As senhas não conferem</mat-error>
            }
          </mat-form-field>
        </div>

        <div class="grid-row">
          <mat-form-field appearance="outline">
            <mat-label>Perfil</mat-label>
            <mat-select formControlName="perfil" required>
              <mat-option value="ADMIN">Administrador</mat-option>
              <mat-option value="PROFISSIONAL">Profissional</mat-option>
              <mat-option value="RECEPCAO">Recepcionista</mat-option>
              <mat-option value="FINANCEIRO">Gestor Financeiro</mat-option>
            </mat-select>
            @if (profissionalForm.get('perfil')?.hasError('required')) {
              <mat-error>Perfil é obrigatório</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Registro Profissional</mat-label>
            <input matInput formControlName="registroProfissional">
            @if (profissionalForm.get('registroProfissional')?.hasError('required')) {
              <mat-error>Registro é obrigatório para Profissionais</mat-error>
            }
          </mat-form-field>
        </div>
      </form>
    </mat-dialog-content>

    <div class="dialog-footer">
      <button mat-button type="button" (click)="onCancel()" class="btn-secondary">Cancelar</button>
      <button mat-raised-button
              type="button"
              color="primary"
              class="btn-primary"
              [disabled]="profissionalForm.invalid || isSaving()"
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
      padding: 24px 32px !important;
      max-height: 70vh;
    }

    .form-container {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding-top: 8px;
    }

    .full-width {
      width: 100%;
    }

    .grid-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    .dialog-footer {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding: 16px 32px 24px;
      border-top: 1px solid #f0f0f0;
      background: #fff;
    }

    .btn-primary {
      height: 44px;
      padding: 0 28px !important;
      border-radius: 8px !important;
      font-weight: 600 !important;
      background-color: #A97C6E !important;
      color: white !important;
    }

    .btn-primary:disabled {
      background-color: #d4c4be !important;
      color: #fff !important;
      opacity: 0.7;
    }

    .btn-secondary {
      height: 44px;
      padding: 0 20px !important;
      border-radius: 8px !important;
      font-weight: 500 !important;
      color: #666 !important;
    }

    .loading-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }

    @media (max-width: 600px) {
      .grid-row {
        grid-template-columns: 1fr;
      }

      .dialog-footer {
        flex-direction: column-reverse;
      }

      .btn-primary, .btn-secondary {
        width: 100%;
      }
    }
  `]
})
export class ProfissionalDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  isSaving = signal(false);
  profissionalForm: FormGroup;
  isEdit = false;

  constructor(
    public dialogRef: MatDialogRef<ProfissionalDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ProfissionalDialogData | null
  ) {
    this.isEdit = !!this.data?.usuario;
    this.profissionalForm = this.fb.group({
      nome: ['', Validators.required],
      login: ['', Validators.required],
      email: ['', [Validators.email]],
      password: [''],
      confirmPassword: [''],
      perfil: ['PROFISSIONAL', Validators.required],
      registroProfissional: ['']
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit(): void {
    if (this.data?.usuario) {
      this.profissionalForm.patchValue(this.data.usuario);
      this.profissionalForm.get('password')?.setValidators([]);
      this.profissionalForm.get('confirmPassword')?.setValidators([]);
    } else {
      this.profissionalForm.get('password')?.setValidators([Validators.required]);
      this.profissionalForm.get('confirmPassword')?.setValidators([Validators.required]);
    }

    this.profissionalForm.get('perfil')?.valueChanges.subscribe(perfil => {
      this.atualizarValidacaoRegistro(perfil);
    });

    this.atualizarValidacaoRegistro(this.profissionalForm.get('perfil')?.value);
  }

  private atualizarValidacaoRegistro(perfil: string | null | undefined): void {
    const regControl = this.profissionalForm.get('registroProfissional');
    if (perfil === 'PROFISSIONAL') {
      regControl?.setValidators([Validators.required]);
    } else {
      regControl?.setValidators([]);
    }
    regControl?.updateValueAndValidity();
  }

  passwordMatchValidator(g: FormGroup) {
    const pass = g.get('password')?.value;
    const confirm = g.get('confirmPassword')?.value;
    if (!pass && !confirm) {
      return null;
    }
    return pass === confirm ? null : { mismatch: true };
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    if (this.profissionalForm.invalid) {
      this.profissionalForm.markAllAsTouched();
      return;
    }

    const rawValue = this.profissionalForm.getRawValue();
    const payload: UsuarioRequest = {
      nome: rawValue.nome,
      login: rawValue.login,
      email: rawValue.email,
      perfil: rawValue.perfil,
      registroProfissional: rawValue.registroProfissional
    };

    if (rawValue.password) {
      payload.senha = rawValue.password;
    }

    this.dialogRef.close(payload);
  }
}
