import { ChangeDetectionStrategy, Component, computed, effect, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { TrainingService } from '../training.service';
import { CommonModule } from '@angular/common';
import { MatCardModule } from "@angular/material/card";
import { Exercise } from '../excercise.model';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { PastTrainingPreferencesService } from './past-training-preferences.service';
import {
  defaultSortOrder,
  SortColumn,
  SortDescriptor
} from './past-training-sort.model';
import { Store } from '@ngrx/store';
import * as fromRoot from '../../../app.reducer';
import * as UI from '../../../shared/ui.actions';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { DatePipe, DecimalPipe } from '@angular/common';

const DEFAULT_PAGE_SIZE = 10;
const DEFAULT_PAGE_INDEX = 0;

@Component({
  selector: 'app-past-training',
  imports: [
    CommonModule,
    DatePipe,
    DecimalPipe,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule, MatIconModule,
    MatButtonModule,
    MatPaginatorModule
  ],
  templateUrl: './past-training.html',
  styleUrl: './past-training.less',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PastTraining implements OnInit, OnDestroy {
  private readonly trainingService = inject(TrainingService);
  private readonly preferencesService = inject(PastTrainingPreferencesService);
  private readonly store = inject(Store<fromRoot.State>);
  private readonly userSignal = this.store.selectSignal(fromRoot.getUser);
  private readonly preferencesHydrated = signal(false);
  private readonly saveDebounceMs = 600;
  private saveTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private readonly preferencesToastMessage = 'Past workouts preferences saved.';

  protected readonly aerobicFilter = signal('');
  protected readonly resistanceFilter = signal('');
  protected readonly aerobicPageIndex = signal(DEFAULT_PAGE_INDEX);
  protected readonly aerobicPageSize = signal(DEFAULT_PAGE_SIZE);
  protected readonly resistancePageIndex = signal(DEFAULT_PAGE_INDEX);
  protected readonly resistancePageSize = signal(DEFAULT_PAGE_SIZE);
  protected readonly pageSizeOptions = [5, 10, 20];

  protected readonly allAerobicExercises = computed(() => {
    return this.trainingService.finishedExercises().filter(ex => ex.type === 'aerobic' || !ex.type);
  });

  protected readonly allResistanceExercises = computed(() => {
    return this.trainingService.finishedExercises().filter(ex => ex.type === 'resistance');
  });

  protected readonly filteredAerobicExercises = computed(() => {
    const term = this.aerobicFilter().trim().toLowerCase();
    const data = this.allAerobicExercises();
    if (!term) {
      return data;
    }
    return data.filter((exercise) => {
      const haystack = [
        exercise.Name,
        exercise.date?.toISOString(),
        exercise.Duration?.toString(),
        exercise.calories?.toString()
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(term);
    });
  });

  protected readonly filteredResistanceExercises = computed(() => {
    const term = this.resistanceFilter().trim().toLowerCase();
    const data = this.allResistanceExercises();
    if (!term) {
      return data;
    }
    return data.filter((exercise) => {
      const haystack = [
        exercise.Name,
        exercise.date?.toISOString(),
        exercise.weight?.toString(),
        exercise.reps?.toString()
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(term);
    });
  });

  protected readonly pagedAerobicExercises = computed(() => {
    const start = this.aerobicPageIndex() * this.aerobicPageSize();
    return this.filteredAerobicExercises().slice(start, start + this.aerobicPageSize());
  });

  protected readonly pagedResistanceExercises = computed(() => {
    const start = this.resistancePageIndex() * this.resistancePageSize();
    return this.filteredResistanceExercises().slice(start, start + this.resistancePageSize());
  });

  protected formatDuration(duration: number | undefined): string {
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

  constructor() {
    effect(() => {
      const total = this.filteredAerobicExercises().length;
      const size = this.aerobicPageSize();
      const maxIndex = Math.max(Math.ceil(total / size) - 1, 0);
      if (this.aerobicPageIndex() > maxIndex) {
        this.aerobicPageIndex.set(maxIndex);
      }
    });

    effect(() => {
      const total = this.filteredResistanceExercises().length;
      const size = this.resistancePageSize();
      const maxIndex = Math.max(Math.ceil(total / size) - 1, 0);
      if (this.resistancePageIndex() > maxIndex) {
        this.resistancePageIndex.set(maxIndex);
      }
    });

    effect(() => {
      const user = this.userSignal();
      this.preferencesHydrated.set(false);
      this.clearScheduledSave();
      if (!user) {
        this.resetToDefaults();
        this.preferencesHydrated.set(true);
        return;
      }
      void this.hydratePreferences(user.id);
    });
  }

  async shareExercise(exercise: Exercise) {
    const text = this.getShareText(exercise);
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My Workout',
          text: text,
          url: window.location.href
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      this.store.dispatch(new UI.ShowSnackbar({
        message: 'Sharing not supported on this browser. Copied to clipboard!',
        action: 'Close',
        duration: 3000
      }));
      navigator.clipboard.writeText(text);
    }
  }

  private getShareText(exercise: Exercise): string {
    const datePipe = new DatePipe('en-US');
    const date = datePipe.transform(exercise.date, 'mediumDate');
    if (exercise.type === 'resistance') {
      return `I just completed a resistance workout: ${exercise.Name} on ${date}! ${exercise.weight}kg for ${exercise.reps} reps. #FitnessTracker`;
    } else {
      const duration = this.formatDuration(exercise.Duration);
      return `I just completed an aerobic workout: ${exercise.Name} on ${date}! Duration: ${duration}, Calories: ${exercise.calories?.toFixed(2)}. #FitnessTracker`;
    }
  }

  ngOnInit() {
    void this.trainingService.fetchFinishedExercises();
  }

  ngOnDestroy() {
    this.clearScheduledSave();
  }

  updateAerobicFilter(value: string) {
    if (value === this.aerobicFilter()) {
      return;
    }
    this.aerobicFilter.set(value);
    this.aerobicPageIndex.set(0);
    this.markPreferencesDirty();
  }

  clearAerobicFilter() {
    this.updateAerobicFilter('');
  }

  updateResistanceFilter(value: string) {
    if (value === this.resistanceFilter()) {
      return;
    }
    this.resistanceFilter.set(value);
    this.resistancePageIndex.set(0);
    this.markPreferencesDirty();
  }

  clearResistanceFilter() {
    this.updateResistanceFilter('');
  }

  onAerobicPageChange(event: PageEvent) {
    const indexChanged = event.pageIndex !== this.aerobicPageIndex();
    const sizeChanged = event.pageSize !== this.aerobicPageSize();
    if (!indexChanged && !sizeChanged) {
      return;
    }
    this.aerobicPageIndex.set(event.pageIndex);
    this.aerobicPageSize.set(event.pageSize);
    this.markPreferencesDirty();
  }

  onResistancePageChange(event: PageEvent) {
    const indexChanged = event.pageIndex !== this.resistancePageIndex();
    const sizeChanged = event.pageSize !== this.resistancePageSize();
    if (!indexChanged && !sizeChanged) {
      return;
    }
    this.resistancePageIndex.set(event.pageIndex);
    this.resistancePageSize.set(event.pageSize);
    this.markPreferencesDirty();
  }

  private async hydratePreferences(userId: string): Promise<void> {
    try {
      const stored = await this.preferencesService.loadPreferences(userId);
      if (stored) {
        this.aerobicFilter.set(stored.aerobicFilter);
        this.resistanceFilter.set(stored.resistanceFilter);
        this.aerobicPageSize.set(stored.aerobicPageSize);
        this.aerobicPageIndex.set(stored.aerobicPageIndex);
        this.resistancePageSize.set(stored.resistancePageSize);
        this.resistancePageIndex.set(stored.resistancePageIndex);
      } else {
        this.resetToDefaults();
      }
    } finally {
      this.preferencesHydrated.set(true);
    }
  }

  private resetToDefaults() {
    this.aerobicFilter.set('');
    this.resistanceFilter.set('');
    this.aerobicPageIndex.set(DEFAULT_PAGE_INDEX);
    this.aerobicPageSize.set(DEFAULT_PAGE_SIZE);
    this.resistancePageIndex.set(DEFAULT_PAGE_INDEX);
    this.resistancePageSize.set(DEFAULT_PAGE_SIZE);
  }

  private markPreferencesDirty() {
    if (!this.preferencesHydrated() || !this.userSignal()) {
      return;
    }
    this.schedulePreferencesSave();
  }

  private schedulePreferencesSave() {
    this.clearScheduledSave();
    this.saveTimeoutId = setTimeout(() => {
      void this.persistPreferences();
    }, this.saveDebounceMs);
  }

  private clearScheduledSave() {
    if (this.saveTimeoutId !== null) {
      clearTimeout(this.saveTimeoutId);
      this.saveTimeoutId = null;
    }
  }

  private async persistPreferences() {
    this.clearScheduledSave();
    if (!this.preferencesHydrated()) {
      return;
    }
    const user = this.userSignal();
    if (!user) {
      return;
    }
    try {
      await this.preferencesService.savePreferences(user.id, {
        sortOrder: [], // Sort order is not yet implemented per table
        aerobicFilter: this.aerobicFilter(),
        resistanceFilter: this.resistanceFilter(),
        aerobicPageSize: this.aerobicPageSize(),
        aerobicPageIndex: this.aerobicPageIndex(),
        resistancePageSize: this.resistancePageSize(),
        resistancePageIndex: this.resistancePageIndex()
      });
      this.store.dispatch(
        new UI.ShowSnackbar({
          message: this.preferencesToastMessage,
          action: 'Close',
          duration: 2500
        })
      );
    } catch {
      this.store.dispatch(
        new UI.ShowSnackbar({
          message: 'Unable to sync past workouts preferences.',
          action: 'Dismiss',
          duration: 4000
        })
      );
    }
  }
}
