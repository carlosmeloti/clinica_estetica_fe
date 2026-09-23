import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { ApiService } from '../../services/api.service';
import { Agendamento, Paciente, Procedimento, Profissional, ErroResponse } from '../../models/api.models';
import { AgendamentoDialogComponent } from './agendamento-dialog/agendamento-dialog.component';
import { AgendamentoDetalhesDialogComponent } from './agendamento-detalhes-dialog/agendamento-detalhes-dialog.component';
import { NotificationService } from '../../services/notification.service';
import { forkJoin } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions, EventClickArg, DateSelectArg, EventDropArg, DatesSetArg } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin, { EventResizeDoneArg } from '@fullcalendar/interaction';

@Component({
  selector: 'app-agendamentos',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatChipsModule,
    MatDialogModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatListModule,
    MatDividerModule,
    MatFormFieldModule,
    MatSelectModule,
    FullCalendarModule
  ],
  templateUrl: './agendamentos.component.html',
  styleUrl: './agendamentos.component.scss'
})
export class AgendamentosComponent implements OnInit {
  private apiService = inject(ApiService);
  private dialog = inject(MatDialog);
  private notificationService = inject(NotificationService);

  private readonly coresProfissionais = [
    '#5C4037',
    '#2E7D6F',
    '#3D5A80',
    '#8B5E3C',
    '#6B4E71',
    '#4A6741',
    '#B85C38',
    '#2F4858',
    '#7A5C45',
    '#1B6B93'
  ];

  agendamentos = signal<Agendamento[]>([]);
  pacientes = signal<Paciente[]>([]);
  procedimentos = signal<Procedimento[]>([]);
  profissionais = signal<Profissional[]>([]);
  /** null = Todos (sem profissionalId na query) */
  profissionalFiltroId = signal<number | null>(null);
  selectedDate = signal<Date | null>(new Date());
  loading = signal<boolean>(false);

  private rangeVisivel = signal<{ dataInicio: string; dataFim: string } | null>(null);

  legendaProfissionais = computed(() => {
    const ids = new Set<number>();
    for (const a of this.agendamentos()) {
      const id = a.profissionalId ?? a.profissional?.id;
      if (id != null) ids.add(id);
    }
    return this.profissionais()
      .filter(p => ids.has(p.id))
      .map(p => ({
        id: p.id,
        nome: p.nome,
        cor: this.getProfissionalColor(p.id)
      }));
  });

