import { PaginatedResponse } from './pagination.model';

export interface NotificationHistory {
  _id: string;
  userId: string;
  title: string;
  body: string;
  type: 'chat' | 'solicitud' | 'cv_analysis';
  metadata?: Record<string, string>;
  read: boolean;
  createdAt: string;
}

export interface PaginatedNotificationsResponse extends PaginatedResponse<NotificationHistory> {
  unreadCount: number;
}
