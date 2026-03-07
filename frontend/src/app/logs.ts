import { Injectable } from '@angular/core';

// HttpClient for making API requests, HttpHeaders for attaching the JWT token
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';

import { AuthService } from './auth';

@Injectable({
  providedIn: 'root'
})
export class LogsService {

  // Base URL for all log-related API endpoints
  private apiUrl = 'http://localhost:3000/api/logs';

  constructor(private http: HttpClient, private authService: AuthService) {}

   private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({ 'Authorization': `Bearer ${token}` });
  }

  // Fetches all logs with optional filters
  // The filters object can contain username, action_type, status, dates
  getLogs(filters: any = {}) {
    let params = new HttpParams();

    // Only add a filter to the request if it has a value
    if (filters.username) params = params.set('username', filters.username);
    if (filters.action_type) params = params.set('action_type', filters.action_type);
    if (filters.status) params = params.set('status', filters.status);
    if (filters.start_date) params = params.set('start_date', filters.start_date);
    if (filters.end_date) params = params.set('end_date', filters.end_date);

    return this.http.get(this.apiUrl, { 
      headers: this.getHeaders(), 
      params 
    });
  }

  // Fetches summary statistics for the dashboard header cards
  // Total logs, failed logins today, successful logins today
  getStats() {
    return this.http.get(`${this.apiUrl}/stats`, { 
      headers: this.getHeaders() 
    });
  }

  // Fetches list of suspicious IP addresses with 5+ failed logins
  getSuspicious() {
    return this.http.get(`${this.apiUrl}/suspicious`, { 
      headers: this.getHeaders() 
    });
  }
}