  calendarOptions = signal<CalendarOptions>({
    plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
    initialView: 'timeGridDay',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'timeGridDay,timeGridWeek,dayGridMonth'
    },
    locale: 'pt-br',
    slotMinTime: '08:00:00',
    slotMaxTime: '20:00:00',
    editable: true,
    selectable: true,
    selectMirror: true,
    dayMaxEvents: true,
    datesSet: this.handleDatesSet.bind(this),
    select: this.handleDateSelect.bind(this),
    eventClick: this.handleEventClick.bind(this),
    eventDrop: this.handleEventDrop.bind(this),
    eventResize: this.handleEventResize.bind(this),
  });

  ngOnInit(): void {
    this.carregarDadosAuxiliares();
  }

  carregarDadosAuxiliares(): void {
    forkJoin({
      pacientes: this.apiService.listarPacientes(0, 1000),
      procedimentos: this.apiService.listarProcedimentos(),
      profissionais: this.apiService.listarProfissionais()
    }).subscribe({
      next: (res) => {
        const listaPacientes = (res.pacientes as any)?.content || (Array.isArray(res.pacientes) ? res.pacientes : []);
        this.pacientes.set(listaPacientes);

        const listaProcedimentos = Array.isArray(res.procedimentos) ? res.procedimentos : (res.procedimentos as any)?.content || [];
        this.procedimentos.set(listaProcedimentos);

        this.profissionais.set(Array.isArray(res.profissionais) ? res.profissionais : []);
      },
      error: (err) => {
        console.error('Erro ao carregar dados auxiliares da agenda', err);
      }
    });
  }

  /** Recarrega agendamentos do range atual (após criar/editar/filtrar). */
  carregarDados(): void {
    const range = this.rangeVisivel();
    if (range) {
      this.carregarAgendamentos(range.dataInicio, range.dataFim);
    }
  }

  onProfissionalChange(profissionalId: number | null): void {
    this.profissionalFiltroId.set(profissionalId);
    this.carregarDados();
  }

  handleDatesSet(dateInfo: DatesSetArg): void {
    const dataInicio = this.formatLocalDate(dateInfo.start);
    // FullCalendar usa end exclusivo
    const fimExclusivo = new Date(dateInfo.end);
    fimExclusivo.setDate(fimExclusivo.getDate() - 1);
    const dataFim = this.formatLocalDate(fimExclusivo);

    const atual = this.rangeVisivel();
    if (atual?.dataInicio === dataInicio && atual?.dataFim === dataFim) {
      return;
    }
    this.rangeVisivel.set({ dataInicio, dataFim });
    this.carregarAgendamentos(dataInicio, dataFim);
  }

  private carregarAgendamentos(dataInicio: string, dataFim: string): void {
    this.loading.set(true);
    this.apiService
      .listarAgenda(dataInicio, dataFim, this.profissionalFiltroId())
      .subscribe({
        next: (lista) => {
          this.agendamentos.set(lista);
          this.atualizarEventosCalendario();
          this.loading.set(false);
        },
        error: (err: HttpErrorResponse) => {
          this.loading.set(false);
          this.agendamentos.set([]);
          this.atualizarEventosCalendario();
          // Interceptor já exibe ErroResponse.mensagem; reforça se 400/404 sem toast duplicado indevido
          const mensagem = this.extrairMensagemErro(err);
          if (err.status === 400 || err.status === 404) {
            // interceptor já notificou; só log
            console.error('Erro ao carregar agenda', mensagem, err);
          } else {
            console.error('Erro ao carregar agenda', err);
          }
        }
      });
  }

  private extrairMensagemErro(err: HttpErrorResponse): string {
    const body = err.error as ErroResponse | undefined;
    return body?.mensagem || err.message || 'Erro ao carregar a agenda.';
  }

  private formatLocalDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  getProcedimentosNomes(ids: number[]): string {
    if (!ids || ids.length === 0) return 'Nenhum procedimento';
    return ids.map(id => this.procedimentos().find(pr => pr.id === id)?.nome || `Proc ${id}`).join(', ');
  }

  getProfissionalColor(profissionalId: number): string {
    const idx = Math.abs(profissionalId) % this.coresProfissionais.length;
    return this.coresProfissionais[idx];
  }

  getProfissionalNome(a: Agendamento): string {
    return a.profissional?.nome
      || this.profissionais().find(p => p.id === (a.profissionalId ?? a.profissional?.id))?.nome
      || '';
  }

  atualizarEventosCalendario(): void {
    const mostrarTodos = this.profissionalFiltroId() == null;
    const eventos = this.agendamentos().map(a => {
      const pacienteNome = a.paciente?.nome
        || this.getPacienteNome(a.pacienteId!)
        || `Paciente ${a.pacienteId}`;
      const procs = a.procedimentos?.map(p => p.nome).filter(Boolean).join(', ')
        || this.getProcedimentosNomes(a.procedimentosIds || []);
      const profissionalId = a.profissionalId ?? a.profissional?.id;
      const profissionalNome = this.getProfissionalNome(a);
      const cor = profissionalId != null
        ? this.getProfissionalColor(profissionalId)
        : this.getStatusColor(a.status);
      const titulo = mostrarTodos && profissionalNome
        ? `${pacienteNome} · ${profissionalNome} — ${procs}`
        : `${pacienteNome} - ${procs}`;
      return {
        id: a.id?.toString(),
        title: titulo,
        start: a.dataHoraInicio,
        end: a.dataHoraFim,
        extendedProps: { ...a },
        backgroundColor: cor,
        borderColor: cor
      };
    });

    this.calendarOptions.update(options => ({
      ...options,
      events: eventos
    }));
  }

  getStatusColor(status?: string): string {
    switch (status) {
      case 'AGENDADO': return '#3f51b5';
      case 'CONFIRMADO': return '#4caf50';
      case 'EM_ATENDIMENTO': return '#ff9800';
      case 'CONCLUIDO': return '#9e9e9e';
      case 'CANCELADO': return '#f44336';
      case 'NAO_COMPARECEU': return '#795548';
      default: return '#3f51b5';
    }
  }

  handleDateSelect(selectInfo: DateSelectArg) {
    this.novoAgendamento(selectInfo.start);
    const calendarApi = selectInfo.view.calendar;
    calendarApi.unselect();
  }

  handleEventClick(clickInfo: EventClickArg) {
    const agendamento = clickInfo.event.extendedProps as Agendamento;
    this.abrirDetalhesAgendamento(agendamento);
  }

  abrirDetalhesAgendamento(agendamento: Agendamento): void {
    const dialogRef = this.dialog.open(AgendamentoDetalhesDialogComponent, {
      width: '500px',
      data: { agendamento }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.carregarDados();
      }
    });
  }

  handleEventDrop(dropInfo: EventDropArg) {
    this.atualizarHorarioAgendamento(dropInfo.event);
  }

  handleEventResize(resizeInfo: EventResizeDoneArg) {
    this.atualizarHorarioAgendamento(resizeInfo.event);
  }

  atualizarHorarioAgendamento(event: any) {
    const agendamento = event.extendedProps as Agendamento;
    if (agendamento.id) {
      this.loading.set(true);
      const procedimentos = agendamento.procedimentos?.length
        ? agendamento.procedimentos
        : (agendamento.procedimentosIds || []).map(id => ({ id, nome: '' }));
      const payload = {
        pacienteId: agendamento.pacienteId ?? agendamento.paciente?.id!,
        profissionalId: agendamento.profissionalId ?? agendamento.profissional?.id!,
        procedimentos,
        dataHoraInicio: event.start.toISOString(),
        dataHoraFim: event.end?.toISOString() || event.start.toISOString(),
        status: agendamento.status,
        motivoConsulta: agendamento.motivoConsulta,
        valorPrevisto: agendamento.valorPrevisto
      };
      this.apiService.atualizarAgendamento(agendamento.id, payload).subscribe({
        next: () => {
          this.carregarDados();
          this.notificationService.showSuccess('Horário atualizado com sucesso!');
        },
        error: () => {
          this.loading.set(false);
          this.carregarDados();
        }
      });
    }
  }

  getPacienteNome(id: number): string {
    return this.pacientes().find(p => p.id === id)?.nome || `Paciente ${id}`;
  }

  getProcedimentoNome(id: number): string {
    return this.procedimentos().find(p => p.id === id)?.nome || `Procedimento ${id}`;
  }

  novoAgendamento(data?: Date): void {
    const dialogRef = this.dialog.open(AgendamentoDialogComponent, {
      width: '760px',
      maxWidth: '95vw',
      panelClass: 'modern-dialog-container',
      data: {
        data: data || this.selectedDate(),
        profissionalId: this.profissionalFiltroId()
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.apiService.criarAgendamento(result).subscribe({
          next: (criado) => {
            this.notificationService.showSuccess('Agendamento criado com sucesso!');
            this.carregarDados();
            if (criado?.id != null) {
              setTimeout(() => {
                const atual = this.agendamentos();
                if (!atual.some(a => a.id === criado.id)) {
                  this.agendamentos.set([...atual, criado]);
                  this.atualizarEventosCalendario();
                }
              }, 800);
            }
          },
          error: (err) => {
            console.error('Erro ao criar agendamento', err);
          }
        });
      }
    });
  }

  editarAgendamento(agendamento: Agendamento): void {
    const dialogRef = this.dialog.open(AgendamentoDialogComponent, {
      width: '760px',
      maxWidth: '95vw',
      panelClass: 'modern-dialog-container',
      data: { agendamento, data: new Date(agendamento.dataHoraInicio) }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && agendamento.id) {
        this.apiService.atualizarAgendamento(agendamento.id, result).subscribe({
          next: () => {
            this.carregarDados();
            this.notificationService.showSuccess('Agendamento atualizado com sucesso!');
          },
          error: (err) => {
            console.error('Erro ao atualizar agendamento', err);
          }
        });
      }
    });
  }
}
