/** Formata número como moeda BRL (pt-BR). */
export function formatarMoeda(valor: number | null | undefined): string {
  const n = Number(valor ?? 0);
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** yyyy-MM-dd em fuso local */
export function formatLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function formatarDataBr(isoDate: string | null | undefined): string {
  if (!isoDate) return '';
  const [y, m, d] = isoDate.substring(0, 10).split('-');
  if (!y || !m || !d) return isoDate;
  return `${d}/${m}/${y}`;
}

/** Segunda a domingo da semana que contém `ref`. */
export function rangeSemana(ref: Date = new Date()): { dataInicio: string; dataFim: string } {
  const d = new Date(ref);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0=dom
  const diffSegunda = day === 0 ? -6 : 1 - day;
  const inicio = new Date(d);
  inicio.setDate(d.getDate() + diffSegunda);
  const fim = new Date(inicio);
  fim.setDate(inicio.getDate() + 6);
  return { dataInicio: formatLocalDate(inicio), dataFim: formatLocalDate(fim) };
}

export function rangeMes(ref: Date = new Date()): { dataInicio: string; dataFim: string } {
  const inicio = new Date(ref.getFullYear(), ref.getMonth(), 1);
  const fim = new Date(ref.getFullYear(), ref.getMonth() + 1, 0);
  return { dataInicio: formatLocalDate(inicio), dataFim: formatLocalDate(fim) };
}

export function rangeDia(ref: Date = new Date()): { dataInicio: string; dataFim: string } {
  const s = formatLocalDate(ref);
  return { dataInicio: s, dataFim: s };
}

export const FORMAS_PAGAMENTO: { value: string; label: string }[] = [
  { value: 'DINHEIRO', label: 'Dinheiro' },
  { value: 'PIX', label: 'PIX' },
  { value: 'CARTAO_DEBITO', label: 'Cartão Débito' },
  { value: 'CARTAO_CREDITO', label: 'Cartão Crédito' },
  { value: 'TRANSFERENCIA', label: 'Transferência' },
  { value: 'OUTRO', label: 'Outro' }
];

export const STATUS_PAGAMENTO_LABEL: Record<string, string> = {
  PENDENTE: 'Pendente',
  PAGO: 'Pago',
  PARCIAL: 'Parcial',
  ESTORNADO: 'Estornado'
};

export function rotuloFormaPagamento(chave: string): string {
  return FORMAS_PAGAMENTO.find(f => f.value === chave)?.label || chave;
}
