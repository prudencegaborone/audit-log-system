import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { LogsService } from '../logs';
import { AuthService } from '../auth';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard implements OnInit {

  logs: any[] = [];
  stats: any = null;
  currentUser: any;

  // Filter variables bound to the filter inputs
  filterUsername = '';
  filterAction = '';
  filterStatus = '';

  constructor(
    private logsService: LogsService,
    private authService: AuthService,
    private router: Router
  ) {}

  // Runs when the page loads
  ngOnInit() {
    this.currentUser = this.authService.getUser();
    this.loadLogs();
    this.loadStats();
  }

  // Loads all audit logs from the backend
  loadLogs() {
    this.logsService.getLogs({}).subscribe({
      next: (res: any) => {
        this.logs = res.logs;
      },
      error: (err) => {
        console.error('Error loading logs:', err);
      }
    });
  }

  // Loads statistics for the stat cards
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

  // Applies the filters and reloads logs
  applyFilters() {
    this.logsService.getLogs({
      username: this.filterUsername,
      action_type: this.filterAction,
      status: this.filterStatus
    }).subscribe({
      next: (res: any) => {
        this.logs = res.logs;
      }
    });
  }

  // Resets all filters and reloads all logs
  resetFilters() {
    this.filterUsername = '';
    this.filterAction = '';
    this.filterStatus = '';
    this.loadLogs();
  }

  // Logs the user out and redirects to login
  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}