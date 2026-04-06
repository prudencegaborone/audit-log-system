import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { LogsService } from '../logs';
import { AuthService } from '../auth';
import { SystemsService } from '../systems';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard implements OnInit, OnDestroy {

  logs: any[] = [];
  stats: any = null;
  suspicious: any[] = [];
  systems: any[] = [];
  currentUser: any;
  chartData: any[] = [];

  // Pagination
  currentPage = 1;
  totalPages = 1;
  totalLogs = 0;
  limit = 50;

  // Filter variables
  filterUsername = '';
  filterAction = '';
  filterStatus = '';
  filterStartDate = '';
  filterEndDate = '';
  filterSystem = '';

  // Add new system form
  showAddSystem = false;
  newSystem = {
    system_key: '',
    system_name: '',
    description: '',
    icon: '🔌'
  };
  systemMessage = '';

  // Retention
  showRetention = false;
  retentionDays = 90;
  retentionMessage = '';
  Math = Math;
  archivedLogs: any[] = [];
  showArchive = false;

  // Backend status
  backendStatus: 'live' | 'offline' | 'connecting' = 'connecting';

  isAdmin(): boolean { return this.currentUser?.role === 'admin'; }
isAuditor(): boolean { return this.currentUser?.role === 'auditor'; }

  // Auto-refresh interval
  private refreshInterval: any;

  constructor(
    private logsService: LogsService,
    private authService: AuthService,
    private systemsService: SystemsService,
    private router: Router
  ) {}

  ngOnInit() {
    this.currentUser = this.authService.getUser();
    this.loadSystems();
    this.loadLogs();
    this.loadStats();
    this.loadSuspicious();
    this.checkBackendStatus();

    // Auto-refresh every 30 seconds
    this.refreshInterval = setInterval(() => {
      this.loadStats();
      this.loadSuspicious();
      this.loadLogs();
      this.loadSystems();
      this.checkBackendStatus();
    }, 30000);
  }

  ngOnDestroy() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  // Check if backend is reachable
  checkBackendStatus() {
    this.backendStatus = 'connecting';
    fetch('http://localhost:3000/')
      .then(res => {
        if (res.ok) {
          this.backendStatus = 'live';
        } else {
          this.backendStatus = 'offline';
        }
      })
      .catch(() => {
        this.backendStatus = 'offline';
      });
  }

  loadSystems() {
    this.systemsService.getSystems().subscribe({
      next: (res: any) => { this.systems = res.systems; },
      error: (err) => { console.error('Error loading systems:', err); }
    });
  }

  loadLogs() {
    this.logsService.getLogs({
      username: this.filterUsername,
      action_type: this.filterAction,
      status: this.filterStatus,
      start_date: this.filterStartDate,
      end_date: this.filterEndDate,
      system_source: this.filterSystem
    }, this.currentPage, this.limit).subscribe({
      next: (res: any) => {
        this.logs = res.logs;
        this.totalPages = res.pagination.totalPages;
        this.totalLogs = res.pagination.total;
        this.currentPage = res.pagination.currentPage;
        this.buildChartData();
      },
      error: (err) => { console.error('Error loading logs:', err); }
    });
  }

  loadStats() {
    this.logsService.getStats().subscribe({
      next: (res: any) => { this.stats = res; },
      error: (err) => { console.error('Error loading stats:', err); }
    });
  }

  loadSuspicious() {
    this.logsService.getSuspicious().subscribe({
      next: (res: any) => { this.suspicious = res.suspicious; },
      error: (err) => { console.error('Error loading suspicious:', err); }
    });
  }

  buildChartData() {
    const actions = ['LOGIN', 'LOGOUT', 'VIEW', 'CREATE', 'UPDATE', 'DELETE'];
    const colors: any = {
      LOGIN: '#3b82f6', LOGOUT: '#8b5cf6', VIEW: '#22c55e',
      CREATE: '#f97316', UPDATE: '#eab308', DELETE: '#ef4444'
    };
    const counts: any = {};
    actions.forEach(a => counts[a] = 0);
    this.logs.forEach(log => {
      if (counts[log.action_type] !== undefined) counts[log.action_type]++;
    });
    const max = Math.max(...Object.values(counts) as number[], 1);
    this.chartData = actions.map(action => ({
      action, count: counts[action], color: colors[action],
      height: Math.max(10, (counts[action] / max) * 150)
    }));
  }

  getSystemLogCount(systemKey: string): number {
    return this.logs.filter(log => log.system_source === systemKey).length;
  }

  filterBySystem(systemKey: string) {
    this.filterSystem = systemKey;
    this.currentPage = 1;
    this.loadLogs();
  }

  getSystemName(systemKey: string): string {
    const system = this.systems.find(s => s.system_key === systemKey);
    return system ? system.system_name : systemKey;
  }

  applyFilters() {
    this.currentPage = 1;
    this.loadLogs();
  }

  resetFilters() {
    this.filterUsername = '';
    this.filterAction = '';
    this.filterStatus = '';
    this.filterStartDate = '';
    this.filterEndDate = '';
    this.filterSystem = '';
    this.currentPage = 1;
    this.loadLogs();
  }

  goToPage(page: number) {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.loadLogs();
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.loadLogs();
    }
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadLogs();
    }
  }

  getPageNumbers(): number[] {
    const pages = [];
    const start = Math.max(1, this.currentPage - 2);
    const end = Math.min(this.totalPages, this.currentPage + 2);
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }

  exportCSV() {
    this.logsService.exportCSV({
      username: this.filterUsername,
      action_type: this.filterAction,
      status: this.filterStatus,
      start_date: this.filterStartDate,
      end_date: this.filterEndDate,
      system_source: this.filterSystem
    }).subscribe({
      next: (blob: any) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err) => { console.error('Export failed:', err); }
    });
  }

  applyRetention() {
    if (confirm(`Logs older than ${this.retentionDays} days will be moved to archive. Continue?`)) {
      this.logsService.applyRetention(this.retentionDays).subscribe({
        next: (res: any) => {
          this.retentionMessage = `✅ ${res.message}`;
          this.loadLogs();
          this.loadStats();
          setTimeout(() => {
            this.retentionMessage = '';
            this.showRetention = false;
          }, 3000);
        },
        error: (err) => {
          this.retentionMessage = '❌ Failed to apply archiving policy.';
          console.error('Retention error:', err);
        }
      });
    }
  }

  loadArchivedLogs() {
    if (!this.showArchive) return;
    this.logsService.getArchivedLogs({}).subscribe({
      next: (res: any) => {
        this.archivedLogs = res.logs;
      },
      error: (err) => {
        console.error('Error loading archive:', err);
      }
    });
  }

  addNewSystem() {
    if (!this.newSystem.system_key || !this.newSystem.system_name) {
      this.systemMessage = 'Please fill in System Key and System Name.';
      return;
    }
    this.systemsService.addSystem(this.newSystem).subscribe({
      next: () => {
        this.systemMessage = '✅ System added successfully!';
        this.loadSystems();
        this.loadStats();
        this.newSystem = { system_key: '', system_name: '', description: '', icon: '🔌' };
        setTimeout(() => {
          this.systemMessage = '';
          this.showAddSystem = false;
        }, 2000);
      },
      error: (err) => {
        this.systemMessage = '❌ Failed to add system. Key may already exist.';
        console.error('Error adding system:', err);
      }
    });
  }

  deactivateSystem(id: number, name: string) {
    if (confirm(`Are you sure you want to deactivate "${name}"?`)) {
      this.systemsService.deactivateSystem(id).subscribe({
        next: () => {
          this.loadSystems();
          this.loadStats();
        },
        error: (err) => { console.error('Error deactivating system:', err); }
      });
    }
  }

  logout() {
    this.authService.logout();
  }
}