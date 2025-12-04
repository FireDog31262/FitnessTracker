import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-resistance-exercise',
  standalone: true,
  imports: [CommonModule, DatePipe, MatCardModule],
  template: `
    <mat-card class="exercise-card">
      <mat-card-header>
        <mat-card-title>{{ name }}</mat-card-title>
        <mat-card-subtitle>{{ date | date:'mediumDate' }}</mat-card-subtitle>
      </mat-card-header>
      <mat-card-content>
        <div class="stats">
          <div class="stat">
            <span class="label">Weight:</span>
            <span class="value">{{ weight }}</span>
          </div>
          <div class="stat">
            <span class="label">Reps:</span>
            <span class="value">{{ reps }}</span>
          </div>
        </div>
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .exercise-card {
      margin-bottom: 16px;
    }
    .stats {
      display: flex;
      gap: 24px;
      margin-top: 16px;
    }
    .stat {
      display: flex;
      flex-direction: column;
    }
    .label {
      font-size: 12px;
      color: rgba(0, 0, 0, 0.54);
    }
    .value {
      font-size: 16px;
      font-weight: 500;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ResistanceExercise {
  @Input({ required: true }) date: Date | undefined;
  @Input({ required: true }) name: string = '';
  @Input({ required: true }) weight: number = 0;
  @Input({ required: true }) reps: number = 0;
}
