import { Component, Inject, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { ApiService } from '../../services/api.service';
import {
  PagamentoRequest,
  SugestaoPagamentoResponse,
  ItemPagamentoResponse
} from '../../models/api.models';
import { FORMAS_PAGAMENTO, formatarMoeda } from '../../utils/financeiro.utils';

export interface PagamentoDialogData {
  agendamentoId: number;
}

@Component({
  selector: 'app-pagamento-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDividerModule
  ],
  template: `
    <div class="dialog-header">
      <div class="header-info">
        <div class="header-icon-container">
          <mat-icon>point_of_sale</mat-icon>
        </div>
        <div>
          <h2 class="header-title">Registrar pagamento</h2>
          <p class="header-subtitle" *ngIf="sugestao()">
            {{ sugestao()!.pacienteNome }}
            <span *ngIf="sugestao()!.profissionalNome"> · {{ sugestao()!.profissionalNome }}</span>
          </p>
        </div>
      </div>
      <button mat-icon-button type="button" (click)="dialogRef.close()">
        <mat-icon>close</mat-icon>
      </button>
    </div>

    <mat-dialog-content>
      @if (loading()) {
        <div class="loading-box">
          <mat-spinner diameter="36"></mat-spinner>
          <span>Carregando sugestão...</span>
        </div>
      } @else if (erro()) {
        <div class="erro-box">{{ erro() }}</div>
      } @else if (sugestao()) {
        <div class="resumo">
          <div class="resumo-item">
            <label>Valor sugerido</label>
            <strong>{{ formatarMoeda(sugestao()!.valorSugerido) }}</strong>
          </div>
          <div class="resumo-item">
            <label>Já pago</label>
            <strong>{{ formatarMoeda(sugestao()!.totalPago || 0) }}</strong>
          </div>
          <div class="resumo-item destaque">
            <label>Saldo em aberto</label>
            <strong>{{ formatarMoeda(sugestao()!.saldoEmAberto) }}</strong>
          </div>
        </div>

        @if (itens().length) {
          <table class="itens-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Qtd</th>
                <th>Unit.</th>
              </tr>
            </thead>
            <tbody>
              @for (item of itens(); track $index) {
                <tr>
                  <td>{{ item.descricao }}</td>
                  <td>{{ item.quantidade }}</td>
                  <td>{{ formatarMoeda(item.valorUnitario) }}</td>
                </tr>
              }
            </tbody>
          </table>
        }

        <mat-divider></mat-divider>

        <form [formGroup]="form" class="form">
          <mat-form-field appearance="outline" class="full">
            <mat-label>Forma de pagamento</mat-label>
            <mat-select formControlName="formaPagamento" required>
              @for (f of formas; track f.value) {
                <mat-option [value]="f.value">{{ f.label }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <div class="row">
            <mat-form-field appearance="outline">
              <mat-label>Valor pago</mat-label>
              <span matTextPrefix>R$&nbsp;</span>
              <input matInput type="number" formControlName="valorPago" min="0.01" step="0.01" required>
              @if (form.get('valorPago')?.hasError('required') || form.get('valorPago')?.hasError('min')) {
                <mat-error>Informe um valor &gt; 0</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Desconto</mat-label>
              <span matTextPrefix>R$&nbsp;</span>
              <input matInput type="number" formControlName="desconto" min="0" step="0.01">
            </mat-form-field>
          </div>

          <mat-form-field appearance="outline" class="full">
            <mat-label>Observação</mat-label>
            <textarea matInput formControlName="observacao" rows="2"></textarea>
          </mat-form-field>
        </form>
      }
    </mat-dialog-content>

    <div class="dialog-footer">
      <button mat-button type="button" (click)="dialogRef.close()">Cancelar</button>
      <button mat-raised-button class="btn-primary"
              [disabled]="!sugestao() || form.invalid || salvando()"
              (click)="confirmar()">
        @if (salvando()) {
          <mat-spinner diameter="20"></mat-spinner>
        } @else {
          Confirmar recebimento
        }
      </button>
    </div>
  `,
  styles: [`
    :host { display: block; background: #fff; border-radius: 12px; overflow: hidden; }
    .dialog-header {
      display: flex; justify-content: space-between; align-items: center;
      padding: 20px 24px; border-bottom: 1px solid #f0f0f0; background: #fcfcfc;
    }
    .header-info { display: flex; gap: 12px; align-items: center; }
    .header-icon-container {
      width: 44px; height: 44px; border-radius: 10px;
      background: rgba(169,124,110,.12); color: #A97C6E;
      display: flex; align-items: center; justify-content: center;
    }
    .header-title { margin: 0; font-size: 1.15rem; color: #333; }
    .header-subtitle { margin: 2px 0 0; font-size: .85rem; color: #777; }
    mat-dialog-content { padding: 20px 24px !important; min-width: min(480px, 90vw); }
    .loading-box, .erro-box {
      display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 24px; color: #666;
    }
    .erro-box { color: #c62828; }
    .resumo {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 16px;
    }
    .resumo-item {
      background: #f7f5f3; border-radius: 8px; padding: 12px;
      display: flex; flex-direction: column; gap: 4px;
    }
    .resumo-item label { font-size: .75rem; color: #777; }
    .resumo-item strong { color: #5C4037; }
    .resumo-item.destaque { background: rgba(169,124,110,.15); }
    .itens-table { width: 100%; border-collapse: collapse; font-size: .85rem; margin-bottom: 16px; }
    .itens-table th, .itens-table td { text-align: left; padding: 6px 4px; border-bottom: 1px solid #eee; }
    .form { display: flex; flex-direction: column; gap: 4px; margin-top: 12px; }
    .full { width: 100%; }
    .row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .dialog-footer {
      display: flex; justify-content: flex-end; gap: 8px;
      padding: 16px 24px; border-top: 1px solid #f0f0f0;
    }
    .btn-primary {
      background: #A97C6E !important; color: #fff !important;
      height: 42px; border-radius: 8px !important; font-weight: 600;
    }
    @media (max-width: 560px) {
      .resumo, .row { grid-template-columns: 1fr; }
    }
  `]
})
export class PagamentoDialogComponent implements OnInit {
  private api = inject(ApiService);
  private fb = inject(FormBuilder);

