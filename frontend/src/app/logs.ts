import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { AuthService } from './auth';

@Injectable({
  providedIn: 'root'
})
export class LogsService {

  private apiUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient, private authService: AuthService) {}

  getHeaders() {
    const token = this.authService.getToken();
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  getLogs(filters: any) {
    let params = new HttpParams();
    if (filters.username) params = params.set('username', filters.username);
    if (filters.action_type) params = params.set('action_type', filters.action_type);
    if (filters.status) params = params.set('status', filters.status);
    if (filters.start_date) params = params.set('start_date', filters.start_date);
    if (filters.end_date) params = params.set('end_date', filters.end_date);
    if (filters.system_source) params = params.set('system_source', filters.system_source);

    return this.http.get(`${this.apiUrl}/logs`, {
      headers: this.getHeaders(),
      params
    });
  }

  getStats() {
    return this.http.get(`${this.apiUrl}/logs/stats`, {
      headers: this.getHeaders()
    });
  }

  getSuspicious() {
    return this.http.get(`${this.apiUrl}/logs/suspicious`, {
      headers: this.getHeaders()
    });
  }

  exportCSV(filters: any) {
    let params = new HttpParams();
    if (filters.username) params = params.set('username', filters.username);
    if (filters.action_type) params = params.set('action_type', filters.action_type);
    if (filters.status) params = params.set('status', filters.status);
    if (filters.start_date) params = params.set('start_date', filters.start_date);
    if (filters.end_date) params = params.set('end_date', filters.end_date);
    if (filters.system_source) params = params.set('system_source', filters.system_source);

    return this.http.get(`${this.apiUrl}/logs/export`, {
      headers: this.getHeaders(),
      params,
      responseType: 'blob'
    });
  }
}