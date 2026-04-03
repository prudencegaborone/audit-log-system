import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from './auth';

@Injectable({
  providedIn: 'root'
})
export class SystemsService {

  private apiUrl = 'http://localhost:3000/api/systems';

  constructor(private http: HttpClient, private authService: AuthService) {}

  getHeaders() {
    const token = this.authService.getToken();
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  // Get all active monitored systems
  getSystems() {
    return this.http.get(this.apiUrl, {
      headers: this.getHeaders()
    });
  }

  // Add a new monitored system
  addSystem(system: any) {
    return this.http.post(this.apiUrl, system, {
      headers: this.getHeaders()
    });
  }

  // Deactivate a system
  deactivateSystem(id: number) {
    return this.http.put(`${this.apiUrl}/${id}/deactivate`, {}, {
      headers: this.getHeaders()
    });
  }
}