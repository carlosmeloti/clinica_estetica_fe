import { RelatorioCaixaResponse, TotaisPorChave, TotalPorDia, PagamentoResponse } from '../models/api.models';
import {
  formatarDataBr,
  formatarMoeda,
  rotuloFormaPagamento,
  STATUS_PAGAMENTO_LABEL
} from './financeiro.utils';

export interface RelatorioPrintContext {
  clinicaNome?: string;
  dataInicio: string;
  dataFim: string;
  profissionalFiltro?: string | null;
  geradoPor?: string | null;
  relatorio: RelatorioCaixaResponse;
}

function esc(value: string | number | null | undefined): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDateTimeBr(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return esc(iso);
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function agoraBr(): string {
  return new Date().toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function tabelaTotais(titulo: string, itens: TotaisPorChave[] | undefined, rotuloFallback?: (chave: string) => string): string {
  const lista = itens || [];
  if (!lista.length) {
    return `
      <section class="bloco">
        <h2>${esc(titulo)}</h2>
        <p class="vazio">Sem dados neste período.</p>
      </section>`;
  }
  const totalGeral = lista.reduce((s, i) => s + (i.total || 0), 0);
  const rows = lista.map(i => {
    const rotulo = i.rotulo || (rotuloFallback ? rotuloFallback(i.chave) : i.chave);
    const pct = totalGeral > 0 ? ((i.total / totalGeral) * 100).toFixed(1) : '0.0';
    return `<tr>
      <td>${esc(rotulo)}</td>
      <td class="num">${esc(i.quantidade)}</td>
      <td class="num">${esc(formatarMoeda(i.total))}</td>
      <td class="num">${esc(pct)}%</td>
    </tr>`;
  }).join('');

  return `
    <section class="bloco">
      <h2>${esc(titulo)}</h2>
      <table>
        <thead>
          <tr>
            <th>Descrição</th>
            <th class="num">Qtd</th>
            <th class="num">Total</th>
            <th class="num">%</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
        <tfoot>
          <tr>
            <td>Total</td>
            <td class="num">${esc(lista.reduce((s, i) => s + (i.quantidade || 0), 0))}</td>
            <td class="num">${esc(formatarMoeda(totalGeral))}</td>
            <td class="num">100%</td>
          </tr>
        </tfoot>
      </table>
    </section>`;
}

function tabelaPorDia(itens: TotalPorDia[] | undefined): string {
  const lista = itens || [];
  if (!lista.length) {
    return `
      <section class="bloco">
        <h2>Movimento por dia</h2>
        <p class="vazio">Sem dados diários neste período.</p>
      </section>`;
  }
  const rows = lista.map(d => `<tr>
    <td>${esc(formatarDataBr(d.data))}</td>
    <td class="num">${esc(d.quantidade)}</td>
    <td class="num">${esc(formatarMoeda(d.total))}</td>
  </tr>`).join('');

  return `
    <section class="bloco">
      <h2>Movimento por dia</h2>
      <table>
        <thead>
          <tr>
            <th>Data</th>
            <th class="num">Pagamentos</th>
            <th class="num">Total</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </section>`;
}

function tabelaLancamentos(itens: PagamentoResponse[] | undefined): string {
  const lista = itens || [];
  if (!lista.length) {
    return `
      <section class="bloco pagina-break">
        <h2>Detalhamento de lançamentos</h2>
        <p class="vazio">Nenhum lançamento no período.</p>
      </section>`;
  }
  const rows = lista.map(l => `<tr>
    <td>${esc(l.id)}</td>
    <td>${esc(l.pacienteNome || '—')}</td>
    <td>${esc(l.profissionalNome || '—')}</td>
    <td>${esc(rotuloFormaPagamento(l.formaPagamento))}</td>
    <td class="num">${esc(formatarMoeda(l.valorBruto))}</td>
    <td class="num">${esc(formatarMoeda(l.desconto))}</td>
    <td class="num">${esc(formatarMoeda(l.valorPago))}</td>
    <td>${esc(STATUS_PAGAMENTO_LABEL[l.status] || l.status)}</td>
    <td>${esc(formatDateTimeBr(l.dataPagamento))}</td>
  </tr>`).join('');

  return `
    <section class="bloco pagina-break">
      <h2>Detalhamento de lançamentos</h2>
      <p class="subtitulo">${esc(lista.length)} registro(s)</p>
      <table class="compacta">
        <thead>
          <tr>
            <th>#</th>
            <th>Paciente</th>
            <th>Profissional</th>
            <th>Forma</th>
            <th class="num">Bruto</th>
            <th class="num">Desc.</th>
            <th class="num">Pago</th>
            <th>Status</th>
            <th>Data/Hora</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </section>`;
}

function estilos(): string {
  return `
    <style>
      @page {
        size: A4;
        margin: 14mm 12mm 16mm 12mm;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: "Segoe UI", Calibri, Arial, sans-serif;
        color: #2c241f;
        background: #fff;
        font-size: 11pt;
        line-height: 1.35;
      }
      .toolbar {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        padding: 12px 16px;
        background: #f7f3f0;
        border-bottom: 1px solid #e2d6cf;
      }
      .toolbar button {
        border: none;
        border-radius: 8px;
        padding: 10px 16px;
        font-weight: 600;
        cursor: pointer;
      }
      .toolbar .btn-print {
        background: #A97C6E;
        color: #fff;
      }
      .toolbar .btn-close {
        background: #fff;
        color: #5C4037;
        border: 1px solid #C5A89E;
      }
      .doc { padding: 8px 4px 24px; }
      .cabecalho {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 16px;
        border-bottom: 3px solid #A97C6E;
        padding-bottom: 14px;
        margin-bottom: 18px;
      }
      .marca .nome {
        margin: 0;
        font-size: 22pt;
        color: #5C4037;
        letter-spacing: 0.02em;
      }
      .marca .tagline {
        margin: 4px 0 0;
        color: #A97C6E;
        font-size: 10pt;
        text-transform: uppercase;
        letter-spacing: 0.12em;
      }
      .meta {
        text-align: right;
        font-size: 9.5pt;
        color: #5a514c;
      }
      .meta strong { color: #5C4037; }
      .titulo-doc {
        margin: 0 0 16px;
      }
      .titulo-doc h1 {
        margin: 0 0 4px;
        font-size: 16pt;
        color: #5C4037;
      }
      .titulo-doc p {
        margin: 0;
        color: #6b615a;
        font-size: 10pt;
      }
      .kpis {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 10px;
        margin-bottom: 20px;
      }
      .kpi {
        border: 1px solid #e4d8d0;
        border-radius: 10px;
        padding: 12px 14px;
        background: linear-gradient(180deg, #fbf8f5 0%, #fff 100%);
      }
      .kpi .label {
        display: block;
        font-size: 8.5pt;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: #8a7a70;
        margin-bottom: 4px;
      }
      .kpi .valor {
        font-size: 14pt;
        font-weight: 700;
        color: #5C4037;
      }
      .kpi .sub {
        display: block;
        margin-top: 2px;
        font-size: 8.5pt;
        color: #9a8b82;
      }
      .kpi.alerta .valor { color: #B85C38; }
      .grid-2 {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 14px;
        margin-bottom: 8px;
      }
      .bloco {
        margin-bottom: 16px;
        break-inside: avoid;
      }
      .bloco h2 {
        margin: 0 0 8px;
        font-size: 11.5pt;
        color: #5C4037;
        border-left: 4px solid #A97C6E;
        padding-left: 8px;
      }
      .subtitulo {
        margin: -4px 0 8px;
        color: #8a7a70;
        font-size: 9pt;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        font-size: 9.5pt;
      }
      table.compacta { font-size: 8.5pt; }
      th, td {
        border: 1px solid #e0d5cd;
        padding: 6px 8px;
        text-align: left;
        vertical-align: top;
      }
      th {
        background: #f3ebe5;
        color: #5C4037;
        font-weight: 700;
      }
      tfoot td {
        background: #faf6f3;
        font-weight: 700;
      }
      .num { text-align: right; white-space: nowrap; }
      .vazio {
        margin: 0;
        color: #9a8b82;
        font-style: italic;
        font-size: 9.5pt;
      }
      .rodape {
        margin-top: 24px;
        padding-top: 10px;
        border-top: 1px solid #e0d5cd;
        font-size: 8.5pt;
        color: #8a7a70;
        display: flex;
        justify-content: space-between;
        gap: 12px;
      }
      .pagina-break { page-break-before: always; }
      @media print {
        .doc { padding: 0; }
        a { color: inherit; text-decoration: none; }
      }
    </style>`;
}

export function montarHtmlRelatorioCaixa(ctx: RelatorioPrintContext): string {
  const rel = ctx.relatorio;
  const clinica = ctx.clinicaNome || 'Lene Costa · Clínica Estética';
  const periodo = `${formatarDataBr(ctx.dataInicio)} a ${formatarDataBr(ctx.dataFim)}`;
  const filtroProf = ctx.profissionalFiltro
    ? `Profissional: ${ctx.profissionalFiltro}`
    : 'Profissional: todos';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>Relatório de Caixa — ${esc(periodo)}</title>
  ${estilos()}
</head>
<body>
  <div class="doc">
    <header class="cabecalho">
      <div class="marca">
        <h1 class="nome">${esc(clinica)}</h1>
        <p class="tagline">Relatório financeiro de caixa</p>
      </div>
      <div class="meta">
        <div><strong>Período</strong><br>${esc(periodo)}</div>
        <div style="margin-top:8px"><strong>Filtro</strong><br>${esc(filtroProf)}</div>
        <div style="margin-top:8px"><strong>Emitido em</strong><br>${esc(agoraBr())}</div>
        ${ctx.geradoPor ? `<div style="margin-top:8px"><strong>Emitido por</strong><br>${esc(ctx.geradoPor)}</div>` : ''}
      </div>
    </header>

    <div class="titulo-doc">
      <h1>Resumo executivo</h1>
      <p>${esc(rel.quantidadePagamentos || 0)} pagamento(s) no período · bruto ${esc(formatarMoeda(rel.totalBruto))}</p>
    </div>

    <section class="kpis">
      <div class="kpi">
        <span class="label">Total recebido</span>
        <span class="valor">${esc(formatarMoeda(rel.totalRecebido))}</span>
      </div>
      <div class="kpi">
        <span class="label">Descontos</span>
        <span class="valor">${esc(formatarMoeda(rel.totalDescontos))}</span>
      </div>
      <div class="kpi">
        <span class="label">Ticket médio</span>
        <span class="valor">${esc(formatarMoeda(rel.ticketMedio))}</span>
      </div>
      <div class="kpi alerta">
        <span class="label">Em aberto</span>
        <span class="valor">${esc(formatarMoeda(rel.valorPendente))}</span>
        <span class="sub">${esc(rel.quantidadeContasPendentes || 0)} conta(s) pendente(s)</span>
      </div>
    </section>

    <div class="grid-2">
      ${tabelaTotais('Por forma de pagamento', rel.porFormaPagamento, rotuloFormaPagamento)}
      ${tabelaTotais('Por profissional', rel.porProfissional)}
    </div>

    <div class="grid-2">
      ${tabelaTotais('Por procedimento', rel.porProcedimento)}
      ${tabelaPorDia(rel.porDia)}
    </div>

    ${tabelaLancamentos(rel.lancamentos)}

    <footer class="rodape">
      <span>Documento gerado pelo sistema de gestão · uso interno</span>
      <span>${esc(clinica)}</span>
    </footer>
  </div>
</body>
</html>`;
}

const PRINT_IFRAME_ID = 'caixa-relatorio-print-frame';

/** Imprime relatório formatado via iframe oculto (sem pop-up). */
export function imprimirRelatorioCaixa(ctx: RelatorioPrintContext): void {
  const html = montarHtmlRelatorioCaixa(ctx);

  document.getElementById(PRINT_IFRAME_ID)?.remove();

  const iframe = document.createElement('iframe');
  iframe.id = PRINT_IFRAME_ID;
  iframe.setAttribute('aria-hidden', 'true');
  iframe.setAttribute('title', 'Impressão do relatório de caixa');
  iframe.style.cssText =
    'position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none;';
  document.body.appendChild(iframe);

  const win = iframe.contentWindow;
  const doc = iframe.contentDocument || win?.document;
  if (!win || !doc) {
    iframe.remove();
    alert('Não foi possível preparar a impressão neste navegador.');
    return;
  }

  doc.open();
  doc.write(html);
  doc.close();

  const limpar = () => {
    setTimeout(() => {
      document.getElementById(PRINT_IFRAME_ID)?.remove();
    }, 800);
  };

  const disparar = () => {
    try {
      win.focus();
      win.addEventListener('afterprint', limpar, { once: true });
      win.print();
      // Fallback se afterprint não disparar (alguns navegadores)
      setTimeout(limpar, 60_000);
    } catch {
      iframe.remove();
      alert('Não foi possível abrir o diálogo de impressão.');
    }
  };

  // Garante que o documento do iframe terminou de carregar
  if (doc.readyState === 'complete') {
    setTimeout(disparar, 50);
  } else {
    iframe.onload = () => setTimeout(disparar, 50);
  }
}
