// Import Component and OnInit from Angular core
import { Component } from '@angular/core';

// Import Router so we can navigate to the dashboard after login
import { Router } from '@angular/router';

// Import FormsModule to enable [(ngModel)] two-way binding in the HTML
import { FormsModule } from '@angular/forms';

// Import CommonModule to enable *ngIf in the HTML
import { CommonModule } from '@angular/common';

// Import our AuthService to handle the login API call
import { AuthService } from '../auth';

@Component({
  selector: 'app-login',
  standalone: true,

  // FormsModule enables [(ngModel)], CommonModule enables *ngIf
  imports: [FormsModule, CommonModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {

  // These variables are bound to the input fields in login.html
  // When the user types in the fields these variables update automatically
  username = '';
  password = '';

  // Controls the error message shown when login fails
  errorMessage = '';

  // Controls the button text — shows "Signing in..." while waiting
  isLoading = false;

  constructor(private authService: AuthService, private router: Router) {}

  // This function runs when the user clicks the Sign In button
  login() {

    // Clear any previous error message
    this.errorMessage = '';

    // Basic validation — make sure both fields are filled in
    if (!this.username || !this.password) {
      this.errorMessage = 'Please enter both username and password';
      return;
    }

    // Show loading state on the button
    this.isLoading = true;

    // Call the login function in AuthService which sends the request to backend
    this.authService.login(this.username, this.password).subscribe({

      // If login was successful
      next: (response: any) => {
        // Save the token and user info to localStorage
        this.authService.saveToken(response.token);
        this.authService.saveUser(response.user);

        // Navigate to the dashboard page
        this.router.navigate(['/dashboard']);
      },

      // If login failed (wrong password, server error etc)
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error?.message || 'Login failed. Please try again.';
      }
    });
  }
}