import { Injectable, inject } from '@angular/core';
import { Firestore, doc, getDoc, setDoc } from '@angular/fire/firestore';
import {
  PastTrainingPreferences,
  defaultPreferences,
  sanitizeSortDescriptors,
  DEFAULT_PAGE_SIZE,
  DEFAULT_PAGE_INDEX
} from './past-training-sort.model';

@Injectable({ providedIn: 'root' })
export class PastTrainingPreferencesService {
  private readonly firestore = inject(Firestore);

  async loadPreferences(userId: string): Promise<PastTrainingPreferences> {
    try {
      const ref = doc(this.firestore, 'userPreferences', userId);
      const snapshot = await getDoc(ref);
      if (!snapshot.exists()) {
        return defaultPreferences();
      }
      const data = snapshot.data();
      return {
        sortOrder: sanitizeSortDescriptors(data?.['pastTrainingSort']),
        aerobicFilter: this.sanitizeFilter(data?.['aerobicFilter']),
        resistanceFilter: this.sanitizeFilter(data?.['resistanceFilter']),
        aerobicPageSize: this.sanitizePageSize(data?.['aerobicPageSize']),
        aerobicPageIndex: this.sanitizePageIndex(data?.['aerobicPageIndex']),
        resistancePageSize: this.sanitizePageSize(data?.['resistancePageSize']),
        resistancePageIndex: this.sanitizePageIndex(data?.['resistancePageIndex'])
      };
    } catch (error) {
      console.error('❌ Error loading past-training preferences:', error);
      return defaultPreferences();
    }
  }

  async savePreferences(userId: string, preferences: PastTrainingPreferences): Promise<void> {
    try {
      const ref = doc(this.firestore, 'userPreferences', userId);
      await setDoc(
        ref,
        {
          pastTrainingSort: preferences.sortOrder,
          aerobicFilter: preferences.aerobicFilter,
          resistanceFilter: preferences.resistanceFilter,
          aerobicPageSize: preferences.aerobicPageSize,
          aerobicPageIndex: preferences.aerobicPageIndex,
          resistancePageSize: preferences.resistancePageSize,
          resistancePageIndex: preferences.resistancePageIndex
        },
        { merge: true }
      );
    } catch (error) {
      console.error('❌ Error saving past-training preferences:', error);
      throw error;
    }
  }

  private sanitizeFilter(value: unknown): string {
    if (typeof value !== 'string') {
      return '';
    }
    return value.trim().slice(0, 200);
  }

  private sanitizePageSize(value: unknown): number {
    const pageSize = typeof value === 'number' ? value : DEFAULT_PAGE_SIZE;
    return Number.isFinite(pageSize) ? pageSize : DEFAULT_PAGE_SIZE;
  }

  private sanitizePageIndex(value: unknown): number {
    if (typeof value !== 'number') {
      return DEFAULT_PAGE_INDEX;
    }
    const normalized = Math.max(0, Math.floor(value));
    return Number.isFinite(normalized) ? normalized : DEFAULT_PAGE_INDEX;
  }
}
