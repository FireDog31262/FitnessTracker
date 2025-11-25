import { ChangeDetectionStrategy, Component, computed, effect, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { TrainingService } from '../training.service';
import { CommonModule, DatePipe } from '@angular/common';
import { MatCardModule } from "@angular/material/card";
import { Exercise } from '../excercise.model';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { PastTrainingPreferencesService } from './past-training-preferences.service';
import {
  DEFAULT_PAGE_INDEX,
  DEFAULT_PAGE_SIZE,
  defaultSortOrder,
  SortColumn,
  SortDescriptor,
  SortDirection
} from './past-training-sort.model';
import { Store } from '@ngrx/store';
import * as fromRoot from '../../../app.reducer';
import * as UI from '../../../shared/ui.actions';

@Component({
  selector: 'app-past-training',
  imports: [
    CommonModule,
    DatePipe,
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

  protected readonly filter = signal('');
  protected readonly pageIndex = signal(DEFAULT_PAGE_INDEX);
  protected readonly pageSize = signal(DEFAULT_PAGE_SIZE);
  protected readonly pageSizeOptions = [5, 10, 20];
  protected readonly sortOrder = signal<SortDescriptor[]>(defaultSortOrder());
  protected readonly hasCustomSort = computed(() => !this.isDefaultSort(this.sortOrder()));

  protected readonly filteredExercises = computed(() => {
    const term = this.filter().trim().toLowerCase();
    const data = this.trainingService.finishedExercises();
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

  protected readonly sortedExercises = computed(() => {
    const descriptors = this.sortOrder();
    const data = [...this.filteredExercises()];

    const getComparableValue = (exercise: Exercise, column: SortColumn): number | string => {
      switch (column) {
        case 'name':
          return (exercise.Name ?? '').toLowerCase();
        case 'duration':
          return exercise.Duration ?? 0;
        case 'calories':
          return exercise.calories ?? 0;
        case 'date':
        default:
          return exercise.date ? exercise.date.getTime() : 0;
      }
    };

    const compare = (a: Exercise, b: Exercise): number => {
      for (const descriptor of descriptors) {
        const valueA = getComparableValue(a, descriptor.column);
        const valueB = getComparableValue(b, descriptor.column);
        if (valueA === valueB) {
          continue;
        }
        const directionMultiplier = descriptor.direction === 'asc' ? 1 : -1;
        if (typeof valueA === 'number' && typeof valueB === 'number') {
          return (valueA - valueB) * directionMultiplier;
        }
        return (valueA as string).localeCompare(valueB as string) * directionMultiplier;
      }
      return 0;
    };

    return descriptors.length ? data.sort(compare) : data;
  });

  protected readonly pagedExercises = computed(() => {
    const start = this.pageIndex() * this.pageSize();
    return this.sortedExercises().slice(start, start + this.pageSize());
  });

  constructor() {
    effect(() => {
      const total = this.filteredExercises().length;
      const size = this.pageSize();
      const maxIndex = Math.max(Math.ceil(total / size) - 1, 0);
      if (this.pageIndex() > maxIndex) {
        this.pageIndex.set(maxIndex);
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

  ngOnInit() {
    void this.trainingService.fetchFinishedExercises();
  }

  ngOnDestroy() {
    this.clearScheduledSave();
  }

  updateFilter(value: string) {
    if (value === this.filter()) {
      return;
    }
    this.filter.set(value);
    this.pageIndex.set(0);
    this.markPreferencesDirty();
  }

  clearFilter() {
    this.updateFilter('');
  }

  onPageChange(event: PageEvent) {
    const indexChanged = event.pageIndex !== this.pageIndex();
    const sizeChanged = event.pageSize !== this.pageSize();
    if (!indexChanged && !sizeChanged) {
      return;
    }
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    this.markPreferencesDirty();
  }

  protected toggleSort(column: SortColumn, event?: MouseEvent) {
    const remove = !!event && (event.ctrlKey || event.metaKey);
    const multi = !!event?.shiftKey && !remove;
    let didChange = false;
    this.sortOrder.update((current) => {
      const existingIndex = current.findIndex((descriptor) => descriptor.column === column);
      if (remove) {
        if (existingIndex === -1) {
          return current;
        }
        const next = [...current];
        next.splice(existingIndex, 1);
        didChange = true;
        return next.length ? next : defaultSortOrder();
      }
      if (!multi) {
        if (existingIndex === -1) {
          didChange = true;
          return [{ column, direction: 'asc' }];
        }
        const nextDirection = current[existingIndex].direction === 'asc' ? 'desc' : 'asc';
        didChange = true;
        return [{ column, direction: nextDirection }];
      }

      const next = [...current];
      if (existingIndex === -1) {
        didChange = true;
        next.push({ column, direction: 'asc' });
        return next;
      }

      const descriptor = next[existingIndex];
      next[existingIndex] = {
        column,
        direction: descriptor.direction === 'asc' ? 'desc' : 'asc'
      };
      didChange = true;
      return next;
    });
    if (didChange) {
      this.pageIndex.set(0);
      this.markPreferencesDirty();
    }
  }

  protected ariaSort(column: SortColumn): 'none' | 'ascending' | 'descending' {
    const primary = this.sortOrder()[0];
    if (!primary || primary.column !== column) {
      return 'none';
    }
    return primary.direction === 'asc' ? 'ascending' : 'descending';
  }

  protected sortMeta(column: SortColumn): { direction: SortDirection; position: number } | null {
    const order = this.sortOrder();
    const index = order.findIndex((descriptor) => descriptor.column === column);
    if (index === -1) {
      return null;
    }
    return {
      direction: order[index].direction,
      position: index + 1
    };
  }

  protected clearSortOrder() {
    if (!this.hasCustomSort()) {
      return;
    }
    this.sortOrder.set(defaultSortOrder());
    this.pageIndex.set(0);
    this.markPreferencesDirty();
  }

  protected formatDuration(duration: number | undefined): string {
    if (!duration) {
      return '0s';
    }
    const minutes = Math.floor(duration / 60);
    const seconds = Math.floor(duration % 60);
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  }

  protected trackExercise(index: number, exercise: Exercise) {
    return exercise.id ?? `${exercise.Name}-${index}`;
  }

  private async hydratePreferences(userId: string): Promise<void> {
    try {
      const stored = await this.preferencesService.loadPreferences(userId);
      if (stored) {
        this.sortOrder.set(stored.sortOrder.length ? stored.sortOrder : defaultSortOrder());
        this.filter.set(stored.filter ?? '');
        this.pageSize.set(this.sanitizePageSize(stored.pageSize));
        this.pageIndex.set(this.sanitizePageIndex(stored.pageIndex));
      } else {
        this.resetToDefaults();
      }
    } finally {
      this.preferencesHydrated.set(true);
    }
  }

  private resetToDefaults() {
    this.sortOrder.set(defaultSortOrder());
    this.filter.set('');
    this.pageSize.set(DEFAULT_PAGE_SIZE);
    this.pageIndex.set(DEFAULT_PAGE_INDEX);
  }

  private sanitizePageSize(size: number | undefined): number {
    return this.pageSizeOptions.includes(size ?? 0) ? (size as number) : this.pageSizeOptions[0];
  }

  private sanitizePageIndex(index: number | undefined): number {
    if (typeof index !== 'number' || !Number.isFinite(index) || index < 0) {
      return DEFAULT_PAGE_INDEX;
    }
    return Math.floor(index);
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
        sortOrder: this.sortOrder(),
        filter: this.filter(),
        pageSize: this.pageSize(),
        pageIndex: this.pageIndex()
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

  private isDefaultSort(order: SortDescriptor[]): boolean {
    const baseline = defaultSortOrder();
    if (order.length !== baseline.length) {
      return false;
    }
    return order.every((descriptor, index) => {
      const reference = baseline[index];
      return descriptor.column === reference.column && descriptor.direction === reference.direction;
    });
  }
}
