import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from './auth';

@Injectable({
  providedIn: 'root'
})
export class PatientsService {

  private apiUrl = 'http://localhost:3000/api/patients';

  constructor(private http: HttpClient, private authService: AuthService) {}

  // Creates authorization header with JWT token
  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({ 'Authorization': `Bearer ${token}` });
  }

  // Get all patients
  getPatients() {
    return this.http.get(this.apiUrl, { headers: this.getHeaders() });
  }

  // Get one patient by ID
  getPatient(id: number) {
    return this.http.get(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }

  // Create a new patient
  createPatient(patient: any) {
    return this.http.post(this.apiUrl, patient, { headers: this.getHeaders() });
  }

  // Update an existing patient
  updatePatient(id: number, patient: any) {
    return this.http.put(`${this.apiUrl}/${id}`, patient, { headers: this.getHeaders() });
  }

  // Delete a patient
  deletePatient(id: number) {
    return this.http.delete(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }
}