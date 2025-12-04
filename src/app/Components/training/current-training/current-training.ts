import { ChangeDetectionStrategy, Component, DestroyRef, OnDestroy, effect, inject, signal, computed } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog } from '@angular/material/dialog';
import { StopTrainingDialog } from './stop-training-dialog/stop-training-dialog';
import { MatButtonModule } from "@angular/material/button";
import { TrainingService } from '../training.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe, DecimalPipe } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-current-training',
  imports: [
    MatProgressSpinnerModule,
    MatButtonModule,
    DatePipe,
    DecimalPipe,
    MatFormFieldModule,
    MatInputModule,
    FormsModule
  ],
  templateUrl: './current-training.html',
  styleUrl: './current-training.less',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CurrentTraining implements OnDestroy {
  protected readonly progress = signal(0);
  protected readonly elapsedSeconds = signal(0);
  protected readonly isCustom = signal(false);
  protected readonly isResistance = computed(() => this.trainingService.runningExercise()?.type === 'resistance');

  protected weight = 0;
  protected reps = 0;

  private timer: number | undefined;
  private readonly dialog = inject(MatDialog);
  private readonly trainingService = inject(TrainingService);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    effect(() => {
      const exercise = this.trainingService.runningExercise();
      this.stopTimer();
      this.progress.set(0);
      this.elapsedSeconds.set(0);

      if (!exercise) {
        return;
      }

      this.isCustom.set(exercise.Duration === undefined || exercise.Duration === null);

      if (!this.isResistance()) {
        this.startTimer(exercise.Duration);
      }
    });
  }

  onStop() {
    const exercise = this.trainingService.runningExercise();
    if (!exercise) {
      return;
    }

    this.stopTimer();

    if (this.isCustom()) {
      // For custom exercises, "Stop" means "Finish"
      this.trainingService.completeExercise({ duration: this.elapsedSeconds() });
      return;
    }

    const dialogRef = this.dialog.open(StopTrainingDialog, { data: { progress: this.progress() } });
    dialogRef
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((confirmed: boolean) => {
        if (confirmed) {
          this.trainingService.cancelExercise(this.progress());
        } else {
          this.startTimer(exercise.Duration);
        }
      });
  }

  onFinishResistance() {
    this.trainingService.completeExercise({ weight: this.weight, reps: this.reps });
  }

  ngOnDestroy(): void {
    this.stopTimer();
  }

  private startTimer(durationSeconds?: number) {
    this.stopTimer();

    // If duration is provided (Standard Exercise), we calculate progress
    // If not (Custom Exercise), we just count up

    const step = 1000;
    this.timer = window.setInterval(() => {
      this.elapsedSeconds.update(v => v + 1);

      if (durationSeconds) {
        const newProgress = (this.elapsedSeconds() / durationSeconds) * 100;
        this.progress.set(newProgress);
        if (newProgress >= 100) {
          this.trainingService.completeExercise();
          this.stopTimer();
        }
      }
    }, step);
  }

  private stopTimer() {
    if (this.timer !== undefined) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }
}