  formatarMoeda = formatarMoeda;
  formas = FORMAS_PAGAMENTO;

  loading = signal(true);
  salvando = signal(false);
  erro = signal<string | null>(null);
  sugestao = signal<SugestaoPagamentoResponse | null>(null);
  itens = signal<ItemPagamentoResponse[]>([]);

  form: FormGroup = this.fb.group({
    formaPagamento: ['PIX', Validators.required],
    valorPago: [null, [Validators.required, Validators.min(0.01)]],
    desconto: [0, [Validators.min(0)]],
    observacao: ['']
  });

  constructor(
    public dialogRef: MatDialogRef<PagamentoDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: PagamentoDialogData
  ) {}

  ngOnInit(): void {
    this.api.obterSugestaoPagamento(this.data.agendamentoId).subscribe({
      next: (s) => {
        this.sugestao.set(s);
        this.itens.set(s.itensSugeridos || []);
        this.form.patchValue({
          valorPago: s.saldoEmAberto > 0 ? s.saldoEmAberto : s.valorSugerido
        });
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        const msg = err?.error?.mensagem || 'Não foi possível carregar a sugestão de pagamento.';
        this.erro.set(msg);
      }
    });
  }

  confirmar(): void {
    if (this.form.invalid || !this.sugestao()) return;
    this.salvando.set(true);
    const raw = this.form.getRawValue();
    const body: PagamentoRequest = {
      agendamentoId: this.data.agendamentoId,
      valorPago: Number(raw.valorPago),
      formaPagamento: raw.formaPagamento,
      desconto: Number(raw.desconto || 0),
      observacao: raw.observacao || undefined
    };
    this.api.registrarPagamento(body).subscribe({
      next: (res) => {
        this.salvando.set(false);
        this.dialogRef.close(res);
      },
      error: () => this.salvando.set(false)
    });
  }
}
