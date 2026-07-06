import { Notification } from '@app/shared/interfaces/notification.interface';
import { Channel } from '../interfaces/channel.interface';

export type Strategy = (
  notification: Notification,
  channels: readonly Channel[],
) => Promise<void>;
