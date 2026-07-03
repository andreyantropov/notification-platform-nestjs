import { Channel } from '../interfaces/channel.interface';
import { Notification } from '../interfaces/notification.interface';

export type Strategy = (
  notification: Notification,
  channels: readonly Channel[],
) => Promise<void>;
