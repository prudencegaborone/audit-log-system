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

    // Auto-refresh every 30 seconds
    this.refreshInterval = setInterval(() => {
      this.loadStats();
      this.loadSuspicious();
      this.loadLogs();
      this.loadSystems();
    }, 30000);
  }

  ngOnDestroy() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  // Load all monitored systems dynamically from database
  loadSystems() {
    this.systemsService.getSystems().subscribe({
      next: (res: any) => {
        this.systems = res.systems;
      },
      error: (err) => {
        console.error('Error loading systems:', err);
      }
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
    }).subscribe({
      next: (res: any) => {
        this.logs = res.logs;
        this.buildChartData();
      },
      error: (err) => {
        console.error('Error loading logs:', err);
      }
    });
  }

  loadStats() {
    this.logsService.getStats().subscribe({
      next: (res: any) => {
        this.stats = res;
      },
      error: (err) => {
        console.error('Error loading stats:', err);
      }
    });
  }

  loadSuspicious() {
    this.logsService.getSuspicious().subscribe({
      next: (res: any) => {
        this.suspicious = res.suspicious;
      },
      error: (err) => {
        console.error('Error loading suspicious activity:', err);
      }
    });
  }

  buildChartData() {
    const actions = ['LOGIN', 'LOGOUT', 'VIEW', 'CREATE', 'UPDATE', 'DELETE'];
    const colors: any = {
      LOGIN:  '#3b82f6',
      LOGOUT: '#8b5cf6',
      VIEW:   '#22c55e',
      CREATE: '#f97316',
      UPDATE: '#eab308',
      DELETE: '#ef4444'
    };

    const counts: any = {};
    actions.forEach(a => counts[a] = 0);
    this.logs.forEach(log => {
      if (counts[log.action_type] !== undefined) {
        counts[log.action_type]++;
      }
    });

    const max = Math.max(...Object.values(counts) as number[], 1);

    this.chartData = actions.map(action => ({
      action,
      count: counts[action],
      color: colors[action],
      height: Math.max(10, (counts[action] / max) * 150)
    }));
  }

  // Get log count for a specific system dynamically
  getSystemLogCount(systemKey: string): number {
    return this.logs.filter(log => log.system_source === systemKey).length;
  }

  // Filter logs by a specific system
  filterBySystem(systemKey: string) {
    this.filterSystem = systemKey;
    this.loadLogs();
  }

  // Get system name from key
  getSystemName(systemKey: string): string {
    const system = this.systems.find(s => s.system_key === systemKey);
    return system ? system.system_name : systemKey;
  }

  applyFilters() {
    this.loadLogs();
  }

  resetFilters() {
    this.filterUsername = '';
    this.filterAction = '';
    this.filterStatus = '';
    this.filterStartDate = '';
    this.filterEndDate = '';
    this.filterSystem = '';
    this.loadLogs();
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
      error: (err) => {
        console.error('Export failed:', err);
      }
    });
  }

  // Add new monitored system
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

  // Deactivate a monitored system
  deactivateSystem(id: number, name: string) {
    if (confirm(`Are you sure you want to deactivate "${name}"?`)) {
      this.systemsService.deactivateSystem(id).subscribe({
        next: () => {
          this.loadSystems();
          this.loadStats();
        },
        error: (err) => {
          console.error('Error deactivating system:', err);
        }
      });
    }
  }

  logout() {
    this.authService.logout();
  }
}