export interface Endereco {
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
}

export interface Paciente {
  id?: number;
  nome: string;
  cpf?: string;
  email?: string;
  telefone?: string;
  dataNascimento?: string;
  endereco?: Endereco;
  observacoesGerais?: string;
  tipoSanguineo?: string;
  nomeResponsavel?: string;
}

export type PerfilUsuario = 'ADMIN' | 'PROFISSIONAL' | 'RECEPCAO' | 'FINANCEIRO';

export interface UsuarioRequest {
  login: string;
  senha?: string;
  nome: string;
  email?: string;
  perfil: PerfilUsuario;
  registroProfissional?: string;
}

export interface UsuarioResponse {
  id?: number;
  nome: string;
  email: string;
  login: string;
  perfil: string;
  registroProfissional?: string;
}

/** Resposta de GET /api/profissionais */
export interface Profissional {
  id: number;
  nome: string;
  email: string;
  login: string;
  registroProfissional?: string;
}

export interface LoginRequest {
  login: string;
  password?: string;
}

export interface TokenResponse {
  token: string;
  nome: string;
  perfil: string;
}

export interface Procedimento {
  id?: number;
  nome: string;
  precoSugerido?: number;
  duracaoMinutos?: number;
}

export interface LocalAplicacao {
  id?: number;
  nome: string;
  preDefinido?: boolean;
}

export interface Insumo {
  id?: number;
  nome: string;
  quantidadeEstoque?: number;
  unidadeMedida?: string;
  quantidadeUsada?: number;
}

export interface AgendamentoRequest {
  id?: number;
  pacienteId: number;
  profissionalId: number;
  procedimentos: Procedimento[];
  dataHoraInicio: string;
  dataHoraFim: string;
  status?: 'AGENDADO' | 'CONFIRMADO' | 'EM_ATENDIMENTO' | 'CONCLUIDO' | 'CANCELADO' | 'NAO_COMPARECEU';
  motivoConsulta?: string;
  valorPrevisto?: number;
}

/** Resposta do Swagger (+ campos derivados para uso no front) */
export interface Agendamento {
  id?: number;
  pacienteId?: number;
  profissionalId?: number;
  procedimentosIds?: number[];
  paciente?: Paciente;
  profissional?: UsuarioResponse;
  procedimentos?: Procedimento[];
  dataHoraInicio: string;
  dataHoraFim: string;
  status?: 'AGENDADO' | 'CONFIRMADO' | 'EM_ATENDIMENTO' | 'CONCLUIDO' | 'CANCELADO' | 'NAO_COMPARECEU';
  motivoConsulta?: string;
  valorPrevisto?: number;
}

export interface EvolucaoEstetica {
  id?: number;
  agendamentoId: number;
  pacienteId: number;
  profissionalId: number;
  dataAtendimento?: string;
  relatoClinico?: string;
  observacoes?: string;
  orientacoesPosProcedimento?: string;
  intercorrencias?: string;
  retornoRecomendado?: string;
  procedimentosRealizadosIds?: number[];
  locaisIds?: number[];
  consumos?: Insumo[];
  finalizado?: boolean;
}

export interface Pageable {
  page?: number;
  size?: number;
  sort?: string[];
}

export interface Page<T> {
  totalPages: number;
  totalElements: number;
  size: number;
  content: T[];
  number: number;
  first: boolean;
  last: boolean;
  numberOfElements: number;
  empty: boolean;
}

export interface ErroResponse {
  timestamp: string;
  status: number;
  erro: string;
  mensagem: string;
  path: string;
  campos?: { [key: string]: string };
}
