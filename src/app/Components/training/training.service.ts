import { computed, inject, Injectable, signal } from "@angular/core";
import { Exercise } from "./excercise.model";
import { Store } from '@ngrx/store';
import * as fromRoot from '../../app.reducer';
import { AddUserExercise, LoadAvailableExercises, LoadFinishedExercises, PersistExerciseResult } from './training.actions';
import * as UI from '../../shared/ui.actions';

@Injectable({ providedIn: 'root' })
export class TrainingService {
  private readonly availableExercisesSignal = signal<Exercise[]>([]);
  private readonly runningExerciseSignal = signal<Exercise | null>(null);
  private readonly finishedExercisesSignal = signal<Exercise[]>([]);

  readonly availableExercises = this.availableExercisesSignal.asReadonly();
  readonly runningExercise = this.runningExerciseSignal.asReadonly();
  readonly finishedExercises = this.finishedExercisesSignal.asReadonly();
  readonly hasActiveTraining = computed(() => this.runningExerciseSignal() !== null);

  private readonly store = inject(Store<fromRoot.State>);
  private readonly userSignal = this.store.selectSignal(fromRoot.getUser);

  fetchAvailableExercises(): void {
    this.store.dispatch(new LoadAvailableExercises());
  }

  addUserExercise(exercise: Exercise) {
    this.store.dispatch(new LoadAvailableExercises()); // Refresh list after adding? No, effect should handle it or optimistic update.
    // Actually, let's just dispatch the add action.
    // The effect will handle the DB call and then we might want to reload or just add it to the local state.
    // For simplicity, let's dispatch the action and let the effect reload or add it.
    // But wait, I haven't defined the effect yet.
    // Let's just dispatch the action.
    const user = this.userSignal();
    if (user) {
        this.store.dispatch(new AddUserExercise({ exercise: { ...exercise, userId: user.id } }));
    }
  }

  startExercise(exerciseId: string) {
    const selectedExercise = this.availableExercisesSignal().find(ex => ex.id === exerciseId) || null;
    this.runningExerciseSignal.set(selectedExercise ? { ...selectedExercise } : null);
  }

  completeExercise(actualDuration?: number) {
    const currentExercise = this.runningExerciseSignal();
    const user = this.userSignal();
    if (!currentExercise || !user) {
      this.store.dispatch(new UI.ShowSnackbar({
        message: 'No active exercise to complete.',
        action: 'Close',
        duration: 4000
      }));
      return;
    }

    let duration = currentExercise.Duration;
    let calories = currentExercise.calories;

    if (actualDuration !== undefined) {
      duration = actualDuration;
      // If it's a custom exercise (no predefined calories), calculate based on a default rate or similar.
      // If it's a standard exercise, we might want to adjust calories based on actual duration vs expected?
      // But usually standard exercises complete when the timer finishes, so actual == expected.
      // For custom exercises, we need a way to calculate calories.
      // Let's assume a default burn rate of 5 kcal/min (approx 0.083 kcal/sec) if not defined.
      if (currentExercise.calories === undefined || currentExercise.calories === null) {
         calories = duration * (5 / 60); // 5 kcal per minute
      } else {
         // If we have defined calories (e.g. standard exercise finished early?), use the defined value?
         // Or scale it? Standard exercises usually finish at 100%.
         calories = currentExercise.calories;
      }
    }

    this.store.dispatch(new PersistExerciseResult({
      exercise: {
        ...currentExercise,
        Duration: duration,
        calories: calories,
        date: new Date(),
        state: 'completed',
        userId: user.id
      }
    }));
    this.runningExerciseSignal.set(null);
  }

  cancelExercise(progress: number) {
    const currentExercise = this.runningExerciseSignal();
    const user = this.userSignal();
    if (!currentExercise || !user) {
      this.store.dispatch(new UI.ShowSnackbar({
        message: 'No active exercise to cancel.',
        action: 'Close',
        duration: 4000
      }));
      return;
    }
    this.store.dispatch(new PersistExerciseResult({
      exercise: {
        ...currentExercise,
        Duration: (currentExercise.Duration ?? 0) * (progress / 100),
        calories: (currentExercise.calories ?? 0) * (progress / 100),
        date: new Date(),
        state: 'cancelled',
        userId: user.id
      }
    }));
    this.runningExerciseSignal.set(null);
  }

  fetchFinishedExercises(): void {
    this.store.dispatch(new LoadFinishedExercises());
  }

  setAvailableExercises(exercises: Exercise[]): void {
    this.availableExercisesSignal.set(exercises);
  }

  setFinishedExercises(exercises: Exercise[]): void {
    this.finishedExercisesSignal.set(exercises);
  }
}
