import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ApiService } from '../../services/api.service';
import { NotificationService } from '../../services/notification.service';
import {
  ContaPendenteResponse,
  PagamentoResponse,
  Profissional,
  RelatorioCaixaResponse,
  TotaisPorChave,
  TotalPorDia
} from '../../models/api.models';
import { PagamentoDialogComponent } from './pagamento-dialog.component';
import { AuthService } from '../../services/auth.service';
import {
  FORMAS_PAGAMENTO,
  STATUS_PAGAMENTO_LABEL,
  formatLocalDate,
  formatarDataBr,
  formatarMoeda,
  rangeDia,
  rangeMes,
  rangeSemana,
  rotuloFormaPagamento
} from '../../utils/financeiro.utils';
import { imprimirRelatorioCaixa } from '../../utils/caixa-relatorio-print';

type PresetRelatorio = 'diario' | 'semanal' | 'mensal' | 'personalizado';

@Component({
  selector: 'app-caixa',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTabsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTableModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    MatChipsModule,
    MatTooltipModule
  ],
  templateUrl: './caixa.component.html',
  styleUrl: './caixa.component.scss'
})
export class CaixaComponent implements OnInit {
  private api = inject(ApiService);
  private dialog = inject(MatDialog);
  private notification = inject(NotificationService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private auth = inject(AuthService);

  formatarMoeda = formatarMoeda;
  formatarDataBr = formatarDataBr;
  rotuloForma = rotuloFormaPagamento;
  statusLabel = STATUS_PAGAMENTO_LABEL;
  formas = FORMAS_PAGAMENTO;

  tabIndex = signal(0);
  profissionais = signal<Profissional[]>([]);
  loading = signal(false);

  // Filtros compartilhados (pendentes / lançamentos)
  filtroDataInicio = signal(formatLocalDate(new Date()));
  filtroDataFim = signal(formatLocalDate(new Date()));
  filtroProfissionalId = signal<number | null>(null);
  filtroForma = signal<string | null>(null);
  filtroStatus = signal<string | null>(null);

  pendentes = signal<ContaPendenteResponse[]>([]);
  lancamentos = signal<PagamentoResponse[]>([]);

  // Relatórios
  presetRelatorio = signal<PresetRelatorio>('diario');
  relDataInicio = signal(formatLocalDate(new Date()));
  relDataFim = signal(formatLocalDate(new Date()));
  relProfissionalId = signal<number | null>(null);
  relatorio = signal<RelatorioCaixaResponse | null>(null);

  maxBarProc = computed(() => {
    const itens = this.relatorio()?.porProcedimento || [];
    return Math.max(...itens.map(i => i.total), 1);
  });

  pieSlices = computed(() => this.buildPieSlices(this.relatorio()?.porFormaPagamento || []));

  ngOnInit(): void {
    this.api.listarProfissionais().subscribe({
      next: (lista) => this.profissionais.set(lista),
      error: () => this.profissionais.set([])
    });

    this.carregarPendentes();
    this.carregarLancamentos();
    this.aplicarPresetRelatorio('diario');

    this.route.queryParamMap.subscribe(params => {
      const agendamentoId = params.get('agendamentoId');
      const tab = params.get('tab');
      if (tab === 'pendentes') this.tabIndex.set(1);
      if (tab === 'relatorios') this.tabIndex.set(2);
      if (tab === 'lancamentos') this.tabIndex.set(0);
      if (agendamentoId) {
        this.abrirRecebimento(Number(agendamentoId));
        this.router.navigate([], { queryParams: { agendamentoId: null, tab: params.get('tab') }, queryParamsHandling: 'merge', replaceUrl: true });
      }
    });
  }

  onTabChange(index: number): void {
    this.tabIndex.set(index);
    if (index === 1) this.carregarPendentes();
    if (index === 0) this.carregarLancamentos();
    if (index === 2) this.carregarRelatorio();
  }

  carregarPendentes(): void {
    this.loading.set(true);
    this.api.listarPendentesCaixa({
      dataInicio: this.filtroDataInicio(),
      dataFim: this.filtroDataFim(),
      profissionalId: this.filtroProfissionalId()
    }).subscribe({
      next: (lista) => {
        this.pendentes.set(lista);
        this.loading.set(false);
      },
      error: () => {
        this.pendentes.set([]);
        this.loading.set(false);
      }
    });
  }

  carregarLancamentos(): void {
    this.loading.set(true);
    this.api.listarPagamentos({
      dataInicio: this.filtroDataInicio(),
      dataFim: this.filtroDataFim(),
      profissionalId: this.filtroProfissionalId(),
      formaPagamento: this.filtroForma(),
      status: this.filtroStatus()
    }).subscribe({
      next: (lista) => {
        this.lancamentos.set(lista);
        this.loading.set(false);
      },
      error: () => {
        this.lancamentos.set([]);
        this.loading.set(false);
      }
    });
  }

  aplicarFiltrosLista(): void {
    if (this.tabIndex() === 1) this.carregarPendentes();
    else this.carregarLancamentos();
  }

  abrirRecebimento(agendamentoId: number): void {
    const ref = this.dialog.open(PagamentoDialogComponent, {
      width: '560px',
      maxWidth: '95vw',
      panelClass: 'modern-dialog-container',
      data: { agendamentoId }
    });
    ref.afterClosed().subscribe(result => {
      if (result) {
        this.notification.showSuccess('Pagamento registrado com sucesso!');
        this.carregarPendentes();
        this.carregarLancamentos();
        if (this.relatorio()) this.carregarRelatorio();
      }
    });
  }

  receberPorIdManual(valor: string): void {
    const id = Number(valor);
    if (!id || Number.isNaN(id)) {
      this.notification.showError('Informe um ID de agendamento válido.');
      return;
    }
    this.abrirRecebimento(id);
  }

  estornar(pagamento: PagamentoResponse): void {
    if (pagamento.status === 'ESTORNADO') return;
    if (!confirm(`Estornar pagamento #${pagamento.id} de ${formatarMoeda(pagamento.valorPago)}?`)) {
      return;
    }
    const motivo = prompt('Motivo do estorno (opcional):');
    if (motivo === null) return;
    this.api.estornarPagamento(pagamento.id, motivo.trim() ? { motivo: motivo.trim() } : {}).subscribe({
      next: () => {
        this.notification.showSuccess('Pagamento estornado.');
        this.carregarLancamentos();
        this.carregarPendentes();
      },
      error: () => {}
    });
  }

  aplicarPresetRelatorio(preset: PresetRelatorio): void {
    this.presetRelatorio.set(preset);
    const hoje = new Date();
    let range = rangeDia(hoje);
    if (preset === 'semanal') range = rangeSemana(hoje);
    if (preset === 'mensal') range = rangeMes(hoje);
    if (preset !== 'personalizado') {
      this.relDataInicio.set(range.dataInicio);
      this.relDataFim.set(range.dataFim);
      this.carregarRelatorio();
    }
  }

  carregarRelatorio(): void {
    this.loading.set(true);
    this.api.obterRelatorioCaixa({
      dataInicio: this.relDataInicio(),
      dataFim: this.relDataFim(),
      profissionalId: this.relProfissionalId()
    }).subscribe({
      next: (rel) => {
        this.relatorio.set(rel);
        this.loading.set(false);
      },
      error: () => {
        this.relatorio.set(null);
        this.loading.set(false);
      }
    });
  }

  imprimirRelatorio(): void {
    const rel = this.relatorio();
    if (!rel) {
      this.notification.showError('Gere o relatório antes de imprimir.');
      return;
    }
    const profissionalId = this.relProfissionalId();
    const profissionalNome = profissionalId != null
      ? this.profissionais().find(p => p.id === profissionalId)?.nome
      : null;

    imprimirRelatorioCaixa({
      clinicaNome: 'Lene Costa · Clínica Estética',
      dataInicio: this.relDataInicio(),
      dataFim: this.relDataFim(),
      profissionalFiltro: profissionalNome || null,
      geradoPor: this.auth.userName() || null,
      relatorio: rel
    });
  }

  barWidth(valor: number, max: number): string {
    return `${Math.max(4, (valor / max) * 100)}%`;
  }

  private buildPieSlices(itens: TotaisPorChave[]): { label: string; color: string; path: string; total: number }[] {
    const cores = ['#A97C6E', '#5C4037', '#2E7D6F', '#3D5A80', '#B85C38', '#6B4E71'];
    const total = itens.reduce((s, i) => s + i.total, 0) || 1;
    let angulo = -Math.PI / 2;
    const cx = 60;
    const cy = 60;
    const r = 50;
    return itens.map((item, idx) => {
      const fatia = (item.total / total) * Math.PI * 2;
      const x1 = cx + r * Math.cos(angulo);
      const y1 = cy + r * Math.sin(angulo);
      angulo += fatia;
      const x2 = cx + r * Math.cos(angulo);
      const y2 = cy + r * Math.sin(angulo);
      const large = fatia > Math.PI ? 1 : 0;
      const path = itens.length === 1
        ? `M ${cx} ${cy} m -${r},0 a ${r},${r} 0 1,0 ${r * 2},0 a ${r},${r} 0 1,0 -${r * 2},0`
        : `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
      return {
        label: item.rotulo || rotuloFormaPagamento(item.chave),
        color: cores[idx % cores.length],
        path,
        total: item.total
      };
    });
  }

  linePoints(dias: TotalPorDia[]): string {
    if (!dias.length) return '';
    const max = Math.max(...dias.map(d => d.total), 1);
    const w = 280;
    const h = 100;
    const pad = 8;
    return dias.map((d, i) => {
      const x = pad + (i / Math.max(dias.length - 1, 1)) * (w - pad * 2);
      const y = h - pad - (d.total / max) * (h - pad * 2);
      return `${x},${y}`;
    }).join(' ');
  }
}
