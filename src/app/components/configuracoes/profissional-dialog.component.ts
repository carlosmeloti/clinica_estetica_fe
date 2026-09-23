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
import { UsuarioRequest, UsuarioResponse } from '../../models/api.models';

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
    MatProgressSpinnerModule
  ],
  template: `
    <h2 mat-dialog-title>{{ data.usuario ? 'Editar Profissional' : 'Novo Profissional' }}</h2>
    <mat-dialog-content>
      <form [formGroup]="profissionalForm" class="form-container">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Nome</mat-label>
          <input matInput formControlName="nome" required>
          <mat-error *ngIf="profissionalForm.get('nome')?.hasError('required')">Nome é obrigatório</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Login</mat-label>
          <input matInput formControlName="login" required [readonly]="!!data.usuario">
          <mat-error *ngIf="profissionalForm.get('login')?.hasError('required')">Login é obrigatório</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Email</mat-label>
          <input matInput formControlName="email" type="email">
          <mat-error *ngIf="profissionalForm.get('email')?.hasError('email')">Email inválido</mat-error>
        </mat-form-field>

        <div class="grid-row">
          <mat-form-field appearance="outline">
            <mat-label>Senha</mat-label>
            <input matInput formControlName="password" type="password" [required]="!data.usuario">
            <mat-error *ngIf="profissionalForm.get('password')?.hasError('required')">Senha é obrigatória</mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Confirmar Senha</mat-label>
            <input matInput formControlName="confirmPassword" type="password" [required]="!data.usuario">
            <mat-error *ngIf="profissionalForm.hasError('mismatch')">As senhas não conferem</mat-error>
          </mat-form-field>
        </div>

        <div class="grid-row">
          <mat-form-field appearance="outline">
            <mat-label>Perfil</mat-label>
            <mat-select formControlName="perfil" required>
              <mat-option value="MEDICO">Médico/Profissional</mat-option>
              <mat-option value="ADMIN">Administrador</mat-option>
              <mat-option value="RECEPCAO">Recepção</mat-option>
              <mat-option value="FINANCEIRO">Financeiro</mat-option>
            </mat-select>
            <mat-error *ngIf="profissionalForm.get('perfil')?.hasError('required')">Perfil é obrigatório</mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Registro Profissional</mat-label>
            <input matInput formControlName="registroProfissional">
            <mat-error *ngIf="profissionalForm.get('registroProfissional')?.hasError('required')">Registro é obrigatório para Médicos</mat-error>
          </mat-form-field>
        </div>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancelar</button>
      <button mat-raised-button color="primary" [disabled]="profissionalForm.invalid || isSaving()" (click)="onSave()">
        {{ isSaving() ? 'Salvando...' : 'Salvar' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .form-container {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding-top: 10px;
    }
    .full-width {
      width: 100%;
    }
    .grid-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
  `]
})
export class ProfissionalDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  isSaving = signal(false);
  profissionalForm: FormGroup;

  constructor(
    public dialogRef: MatDialogRef<ProfissionalDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { usuario: UsuarioResponse | null }
  ) {
    this.profissionalForm = this.fb.group({
      nome: ['', Validators.required],
      login: ['', Validators.required],
      email: ['', [Validators.email]],
      password: [''],
      confirmPassword: [''],
      perfil: ['MEDICO', Validators.required],
      registroProfissional: ['']
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit(): void {
    if (this.data.usuario) {
      this.profissionalForm.patchValue(this.data.usuario);
      this.profissionalForm.get('password')?.setValidators([]);
      this.profissionalForm.get('confirmPassword')?.setValidators([]);
    } else {
      this.profissionalForm.get('password')?.setValidators([Validators.required]);
      this.profissionalForm.get('confirmPassword')?.setValidators([Validators.required]);
    }

    this.profissionalForm.get('perfil')?.valueChanges.subscribe(perfil => {
      const regControl = this.profissionalForm.get('registroProfissional');
      if (perfil === 'MEDICO') {
        regControl?.setValidators([Validators.required]);
      } else {
        regControl?.setValidators([]);
      }
      regControl?.updateValueAndValidity();
    });

    // Trigger initial validation for profile
    this.profissionalForm.get('perfil')?.updateValueAndValidity();
  }

  passwordMatchValidator(g: FormGroup) {
    const pass = g.get('password')?.value;
    const confirm = g.get('confirmPassword')?.value;
    return pass === confirm ? null : { mismatch: true };
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    if (this.profissionalForm.valid) {
      const rawValue = this.profissionalForm.getRawValue();
      const payload: UsuarioRequest = {
        nome: rawValue.nome,
        login: rawValue.login,
        email: rawValue.email,
        perfil: rawValue.perfil,
        registroProfissional: rawValue.registroProfissional
      };

      if (rawValue.password) {
        payload.password = rawValue.password;
      }

      this.dialogRef.close(payload);
    }
  }
}
