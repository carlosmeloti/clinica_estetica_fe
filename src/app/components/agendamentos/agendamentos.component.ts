import { Component, OnInit, inject, signal, computed, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
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
import { ApiService } from '../../services/api.service';
import { Agendamento, Paciente, Procedimento } from '../../models/api.models';
import { AgendamentoDialogComponent } from './agendamento-dialog/agendamento-dialog.component';
import { forkJoin } from 'rxjs';

import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions, EventClickArg, DateSelectArg, EventDropArg } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin, { EventResizeDoneArg } from '@fullcalendar/interaction';

@Component({
  selector: 'app-agendamentos',
  standalone: true,
  imports: [
    CommonModule,
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
    FullCalendarModule
  ],
  templateUrl: './agendamentos.component.html',
  styleUrl: './agendamentos.component.scss'
})
export class AgendamentosComponent implements OnInit {
  private apiService = inject(ApiService);
  private dialog = inject(MatDialog);

  agendamentos = signal<Agendamento[]>([]);
  pacientes = signal<Paciente[]>([]);
  procedimentos = signal<Procedimento[]>([]);
  selectedDate = signal<Date | null>(new Date());

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
    select: this.handleDateSelect.bind(this),
    eventClick: this.handleEventClick.bind(this),
    eventDrop: this.handleEventDrop.bind(this),
    eventResize: this.handleEventResize.bind(this),
  });

  ngOnInit(): void {
    this.carregarDados();
  }

  carregarDados(): void {
    forkJoin({
      agendamentos: this.apiService.listarAgendamentos(),
      pacientes: this.apiService.listarPacientes(0, 1000),
      procedimentos: this.apiService.listarProcedimentos()
    }).subscribe(res => {
      this.agendamentos.set(res.agendamentos);
      this.pacientes.set(res.pacientes.content);
      this.procedimentos.set(res.procedimentos);
      this.atualizarEventosCalendario();
    });
  }

  atualizarEventosCalendario(): void {
    const eventos = this.agendamentos().map(a => ({
      id: a.id?.toString(),
      title: `${this.getPacienteNome(a.pacienteId)} - ${this.getProcedimentoNome(a.procedimentoId)}`,
      start: a.dataHoraInicio,
      end: a.dataHoraFim,
      extendedProps: { ...a }
    }));

    this.calendarOptions.update(options => ({
      ...options,
      events: eventos,
      initialDate: this.selectedDate() || new Date()
    }));
  }

  handleDateSelect(selectInfo: DateSelectArg) {
    this.novoAgendamento(selectInfo.start);
    const calendarApi = selectInfo.view.calendar;
    calendarApi.unselect();
  }

  handleEventClick(clickInfo: EventClickArg) {
    const agendamento = clickInfo.event.extendedProps as Agendamento;
    this.editarAgendamento(agendamento);
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
      const novosDados = {
        ...agendamento,
        dataHoraInicio: event.start.toISOString(),
        dataHoraFim: event.end?.toISOString() || event.start.toISOString()
      };
      this.apiService.atualizarAgendamento(agendamento.id, novosDados).subscribe({
        next: () => this.carregarDados(),
        error: () => {
          alert('Erro ao atualizar horário do agendamento.');
          this.carregarDados(); // Reverte visualmente
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
      width: '500px',
      data: { data: data || this.selectedDate() }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.apiService.criarAgendamento(result).subscribe(() => {
          this.carregarDados();
        });
      }
    });
  }

  editarAgendamento(agendamento: Agendamento): void {
    const dialogRef = this.dialog.open(AgendamentoDialogComponent, {
      width: '500px',
      data: { agendamento, data: new Date(agendamento.dataHoraInicio) }
    });

    // Nota: AgendamentoDialogComponent pode precisar de ajustes para edição,
    // mas o foco agora é a integração do FullCalendar.
    dialogRef.afterClosed().subscribe(result => {
      if (result && agendamento.id) {
        this.apiService.atualizarAgendamento(agendamento.id, result).subscribe(() => {
          this.carregarDados();
        });
      }
    });
  }
}
