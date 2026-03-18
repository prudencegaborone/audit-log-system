import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { PatientsService } from '../patients';
import { AuthService } from '../auth';

@Component({
  selector: 'app-patients',
  standalone: true,
  // CommonModule gives us *ngIf and *ngFor
  // FormsModule gives us [(ngModel)] for form inputs
  // RouterModule gives us routerLink for navigation
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './patients.html',
  styleUrl: './patients.css'
})
export class Patients implements OnInit {

  // List of all patients loaded from the database
  patients: any[] = [];

  // Controls whether the add/edit form is visible
  showForm = false;

  // Stores the patient being edited (null means we are adding a new one)
  editingPatient: any = null;

  // The current logged in user
  currentUser: any;

  // Success and error messages shown to the user
  successMessage = '';
  errorMessage = '';

  // Form data object — bound to the form inputs with [(ngModel)]
  formData = {
    first_name: '',
    last_name: '',
    date_of_birth: '',
    gender: '',
    phone: '',
    email: '',
    address: '',
    diagnosis: ''
  };

  constructor(
    private patientsService: PatientsService,
    private authService: AuthService,
    private router: Router
  ) {}

  // Runs automatically when the page loads
  ngOnInit() {
    this.currentUser = this.authService.getUser();
    this.loadPatients();
  }

  // Fetches all patients from the backend API
  // The backend automatically logs a VIEW action when this runs
  loadPatients() {
    this.patientsService.getPatients().subscribe({
      next: (res: any) => {
        this.patients = res.patients;
      },
      error: (err) => {
        this.errorMessage = 'Failed to load patients';
      }
    });
  }

  // Shows the form for adding a new patient
  showAddForm() {
    this.editingPatient = null;
    this.resetForm();
    this.showForm = true;
  }

  // Shows the form pre-filled with an existing patient's data for editing
  editPatient(patient: any) {
    this.editingPatient = patient;
    // Copy patient data into the form
    this.formData = {
      first_name: patient.first_name,
      last_name: patient.last_name,
      date_of_birth: patient.date_of_birth?.split('T')[0],
      gender: patient.gender,
      phone: patient.phone,
      email: patient.email,
      address: patient.address,
      diagnosis: patient.diagnosis
    };
    this.showForm = true;
  }

  // Saves a new patient or updates an existing one
  // The backend logs CREATE or UPDATE automatically
  savePatient() {
    if (this.editingPatient) {
      // Update existing patient
      this.patientsService.updatePatient(this.editingPatient.id, this.formData).subscribe({
        next: () => {
          this.showSuccess('Patient updated successfully');
          this.loadPatients();
          this.cancelForm();
        },
        error: () => {
          this.errorMessage = 'Failed to update patient';
        }
      });
    } else {
      // Create new patient
      this.patientsService.createPatient(this.formData).subscribe({
        next: () => {
          this.showSuccess('Patient created successfully');
          this.loadPatients();
          this.cancelForm();
        },
        error: () => {
          this.errorMessage = 'Failed to create patient';
        }
      });
    }
  }

  // Deletes a patient after confirmation
  // The backend logs DELETE automatically
  deletePatient(id: number) {
    if (confirm('Are you sure you want to delete this patient record?')) {
      this.patientsService.deletePatient(id).subscribe({
        next: () => {
          this.showSuccess('Patient deleted successfully');
          this.loadPatients();
        },
        error: () => {
          this.errorMessage = 'Failed to delete patient';
        }
      });
    }
  }

  // Hides the form and resets all fields
  cancelForm() {
    this.showForm = false;
    this.editingPatient = null;
    this.resetForm();
  }

  // Clears all form fields back to empty
  resetForm() {
    this.formData = {
      first_name: '', last_name: '', date_of_birth: '',
      gender: '', phone: '', email: '', address: '', diagnosis: ''
    };
  }

  // Shows a success message that disappears after 3 seconds
  showSuccess(message: string) {
    this.successMessage = message;
    this.errorMessage = '';
    setTimeout(() => this.successMessage = '', 3000);
  }

  // Logs the user out and redirects to login page
  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}