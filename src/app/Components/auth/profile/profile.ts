import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../auth.service';
import { Store } from '@ngrx/store';
import * as fromRoot from '../../../app.reducer';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    CommonModule
  ],
  templateUrl: './profile.html',
  styleUrl: './profile.less',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Profile implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly store = inject(Store<fromRoot.State>);
  protected readonly isLoading = this.store.selectSignal(fromRoot.getIsLoading);

  profileForm: FormGroup;

  constructor(private fb: FormBuilder) {
    this.profileForm = this.fb.group({
      name: ['', Validators.required],
      birthday: [null, Validators.required],
      currentWeight: [null, [Validators.min(0)]],
      goalWeight: [null, [Validators.min(0)]],
      weightUnit: ['kg', Validators.required],
      height: [null, [Validators.min(0)]],
      heightUnit: ['cm', Validators.required],
      heightFeet: [null, [Validators.min(0)]],
      heightInches: [null, [Validators.min(0), Validators.max(11)]]
    });
  }

  ngOnInit(): void {
    const user = this.authService.getUser();
    if (user) {
      const heightUnit = user.heightUnit || 'cm';
      let height: number | null | undefined = user.height;
      let heightFeet = null;
      let heightInches = null;

      if (heightUnit === 'ft_in' && height != null) {
        heightFeet = Math.floor(height / 12);
        heightInches = Math.round(height % 12);
        height = null; // Clear cm field if using ft/in
      }

      this.profileForm.patchValue({
        name: user.name,
        birthday: user.birthday,
        currentWeight: user.currentWeight,
        goalWeight: user.goalWeight,
        weightUnit: user.weightUnit || 'kg',
        height: height,
        heightUnit: heightUnit,
        heightFeet: heightFeet,
        heightInches: heightInches
      });
    }
  }

  onSubmit() {
    if (this.profileForm.valid) {
      const user = this.authService.getUser();
      if (user) {
        const formValue = this.profileForm.value;
        let finalHeight = formValue.height;

        if (formValue.heightUnit === 'ft_in') {
           const feet = formValue.heightFeet || 0;
           const inches = formValue.heightInches || 0;
           finalHeight = (feet * 12) + inches;
        }

        const updateData = {
            ...formValue,
            height: finalHeight
        };
        // Remove temporary fields
        delete updateData.heightFeet;
        delete updateData.heightInches;

        this.authService.updateProfile(user.id, updateData);
      }
    }
  }
}
