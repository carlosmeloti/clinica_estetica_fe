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

export interface UsuarioRequest {
  login: string;
  password?: string;
  nome: string;
  email: string;
  perfil: 'ADMIN' | 'MEDICO' | 'RECEPCAO' | 'FINANCEIRO';
  registroProfissional?: string;
}

export interface UsuarioResponse {
  nome: string;
  email: string;
  login: string;
  perfil: string;
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

export interface Agendamento {
  id?: number;
  pacienteId: number;
  profissionalId: number;
  procedimentoId: number;
  dataHoraInicio: string;
  dataHoraFim: string;
  status?: 'PENDENTE' | 'CONFIRMADO' | 'CANCELADO' | 'FINALIZADO' | 'AUSENTE';
  motivoConsulta?: string;
  valorPrevisto?: number;
}

export interface EvolucaoEstetica {
  id?: number;
  evolucaoId?: number;
  agendamentoId?: number;
  pacienteId?: number;
  profissionalId?: number;
  dataAtendimento?: string;
  relatoClinico?: string;
  numeroSessao?: number;
  pesoPacienteKg?: number;
  doseAplicadaMg?: number;
  locaisIds?: number[];
  consumos?: Insumo[];
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
