import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private apiUrl = 'http://localhost:3000/api/auth';

  constructor(private http: HttpClient) {}

  // Send login request to the shared backend
  login(username: string, password: string) {
    return this.http.post(`${this.apiUrl}/login`, { username, password });
  }

  // Save JWT token to localStorage
  saveToken(token: string) {
    localStorage.setItem('pr_token', token);
  }

  // Save user info to localStorage
  saveUser(user: any) {
    localStorage.setItem('pr_user', JSON.stringify(user));
  }

  // Get token from localStorage
  getToken(): string | null {
    return localStorage.getItem('pr_token');
  }

  // Get user from localStorage
  getUser() {
    const user = localStorage.getItem('pr_user');
    return user ? JSON.parse(user) : null;
  }

  // Check if user is logged in
  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  // Logout - clear localStorage
  logout() {
    localStorage.removeItem('pr_token');
    localStorage.removeItem('pr_user');
  }
}