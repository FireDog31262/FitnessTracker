import { computed, inject, Injectable, signal } from "@angular/core";
import { Exercise } from "./excercise.model";
import { Store } from '@ngrx/store';
import * as fromRoot from '../../app.reducer';
import { AddUserExercise, LoadAvailableExercises, LoadFinishedExercises, PersistExerciseResult } from './training.actions';
import * as UI from '../../shared/ui.actions';
import { GamificationService } from '../gamification/gamification.service';

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
  private readonly gamificationService = inject(GamificationService);

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

  completeExercise(result?: { duration?: number, weight?: number, reps?: number }) {
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

    const exerciseToSave: Exercise = {
      ...currentExercise,
      date: new Date(),
      state: 'completed',
      userId: user.id
    };

    if (currentExercise.type === 'resistance') {
      exerciseToSave.weight = result?.weight ?? 0;
      exerciseToSave.reps = result?.reps ?? 0;
      delete exerciseToSave.Duration;
      delete exerciseToSave.calories;
    } else {
      // Default to aerobic
      exerciseToSave.type = 'aerobic';
      const duration = result?.duration ?? currentExercise.Duration ?? 0;
      let calories = currentExercise.calories;
      if (calories === undefined || calories === null) {
        calories = duration * (5 / 60);
      }
      exerciseToSave.Duration = duration;
      exerciseToSave.calories = calories;
      delete exerciseToSave.weight;
      delete exerciseToSave.reps;
    }

    this.store.dispatch(new PersistExerciseResult({
      exercise: exerciseToSave
    }));

    // Trigger Gamification Update
    void this.gamificationService.processFinishedExercise(exerciseToSave);

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
