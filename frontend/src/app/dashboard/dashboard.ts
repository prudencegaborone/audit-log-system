// Import Component and OnInit from Angular core
// OnInit lets us run code automatically when the page loads
import { Component, OnInit } from '@angular/core';

// Import Router to navigate back to login on logout
import { Router } from '@angular/router';

// Import FormsModule for [(ngModel)] on the filter inputs
import { FormsModule } from '@angular/forms';

// Import CommonModule for *ngFor, *ngIf and the date pipe
import { CommonModule } from '@angular/common';

// Import our services
import { AuthService } from '../auth';
import { LogsService } from '../logs';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard implements OnInit {

  // Stores the list of log records fetched from the backend
  logs: any[] = [];

  // Stores the stats (total logs, failed today, success today)
  stats: any = {};

  // Stores the currently logged in user's info
  currentUser: any = {};

  // Stores the current filter values from the filter inputs
  filters = {
    username: '',
    action_type: '',
    status: '',
    start_date: '',
    end_date: ''
  };

  constructor(
    private logsService: LogsService,
    private authService: AuthService,
    private router: Router
  ) {}

  // ngOnInit runs automatically when the dashboard page loads
  // We use it to fetch logs and stats immediately
  ngOnInit() {
    // Get the logged in user's info from localStorage
    this.currentUser = this.authService.getUser();

    // Fetch logs and stats from the backend
    this.loadLogs();
    this.loadStats();
  }

  // Fetches all logs from the backend using current filters
  loadLogs() {
    this.logsService.getLogs(this.filters).subscribe({
      next: (response: any) => {
        this.logs = response.logs;
      },
      error: (err) => {
        console.error('Error fetching logs:', err);
      }
    });
  }

  // Fetches the summary statistics for the stat cards
  loadStats() {
    this.logsService.getStats().subscribe({
      next: (response: any) => {
        this.stats = response;
      },
      error: (err) => {
        console.error('Error fetching stats:', err);
      }
    });
  }

  // Runs when the admin clicks the Filter button
  applyFilters() {
    this.loadLogs();
  }

  // Clears all filters and reloads all logs
  resetFilters() {
    this.filters = {
      username: '',
      action_type: '',
      status: '',
      start_date: '',
      end_date: ''
    };
    this.loadLogs();
  }

  // Logs the user out and redirects to login page
  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}