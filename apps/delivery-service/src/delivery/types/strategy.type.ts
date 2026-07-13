import { Notification } from '@app/shared';
import { Channel } from './channel.abstract';

export type Strategy = (
  notification: Notification,
  channels: readonly Channel[],
) => Promise<void>;
