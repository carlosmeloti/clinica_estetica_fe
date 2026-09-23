import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  Paciente,
  Page,
  Agendamento,
  Procedimento,
  Insumo,
  LocalAplicacao,
  EvolucaoEstetica,
  UsuarioRequest,
  UsuarioResponse,
  LoginRequest,
  TokenResponse
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

  // Agendamentos
  listarAgendamentos(data?: string, profissionalId?: number): Observable<Agendamento[]> {
    let params = new HttpParams();
    if (data) params = params.set('data', data);
    if (profissionalId) params = params.set('profissionalId', profissionalId);
    return this.http.get<Agendamento[]>(`${this.baseUrl}/agendamento/listar-dia-profissional`, { params });
  }

  listarAgendamentosPorStatus(status: string): Observable<Agendamento[]> {
    const params = new HttpParams().set('status', status);
    return this.http.get<Agendamento[]>(`${this.baseUrl}/agendamento/listar-por-status`, { params });
  }

  listarTodosAgendamentos(): Observable<Agendamento[]> {
    return this.http.get<Agendamento[]>(`${this.baseUrl}/agendamento/listar-todos`);
  }

  criarAgendamento(agendamento: Agendamento): Observable<Agendamento> {
    return this.http.post<Agendamento>(`${this.baseUrl}/agendamento/criar`, agendamento);
  }

  atualizarAgendamento(id: number, agendamento: Agendamento): Observable<Agendamento> {
    return this.http.patch<Agendamento>(`${this.baseUrl}/agendamento/atualizar/${id}`, agendamento);
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

  // Configurações (Procedimentos, Insumos, Locais)
  listarProcedimentos(): Observable<Procedimento[]> {
    return this.http.get<Procedimento[]>(`${this.baseUrl}/configs/procedimentos/listar`);
  }

  criarProcedimento(procedimento: Procedimento): Observable<Procedimento> {
    return this.http.post<Procedimento>(`${this.baseUrl}/configs/procedimentos/criar`, procedimento);
  }

  listarInsumos(): Observable<Insumo[]> {
    return this.http.get<Insumo[]>(`${this.baseUrl}/configs/insumos/listar`);
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
