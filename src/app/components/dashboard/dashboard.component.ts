import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, MatGridListModule, MatCardModule, MatIconModule, MatButtonModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  private apiService = inject(ApiService);

  stats = [
    { label: 'Pacientes', value: '0', icon: 'people', color: '#C5A89E', link: '/pacientes' },
    { label: 'Agendamentos Hoje', value: '0', icon: 'event', color: '#C5A89E', link: '/agendamentos' },
    { label: 'Procedimentos', value: '0', icon: 'medical_services', color: '#C5A89E', link: '/configuracoes' },
    { label: 'Insumos em Alerta', value: '0', icon: 'warning', color: '#C5A89E', link: '/configuracoes' }
  ];

  acoesRapidas = [
    { label: 'Novo Paciente', link: '/pacientes' },
    { label: 'Novo Agendamento', link: '/agendamentos' },
    { label: 'Novo Procedimento', link: '/configuracoes' },
    { label: 'Registrar Evolução', link: '/agendamentos' }
  ];

  ngOnInit(): void {
    this.carregarResumo();
  }

  carregarResumo(): void {
    this.apiService.listarPacientes(0, 1).subscribe(p => this.stats[0].value = p.totalElements.toString());
    this.apiService.listarTodosAgendamentos().subscribe(a => this.stats[1].value = a.length.toString());
    this.apiService.listarProcedimentos().subscribe(pr => this.stats[2].value = pr.length.toString());
    this.apiService.listarInsumos().subscribe(i => {
      const alerta = i.filter(ins => (ins.quantidadeEstoque || 0) < 10).length;
      this.stats[3].value = alerta.toString();
    });
  }
}
