import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
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
  private baseUrl = 'http://localhost:8080/api';

  constructor(private http: HttpClient) {}

  // Autenticação
  login(request: LoginRequest): Observable<TokenResponse> {
    return this.http.post<TokenResponse>(`${this.baseUrl}/auth/login`, request);
  }

  // Pacientes
  listarPacientes(page: number = 0, size: number = 10): Observable<Page<Paciente>> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<Page<Paciente>>(`${this.baseUrl}/paciente/listar`, { params });
  }

  buscarPacientesPorCriterios(nome: string = '', page: number = 0, size: number = 10, sort: string = 'id,desc'): Observable<Page<Paciente>> {
    let params = new HttpParams()
      .set('page', page)
      .set('size', size)
      .set('sort', sort);

    if (nome) {
      params = params.set('nome', nome);
    }

    return this.http.get<Page<Paciente>>(`${this.baseUrl}/paciente/criterios`, { params });
  }

  buscarPaciente(id: number): Observable<Paciente> {
    return this.http.get<Paciente>(`${this.baseUrl}/paciente/buscar/${id}`);
  }

  criarPaciente(paciente: Paciente): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/paciente/criar`, paciente);
  }

  atualizarPaciente(paciente: Paciente): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/paciente/atualizar`, paciente);
  }

  deletarPaciente(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/paciente/deletar/${id}`);
  }

  // Agendamentos
  listarAgendamentos(): Observable<Agendamento[]> {
    return this.http.get<Agendamento[]>(`${this.baseUrl}/agendamento/listar-todos`);
  }

  listarAgendamentosPorStatus(status: string): Observable<Agendamento[]> {
    const params = new HttpParams().set('status', status);
    return this.http.get<Agendamento[]>(`${this.baseUrl}/agendamento/listar-por-status`, { params });
  }

  criarAgendamento(agendamento: Agendamento): Observable<Agendamento> {
    return this.http.post<Agendamento>(`${this.baseUrl}/agendamento/criar`, agendamento);
  }

  atualizarAgendamento(id: number, agendamento: Agendamento): Observable<Agendamento> {
    return this.http.patch<Agendamento>(`${this.baseUrl}/agendamento/atualizar/${id}`, agendamento);
  }

  // Configurações (Procedimentos, Insumos, Locais)
  listarProcedimentos(): Observable<Procedimento[]> {
    return this.http.get<Procedimento[]>(`${this.baseUrl}/configs/procedimentos/listar`);
  }

  criarProcedimento(procedimento: Procedimento): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/configs/procedimentos/criar`, procedimento);
  }

  listarInsumos(): Observable<Insumo[]> {
    return this.http.get<Insumo[]>(`${this.baseUrl}/configs/insumos/listar`);
  }

  criarInsumo(insumo: Insumo): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/configs/insumos/criar`, insumo);
  }

  listarLocais(): Observable<LocalAplicacao[]> {
    return this.http.get<LocalAplicacao[]>(`${this.baseUrl}/configs/locaisaplicacao/listar`);
  }

  criarLocal(local: LocalAplicacao): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/configs/locaisaplicacao/criar`, local);
  }

  // Evolução Clínica
  criarEvolucao(evolucao: EvolucaoEstetica): Observable<EvolucaoEstetica> {
    return this.http.post<EvolucaoEstetica>(`${this.baseUrl}/evolucao-clinica/criar`, evolucao);
  }

  // Usuários
  listarUsuarios(): Observable<UsuarioResponse[]> {
    return this.http.get<UsuarioResponse[]>(`${this.baseUrl}/usuarios/listar`);
  }

  buscarUsuarioPorLogin(login: string): Observable<UsuarioResponse> {
    return this.http.get<UsuarioResponse>(`${this.baseUrl}/usuarios/${login}`);
  }

  criarUsuario(usuario: UsuarioRequest): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/usuarios/criar`, usuario);
  }
}
