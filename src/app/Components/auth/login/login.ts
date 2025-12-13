import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { AuthService } from '../auth.service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import * as fromRoot from '../../../app.reducer';
import { Store } from '@ngrx/store';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { BiometricService } from '../biometric.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  imports: [
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    ReactiveFormsModule,
    MatProgressSpinnerModule,
    CommonModule
  ],
  templateUrl: './login.html',
  styleUrls: ['./login.less'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Login implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly store = inject(Store<fromRoot.State>);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly biometricService = inject(BiometricService);
  private readonly snackBar = inject(MatSnackBar);
  protected readonly isLoading = this.store.selectSignal(fromRoot.getIsLoading);
  protected canLoginWithBiometrics = false;
  private returnUrl: string | undefined;

  protected readonly loginForm = this.fb.group({
    email: this.fb.control('', { validators: [Validators.required, Validators.email] }),
    password: this.fb.control('', { validators: [Validators.required, Validators.minLength(6)] })
  });

  async ngOnInit() {
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'];
    this.canLoginWithBiometrics = await this.biometricService.isBiometricAvailable();
  }

  async onLoginWithBiometrics() {
    try {
      await this.biometricService.loginWithBiometric();
      // If successful, the service handles the auth state update via Firebase
      // But we might want to redirect if needed, although AuthService usually handles that via effects or subscription
      // For now, let's assume AuthService or the effect handles redirection upon successful login.
      // However, BiometricService.loginWithBiometric calls signInWithCustomToken which should trigger auth state change.
    } catch (error) {
      console.error(error);
      this.snackBar.open('Biometric login failed.', 'Close', { duration: 3000 });
    }
  }

  protected get emailControl() {
    return this.loginForm.controls.email;
  }

  protected get passwordControl() {
    return this.loginForm.controls.password;
  }

  onSubmit() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    const { email, password } = this.loginForm.getRawValue();
    this.authService.login({ email, password }, this.returnUrl);
  }
}
