import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, catchError, of, forkJoin } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  Paciente,
  Page,
  Agendamento,
  AgendamentoRequest,
  Procedimento,
  Insumo,
  LocalAplicacao,
  EvolucaoEstetica,
  UsuarioRequest,
  UsuarioResponse,
  Profissional,
  LoginRequest,
  TokenResponse,
  PagamentoRequest,
  PagamentoResponse,
  SugestaoPagamentoResponse,
  ContaPendenteResponse,
  EstornoRequest,
  RelatorioCaixaResponse
} from '../models/api.models';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // Autenticação
  login(request: LoginRequest): Observable<TokenResponse> {
    return this.http.post<TokenResponse>(`${this.baseUrl}/auth/login`, request);
  }

  // Pacientes
  listarPacientes(page: number = 0, size: number = 10, sort: string = 'nome,asc'): Observable<Page<Paciente>> {
    const params = new HttpParams()
      .set('page', page)
      .set('size', size)
      .set('sort', sort);
    return this.http.get<Page<Paciente>>(`${this.baseUrl}/paciente/listar`, { params });
  }

  buscarPacientesPorCriterios(nome?: string, cpf?: string, email?: string, page: number = 0, size: number = 10, sort: string = 'nome,asc'): Observable<Page<Paciente>> {
    let params = new HttpParams()
      .set('page', page)
      .set('size', size)
      .set('sort', sort);

    if (nome) params = params.set('nome', nome);
    if (cpf) params = params.set('cpf', cpf);
    if (email) params = params.set('email', email);

    return this.http.get<Page<Paciente>>(`${this.baseUrl}/paciente/criterios`, { params });
  }

  buscarPaciente(id: number): Observable<Paciente> {
    return this.http.get<Paciente>(`${this.baseUrl}/paciente/buscar/${id}`);
  }

  criarPaciente(paciente: Paciente): Observable<Paciente> {
    return this.http.post<Paciente>(`${this.baseUrl}/paciente/criar`, paciente);
  }

  atualizarPaciente(id: number, paciente: Paciente): Observable<Paciente> {
    return this.http.put<Paciente>(`${this.baseUrl}/paciente/atualizar/${id}`, paciente);
  }

  deletarPaciente(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/paciente/deletar/${id}`);
  }

  // Agendamentos — alinhado ao Swagger
  /**
   * Agenda geral ou por profissional no intervalo visível.
   * 200 + lista | 204 → [] | 400/404 → ErroResponse (interceptor).
   */
  listarAgenda(
    dataInicio: string,
    dataFim: string,
    profissionalId?: number | null,
    status?: string
  ): Observable<Agendamento[]> {
    let params = new HttpParams()
      .set('dataInicio', dataInicio)
      .set('dataFim', dataFim);
    if (profissionalId != null) {
      params = params.set('profissionalId', profissionalId);
    }
    if (status) {
      params = params.set('status', status);
    }
    return this.http
      .get<Agendamento[]>(`${this.baseUrl}/agendamento/listar-agenda`, {
        params,
        observe: 'response'
      })
      .pipe(
        map(res => {
          if (res.status === 204 || res.body == null) {
            return [];
          }
          return res.body.map(a => this.normalizarAgendamento(a));
        })
      );
  }

  /** @deprecated Preferir listarAgenda(data, data, profissionalId) */
  listarAgendamentos(data: string, profissionalId: number): Observable<Agendamento[]> {
    return this.listarAgenda(data, data, profissionalId);
  }

  listarAgendamentosPorStatus(status: string): Observable<Agendamento[]> {
    const params = new HttpParams().set('status', status);
    return this.http.get<Agendamento[]>(`${this.baseUrl}/agendamento/listar-por-status`, { params }).pipe(
      map(lista => (lista || []).map(a => this.normalizarAgendamento(a)))
    );
  }

  listarTodosAgendamentos(page: number = 0, size: number = 500): Observable<Agendamento[]> {
    const params = new HttpParams()
      .set('page', page)
      .set('size', size);
    return this.http.get<Page<Agendamento>>(`${this.baseUrl}/agendamento/listar-todos`, { params }).pipe(
      map(res => (res?.content ?? []).map(a => this.normalizarAgendamento(a))),
      catchError(err => {
        console.warn('listar-todos falhou; tentando fallback por status', err);
        return this.listarAgendamentosPorTodosStatus();
      })
    );
  }

  /** GET /api/profissionais — seletor da agenda e formulários */
  listarProfissionais(): Observable<Profissional[]> {
    return this.http
      .get<Profissional[]>(`${this.baseUrl}/profissionais`, { observe: 'response' })
      .pipe(
        map(res => {
          if (res.status === 204 || res.body == null) {
            return [];
          }
          return Array.isArray(res.body) ? res.body : [];
        })
      );
  }

  /** Fallback quando listar-todos retorna erro no backend */
  listarAgendamentosPorTodosStatus(): Observable<Agendamento[]> {
    const statusList = ['AGENDADO', 'CONFIRMADO', 'EM_ATENDIMENTO', 'CONCLUIDO', 'CANCELADO', 'NAO_COMPARECEU'];
    return forkJoin(statusList.map(status =>
      this.listarAgendamentosPorStatus(status).pipe(catchError(() => of([] as Agendamento[])))
    )).pipe(
      map(listas => {
        const mapa = new Map<number, Agendamento>();
        listas.flat().forEach(a => {
          if (a.id != null) mapa.set(a.id, a);
        });
        return Array.from(mapa.values());
      })
    );
  }

  criarAgendamento(agendamento: AgendamentoRequest): Observable<Agendamento> {
    return this.http.post<Agendamento>(`${this.baseUrl}/agendamento/criar`, agendamento).pipe(
      map(a => this.normalizarAgendamento(a))
    );
  }

  atualizarAgendamento(id: number, agendamento: AgendamentoRequest): Observable<Agendamento> {
    return this.http.patch<Agendamento>(`${this.baseUrl}/agendamento/atualizar/${id}`, agendamento).pipe(
      map(a => this.normalizarAgendamento(a))
    );
  }

  cancelarAgendamento(id: number): Observable<void> {
    return this.http.patch<void>(`${this.baseUrl}/agendamento/${id}/cancelar`, {});
  }

  confirmarAgendamento(id: number): Observable<void> {
    return this.http.patch<void>(`${this.baseUrl}/agendamento/${id}/confirmar`, {});
  }

  concluirAgendamento(id: number): Observable<void> {
    return this.http.patch<void>(`${this.baseUrl}/agendamento/${id}/concluir`, {});
  }

  marcarNaoCompareceu(id: number): Observable<void> {
    return this.http.patch<void>(`${this.baseUrl}/agendamento/${id}/nao-compareceu`, {});
  }

  /** Converte resposta aninhada do Swagger em campos planos usados pela UI */
  private normalizarAgendamento(a: Agendamento): Agendamento {
    const pacienteId = a.pacienteId ?? a.paciente?.id;
    const profissionalId = a.profissionalId ?? a.profissional?.id;
    const procedimentosIds = a.procedimentosIds
      ?? (a.procedimentos || []).map(p => p.id!).filter(id => id != null);
    return {
      ...a,
      pacienteId,
      profissionalId,
      procedimentosIds
    };
  }

  // Configurações (Procedimentos, Insumos, Locais)
  listarProcedimentos(): Observable<Procedimento[]> {
    return this.http
      .get<Procedimento[]>(`${this.baseUrl}/configs/procedimentos/listar`, { observe: 'response' })
      .pipe(map(res => (res.status === 204 || !res.body ? [] : res.body)));
  }

  criarProcedimento(procedimento: Procedimento): Observable<Procedimento> {
    return this.http.post<Procedimento>(`${this.baseUrl}/configs/procedimentos/criar`, procedimento);
  }

  atualizarProcedimento(id: number, procedimento: Procedimento): Observable<Procedimento> {
    return this.http.put<Procedimento>(`${this.baseUrl}/configs/procedimentos/atualizar/${id}`, procedimento);
  }

  listarInsumos(): Observable<Insumo[]> {
    return this.http
      .get<Insumo[]>(`${this.baseUrl}/configs/insumos/listar`, { observe: 'response' })
      .pipe(map(res => (res.status === 204 || !res.body ? [] : res.body)));
  }

  criarInsumo(insumo: Insumo): Observable<Insumo> {
    return this.http.post<Insumo>(`${this.baseUrl}/configs/insumos/criar`, insumo);
  }

  listarLocais(): Observable<LocalAplicacao[]> {
    return this.http.get<LocalAplicacao[]>(`${this.baseUrl}/configs/locaisaplicacao/listar`);
  }

  criarLocal(local: LocalAplicacao): Observable<LocalAplicacao> {
    return this.http.post<LocalAplicacao>(`${this.baseUrl}/configs/locaisaplicacao/criar`, local);
  }

  // ——— Caixa ———
  private listaOuVazia<T>(res: { status: number; body: T[] | null }): T[] {
    if (res.status === 204 || res.body == null) return [];
    return Array.isArray(res.body) ? res.body : [];
  }

  obterSugestaoPagamento(agendamentoId: number): Observable<SugestaoPagamentoResponse> {
    return this.http.get<SugestaoPagamentoResponse>(`${this.baseUrl}/caixa/sugestao/${agendamentoId}`);
  }

  registrarPagamento(request: PagamentoRequest): Observable<PagamentoResponse> {
    return this.http.post<PagamentoResponse>(`${this.baseUrl}/caixa/pagamentos`, request);
  }

  listarPagamentos(filtros: {
    dataInicio: string;
    dataFim: string;
    profissionalId?: number | null;
    formaPagamento?: string | null;
    status?: string | null;
  }): Observable<PagamentoResponse[]> {
    let params = new HttpParams()
      .set('dataInicio', filtros.dataInicio)
      .set('dataFim', filtros.dataFim);
    if (filtros.profissionalId != null) params = params.set('profissionalId', filtros.profissionalId);
    if (filtros.formaPagamento) params = params.set('formaPagamento', filtros.formaPagamento);
    if (filtros.status) params = params.set('status', filtros.status);
    return this.http
      .get<PagamentoResponse[]>(`${this.baseUrl}/caixa/pagamentos`, { params, observe: 'response' })
      .pipe(map(res => this.listaOuVazia(res)));
  }

  listarPendentesCaixa(filtros: {
    dataInicio: string;
    dataFim: string;
    profissionalId?: number | null;
  }): Observable<ContaPendenteResponse[]> {
    let params = new HttpParams()
      .set('dataInicio', filtros.dataInicio)
      .set('dataFim', filtros.dataFim);
    if (filtros.profissionalId != null) params = params.set('profissionalId', filtros.profissionalId);
    return this.http
      .get<ContaPendenteResponse[]>(`${this.baseUrl}/caixa/pendentes`, { params, observe: 'response' })
      .pipe(map(res => this.listaOuVazia(res)));
  }

  estornarPagamento(id: number, body?: EstornoRequest): Observable<PagamentoResponse | void> {
    return this.http.patch<PagamentoResponse | void>(`${this.baseUrl}/caixa/pagamentos/${id}/estornar`, body || {});
  }

  obterRelatorioCaixa(filtros: {
    dataInicio: string;
    dataFim: string;
    profissionalId?: number | null;
  }): Observable<RelatorioCaixaResponse> {
    let params = new HttpParams()
      .set('dataInicio', filtros.dataInicio)
      .set('dataFim', filtros.dataFim);
    if (filtros.profissionalId != null) params = params.set('profissionalId', filtros.profissionalId);
    return this.http.get<RelatorioCaixaResponse>(`${this.baseUrl}/caixa/relatorios`, { params });
  }

  // Evolução Clínica
  criarEvolucao(evolucao: EvolucaoEstetica): Observable<EvolucaoEstetica> {
    return this.http.post<EvolucaoEstetica>(`${this.baseUrl}/evolucao-clinica/criar`, evolucao);
  }

  buscarEvolucaoPorAgendamento(agendamentoId: number): Observable<EvolucaoEstetica> {
    return this.http.get<EvolucaoEstetica>(`${this.baseUrl}/atendimentos/agendamento/${agendamentoId}`);
  }

  buscarEvolucoesPorPaciente(pacienteId: number): Observable<EvolucaoEstetica[]> {
    return this.http.get<EvolucaoEstetica[]>(`${this.baseUrl}/atendimentos/paciente/${pacienteId}`);
  }

  atualizarEvolucao(id: number, evolucao: EvolucaoEstetica): Observable<EvolucaoEstetica> {
    return this.http.put<EvolucaoEstetica>(`${this.baseUrl}/atendimentos/${id}`, evolucao);
  }

  finalizarEvolucao(id: number): Observable<void> {
    return this.http.patch<void>(`${this.baseUrl}/atendimentos/${id}/finalizar`, {});
  }

  buscarAgendamento(id: number): Observable<Agendamento> {
    return this.http.get<Agendamento>(`${this.baseUrl}/agendamento/buscar/${id}`);
  }

  listarAgendamentosPorPaciente(pacienteId: number): Observable<Agendamento[]> {
    return this.http.get<Agendamento[]>(`${this.baseUrl}/agendamento/paciente/${pacienteId}`);
  }

  buscarAtendimentoPorId(id: number): Observable<EvolucaoEstetica> {
    return this.http.get<EvolucaoEstetica>(`${this.baseUrl}/atendimentos/${id}`);
  }

  // Usuários — alinhado ao Swagger: /usuarios e /usuarios/{id}
  listarUsuarios(page: number = 0, size: number = 100, sort: string = 'nome,asc'): Observable<UsuarioResponse[]> {
    const params = new HttpParams()
      .set('page', page)
      .set('size', size)
      .set('sort', sort);
    return this.http.get<Page<UsuarioResponse>>(`${this.baseUrl}/usuarios`, { params }).pipe(
      map(res => res?.content ?? [])
    );
  }

  buscarUsuarioPorId(id: number): Observable<UsuarioResponse> {
    return this.http.get<UsuarioResponse>(`${this.baseUrl}/usuarios/${id}`);
  }

  criarUsuario(usuario: UsuarioRequest): Observable<UsuarioResponse> {
    return this.http.post<UsuarioResponse>(`${this.baseUrl}/usuarios`, usuario);
  }

  atualizarUsuario(id: number, usuario: UsuarioRequest): Observable<UsuarioResponse> {
    return this.http.put<UsuarioResponse>(`${this.baseUrl}/usuarios/${id}`, usuario);
  }

  deletarUsuario(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/usuarios/${id}`);
  }
}
