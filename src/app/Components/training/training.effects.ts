import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Firestore, addDoc, collection, getDocs, query, where } from '@angular/fire/firestore';
import { EMPTY, from, of, forkJoin } from 'rxjs';
import { catchError, map, startWith, switchMap, tap, withLatestFrom } from 'rxjs/operators';
import { LOAD_AVAILABLE_EXERCISES, LOAD_FINISHED_EXERCISES, PERSIST_EXERCISE_RESULT, PersistExerciseResult, LoadFinishedExercises, ADD_USER_EXERCISE, AddUserExercise, LoadAvailableExercises } from './training.actions';
import * as UI from '../../shared/ui.actions';
import { TrainingService } from './training.service';
import { Exercise } from './excercise.model';
import { Store } from '@ngrx/store';
import * as fromRoot from '../../app.reducer';

@Injectable()
export class TrainingEffects {
  private readonly actions$ = inject(Actions);
  private readonly firestore = inject(Firestore);
  private readonly trainingService = inject(TrainingService);
  private readonly store = inject(Store<fromRoot.State>);

  loadAvailableExercises$ = createEffect(() =>
    this.actions$.pipe(
      ofType(LOAD_AVAILABLE_EXERCISES),
      withLatestFrom(this.store.select(fromRoot.getUser)),
      switchMap(([, user]) => {
        // Only load user-defined exercises, ignoring global defaults
        let customExercises$ = of([] as Exercise[]);
        if (user) {
          const customCollection = collection(this.firestore, 'userExercises');
          const q = query(customCollection, where('userId', '==', user.id));
          customExercises$ = from(getDocs(q)).pipe(
            map((snapshot) => snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }) as Exercise))
          );
        }

        return customExercises$.pipe(
          tap((exercises) => this.trainingService.setAvailableExercises(exercises)),
          map(() => new UI.StopLoading()),
          startWith(new UI.StartLoading()),
          catchError((error) => {
            console.error('❌ Error fetching available exercises:', error);
            this.trainingService.setAvailableExercises([]);
            return of(
              new UI.StopLoading(),
              new UI.ShowSnackbar({
                message: 'Fetching exercises failed, please try again later.',
                action: 'Close',
                duration: 5000
              })
            );
          })
        );
      })
    )
  );

  loadFinishedExercises$ = createEffect(() =>
    this.actions$.pipe(
      ofType(LOAD_FINISHED_EXERCISES),
      withLatestFrom(this.store.select(fromRoot.getUser)),
      switchMap(([, user]) => {
        if (!user) {
          this.trainingService.setFinishedExercises([]);
          return EMPTY;
        }
        const finishedCollection = collection(this.firestore, 'finishedExercises');
        const userExercisesQuery = query(finishedCollection, where('userId', '==', user.id));
        return from(getDocs(userExercisesQuery)).pipe(
          map((snapshot) =>
            snapshot.docs.map((doc) => {
              const payload = doc.data() as Record<string, unknown>;
              const type = (payload?.['type'] ?? 'aerobic') as 'aerobic' | 'resistance';
              const exercise: Exercise = {
                id: doc.id ?? (payload?.['id'] as string) ?? '',
                Name: (payload?.['name'] ?? payload?.['Name'] ?? '') as string,
                type: type,
                date: payload?.['date']
                  ? typeof payload['date'] === 'string'
                    ? new Date(payload['date'] as string)
                    : (payload['date'] as { toDate?: () => Date }).toDate?.() ?? new Date(payload['date'] as Date)
                  : undefined,
                state: (payload?.['state'] as 'completed' | 'cancelled' | null) ?? null,
                userId: payload?.['userId'] as string | undefined
              };

              if (type === 'resistance') {
                exercise.weight = (payload?.['weight'] ?? 0) as number;
                exercise.reps = (payload?.['reps'] ?? 0) as number;
              } else {
                exercise.Duration = (payload?.['duration'] ?? payload?.['Duration'] ?? 0) as number;
                exercise.calories = (payload?.['calories'] ?? 0) as number;
              }

              return exercise;
            })
          ),
          tap((exercises) => this.trainingService.setFinishedExercises(exercises)),
          map(() => new UI.StopLoading()),
          startWith(new UI.StartLoading()),
          catchError((error) => {
            console.error('❌ Error fetching finished exercises:', error);
            return of(
              new UI.StopLoading(),
              new UI.ShowSnackbar({
                message: 'Fetching past exercises failed. Please try again later.',
                action: 'Close',
                duration: 5000
              })
            );
          })
        );
      })
    )
  );

  persistExerciseResult$ = createEffect(() =>
    this.actions$.pipe(
      ofType(PERSIST_EXERCISE_RESULT),
      switchMap((action: PersistExerciseResult) =>
        from(addDoc(collection(this.firestore, 'finishedExercises'), action.payload.exercise)).pipe(
          switchMap(() => [
            new LoadFinishedExercises(),
            new UI.ShowSnackbar({
              message: 'Workout progress saved.',
              action: 'Close',
              duration: 3000
            })
          ]),
          catchError((error) => {
            console.error('❌ Error saving exercise:', error);
            return of(
              new UI.ShowSnackbar({
                message: 'Saving workout failed. Please try again.',
                action: 'Close',
                duration: 5000
              })
            );
          })
        )
      )
    )
  );

  addUserExercise$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ADD_USER_EXERCISE),
      switchMap((action: AddUserExercise) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id, ...exerciseData } = action.payload.exercise;
        return from(addDoc(collection(this.firestore, 'userExercises'), exerciseData)).pipe(
          switchMap(() => [
            new LoadAvailableExercises(),
            new UI.ShowSnackbar({
              message: 'User exercise added successfully.',
              action: 'Close',
              duration: 3000
            })
          ]),
          catchError((error) => {
            console.error('❌ Error adding user exercise:', error);
            return of(
              new UI.ShowSnackbar({
                message: 'Adding user exercise failed. Please try again.',
                action: 'Close',
                duration: 5000
              })
            );
          })
        );
      })
    )
  );
}

