import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-aerobic-exercise',
  standalone: true,
  imports: [CommonModule, DatePipe, DecimalPipe, MatCardModule],
  template: `
    <mat-card class="exercise-card">
      <mat-card-header>
        <mat-card-title>{{ name }}</mat-card-title>
        <mat-card-subtitle>{{ date | date:'mediumDate' }}</mat-card-subtitle>
      </mat-card-header>
      <mat-card-content>
        <div class="stats">
          <div class="stat">
            <span class="label">Duration:</span>
            <span class="value">{{ formatDuration(duration) }}</span>
          </div>
          <div class="stat">
            <span class="label">Calories:</span>
            <span class="value">{{ calories | number:'1.2-2' }}</span>
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
export class AerobicExercise {
  @Input({ required: true }) date: Date | undefined;
  @Input({ required: true }) name: string = '';
  @Input({ required: true }) duration: number = 0;
  @Input({ required: true }) calories: number = 0;

  formatDuration(duration: number | undefined): string {
    if (duration === undefined || duration === null || duration === 0) {
      return '0s';
    }
    const minutes = Math.floor(duration / 60);
    const seconds = Math.floor(duration % 60);
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  }
}
