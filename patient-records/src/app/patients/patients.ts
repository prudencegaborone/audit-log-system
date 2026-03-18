import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PatientsService } from '../patients';
import { AuthService } from '../auth';

@Component({
  selector: 'app-patients',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './patients.html',
  styleUrl: './patients.css'
})
export class Patients implements OnInit {

  // List of all patients loaded from the database
  patients: any[] = [];

  // Controls whether the add/edit form is visible
  showForm = false;

  // Stores the patient being edited (null means adding new)
  editingPatient: any = null;

  // Current logged in user
  currentUser: any;

  // Success and error messages
  successMessage = '';
  errorMessage = '';

  // Form data bound to form inputs
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

  // Runs when page loads — loads patients and logs a VIEW action
  ngOnInit() {
    this.currentUser = this.authService.getUser();
    this.loadPatients();
  }

  // Fetches all patients — backend logs VIEW automatically
  loadPatients() {
    this.patientsService.getPatients().subscribe({
      next: (res: any) => {
        this.patients = res.patients;
      },
      error: () => {
        this.errorMessage = 'Failed to load patients';
      }
    });
  }

  // Shows form for adding new patient
  showAddForm() {
    this.editingPatient = null;
    this.resetForm();
    this.showForm = true;
  }

  // Shows form pre-filled for editing
  editPatient(patient: any) {
    this.editingPatient = patient;
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

  // Saves new or updated patient — backend logs CREATE or UPDATE
  savePatient() {
    if (this.editingPatient) {
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

  // Deletes patient — backend logs DELETE automatically
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

  // Hides form and resets fields
  cancelForm() {
    this.showForm = false;
    this.editingPatient = null;
    this.resetForm();
  }

  // Clears all form fields
  resetForm() {
    this.formData = {
      first_name: '', last_name: '', date_of_birth: '',
      gender: '', phone: '', email: '', address: '', diagnosis: ''
    };
  }

  // Shows success message that disappears after 3 seconds
  showSuccess(message: string) {
    this.successMessage = message;
    this.errorMessage = '';
    setTimeout(() => this.successMessage = '', 3000);
  }

  // Logs out and redirects to login
  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}