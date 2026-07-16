import { Notification } from '@app/shared';

export type CreateNotification = Omit<
  Notification,
  'id' | 'clientId' | 'createdAt'
>;
