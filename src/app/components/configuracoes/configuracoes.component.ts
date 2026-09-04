import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { ApiService } from '../../services/api.service';
import { Procedimento, Insumo, LocalAplicacao } from '../../models/api.models';

@Component({
  selector: 'app-configuracoes',
  standalone: true,
  imports: [
    CommonModule,
    MatTabsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule
  ],
  templateUrl: './configuracoes.component.html',
  styles: ``
})
export class ConfiguracoesComponent implements OnInit {
  private apiService = inject(ApiService);

  procedimentos: Procedimento[] = [];
  insumos: Insumo[] = [];
  locais: LocalAplicacao[] = [];

  ngOnInit(): void {
    this.carregarDados();
  }

  carregarDados(): void {
    this.apiService.listarProcedimentos().subscribe(p => this.procedimentos = p);
    this.apiService.listarInsumos().subscribe(i => this.insumos = i);
    this.apiService.listarLocais().subscribe(l => this.locais = l);
  }

  novoProcedimento(): void { console.log('Novo proc'); }
  novoInsumo(): void { console.log('Novo insumo'); }
  novoLocal(): void { console.log('Novo local'); }
}
