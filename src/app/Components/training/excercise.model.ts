export interface Exercise {
  id: string;
  Name: string;
  Duration?: number;
  calories?: number;
  date?: Date;
  state?: 'completed' | 'cancelled' | null;
  userId?: string;
}

