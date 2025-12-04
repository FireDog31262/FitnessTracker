export type SortColumn = 'date' | 'name' | 'duration' | 'calories';
export type SortDirection = 'asc' | 'desc';
export interface SortDescriptor {
  column: SortColumn;
  direction: SortDirection;
}

export interface PastTrainingPreferences {
  sortOrder: SortDescriptor[];
  aerobicFilter: string;
  resistanceFilter: string;
  aerobicPageSize: number;
  aerobicPageIndex: number;
  resistancePageSize: number;
  resistancePageIndex: number;
}

const VALID_SORT_COLUMNS: ReadonlyArray<SortColumn> = ['date', 'name', 'duration', 'calories'];
const VALID_SORT_DIRECTIONS: ReadonlyArray<SortDirection> = ['asc', 'desc'];

export const DEFAULT_SORT: ReadonlyArray<SortDescriptor> = [
  { column: 'date', direction: 'desc' }
];

export const DEFAULT_PAGE_SIZE = 5;
export const DEFAULT_PAGE_INDEX = 0;

export function cloneSortDescriptors(source: ReadonlyArray<SortDescriptor>): SortDescriptor[] {
  return source.map((descriptor) => ({ ...descriptor }));
}

export function sanitizeSortDescriptors(value: unknown): SortDescriptor[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const deduped = new Map<SortColumn, SortDescriptor>();

  for (const entry of value) {
    if (!entry || typeof entry !== 'object') {
      continue;
    }
    const column = (entry as SortDescriptor).column;
    const direction = (entry as SortDescriptor).direction;
    if (!VALID_SORT_COLUMNS.includes(column) || !VALID_SORT_DIRECTIONS.includes(direction)) {
      continue;
    }
    if (!deduped.has(column)) {
      deduped.set(column, { column, direction });
    }
  }

  return cloneSortDescriptors(Array.from(deduped.values()));
}

export function defaultSortOrder(): SortDescriptor[] {
  return cloneSortDescriptors(DEFAULT_SORT);
}

export function defaultPreferences(): PastTrainingPreferences {
  return {
    sortOrder: defaultSortOrder(),
    aerobicFilter: '',
    resistanceFilter: '',
    aerobicPageSize: DEFAULT_PAGE_SIZE,
    aerobicPageIndex: DEFAULT_PAGE_INDEX,
    resistancePageSize: DEFAULT_PAGE_SIZE,
    resistancePageIndex: DEFAULT_PAGE_INDEX
  };
}
