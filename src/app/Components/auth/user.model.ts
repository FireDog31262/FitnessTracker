export interface User {
  id: string;
  email: string;
  name: string;
  birthday: Date;
  currentWeight?: number;
  goalWeight?: number;
  weightUnit?: 'kg' | 'lb';
  height?: number;
  heightUnit?: 'cm' | 'ft_in';
}

