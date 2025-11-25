export interface User {
  id: string;
  email: string;
  name: string;
  birthday: Date;
  weight?: number;
  weightUnit?: 'kg' | 'lb';
  height?: number;
  heightUnit?: 'cm' | 'ft_in';
}

