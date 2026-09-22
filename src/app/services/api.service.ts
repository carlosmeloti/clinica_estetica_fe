import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
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
    return this.http.get<Page<Paciente>>(`${this.baseUrl}/paciente`, { params });
  }

  buscarPacientesPorCriterios(nome?: string, cpf?: string, email?: string, page: number = 0, size: number = 10, sort: string = 'nome,asc'): Observable<Page<Paciente>> {
    let params = new HttpParams()
      .set('page', page)
      .set('size', size)
      .set('sort', sort);

    if (nome) params = params.set('nome', nome);
    if (cpf) params = params.set('cpf', cpf);
    if (email) params = params.set('email', email);

    return this.http.get<Page<Paciente>>(`${this.baseUrl}/paciente/buscar`, { params });
  }

  buscarPaciente(id: number): Observable<Paciente> {
    return this.http.get<Paciente>(`${this.baseUrl}/paciente/${id}`);
  }

  criarPaciente(paciente: Paciente): Observable<Paciente> {
    return this.http.post<Paciente>(`${this.baseUrl}/paciente`, paciente);
  }

  atualizarPaciente(id: number, paciente: Paciente): Observable<Paciente> {
    return this.http.put<Paciente>(`${this.baseUrl}/paciente/${id}`, paciente);
  }

  deletarPaciente(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/paciente/${id}`);
  }

  // Agendamentos
  listarAgendamentos(data?: string, profissionalId?: number): Observable<Agendamento[]> {
    let params = new HttpParams();
    if (data) params = params.set('data', data);
    if (profissionalId) params = params.set('profissionalId', profissionalId);
    return this.http.get<Agendamento[]>(`${this.baseUrl}/agendamento`, { params });
  }

  listarAgendamentosPorStatus(status: string): Observable<Agendamento[]> {
    const params = new HttpParams().set('status', status);
    return this.http.get<Agendamento[]>(`${this.baseUrl}/agendamento/status`, { params });
  }

  criarAgendamento(agendamento: Agendamento): Observable<Agendamento> {
    return this.http.post<Agendamento>(`${this.baseUrl}/agendamento`, agendamento);
  }

  atualizarAgendamento(id: number, agendamento: Agendamento): Observable<Agendamento> {
    return this.http.put<Agendamento>(`${this.baseUrl}/agendamento/${id}`, agendamento);
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
    return this.http.get<Procedimento[]>(`${this.baseUrl}/procedimento`);
  }

  criarProcedimento(procedimento: Procedimento): Observable<Procedimento> {
    return this.http.post<Procedimento>(`${this.baseUrl}/procedimento`, procedimento);
  }

  listarInsumos(): Observable<Insumo[]> {
    return this.http.get<Insumo[]>(`${this.baseUrl}/insumo`);
  }

  criarInsumo(insumo: Insumo): Observable<Insumo> {
    return this.http.post<Insumo>(`${this.baseUrl}/insumo`, insumo);
  }

  listarLocais(): Observable<LocalAplicacao[]> {
    return this.http.get<LocalAplicacao[]>(`${this.baseUrl}/local-aplicacao`);
  }

  criarLocal(local: LocalAplicacao): Observable<LocalAplicacao> {
    return this.http.post<LocalAplicacao>(`${this.baseUrl}/local-aplicacao`, local);
  }

  // Evolução Clínica
  criarEvolucao(evolucao: EvolucaoEstetica): Observable<EvolucaoEstetica> {
    return this.http.post<EvolucaoEstetica>(`${this.baseUrl}/evolucao-estetica`, evolucao);
  }

  // Usuários
  listarUsuarios(): Observable<UsuarioResponse[]> {
    return this.http.get<UsuarioResponse[]>(`${this.baseUrl}/usuario`);
  }

  buscarUsuarioPorLogin(login: string): Observable<UsuarioResponse> {
    return this.http.get<UsuarioResponse>(`${this.baseUrl}/usuario/${login}`);
  }

  criarUsuario(usuario: UsuarioRequest): Observable<UsuarioResponse> {
    return this.http.post<UsuarioResponse>(`${this.baseUrl}/usuario`, usuario);
  }
}
