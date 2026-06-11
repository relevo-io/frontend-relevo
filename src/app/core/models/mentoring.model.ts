export interface MentoringItem {
  type: string; // e.g., 'tip', etc.
  titleKey: string;
  contentKey: string;
}

export interface MentoringModule {
  _id: string;
  route: 'BUY' | 'SELL';
  titleKey: string;
  descriptionKey: string;
  order: number;
  duration: number;
  isActive: boolean;
  items: MentoringItem[];
}
