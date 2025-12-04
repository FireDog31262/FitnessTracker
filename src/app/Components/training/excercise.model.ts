export interface Exercise {
  id: string;
  Name: string;
  type?: 'aerobic' | 'resistance';
  Duration?: number;
  calories?: number;
  weight?: number;
  reps?: number;
  date?: Date;
  state?: 'completed' | 'cancelled' | null;
  userId?: string;
}

