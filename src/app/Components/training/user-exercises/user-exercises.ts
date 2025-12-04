import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { TrainingService } from '../training.service';
import { Store } from '@ngrx/store';
import * as fromRoot from '../../../app.reducer';
import { Exercise } from '../excercise.model';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-user-exercises',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatListModule,
    MatIconModule,
    MatSelectModule,
    CommonModule
  ],
  templateUrl: './user-exercises.html',
  styleUrl: './user-exercises.less',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserExercises implements OnInit {
  private readonly trainingService = inject(TrainingService);
  private readonly store = inject(Store<fromRoot.State>);
  private readonly userSignal = this.store.selectSignal(fromRoot.getUser);

  protected readonly availableExercises = this.trainingService.availableExercises;

  protected readonly myUserExercises = computed(() => {
    const user = this.userSignal();
    const exercises = this.availableExercises();
    if (!user) {
      return [];
    }
    return exercises.filter(ex => ex.userId === user.id);
  });

  exerciseForm: FormGroup;

  constructor(private fb: FormBuilder) {
    this.exerciseForm = this.fb.group({
      name: ['', Validators.required],
      type: ['aerobic', Validators.required]
    });
  }

  ngOnInit(): void {
    this.trainingService.fetchAvailableExercises();
  }

  onSubmit() {
    if (this.exerciseForm.valid) {
      const newExercise: Exercise = {
        id: '', // Firestore will generate ID
        Name: this.exerciseForm.value.name,
        type: this.exerciseForm.value.type,
        userId: this.userSignal()?.id
      };
      this.trainingService.addUserExercise(newExercise);
      this.exerciseForm.reset({ type: 'aerobic' });
    }
  }
}
