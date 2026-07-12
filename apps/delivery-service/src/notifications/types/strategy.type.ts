import { Notification } from '@app/shared';
import { Channel } from '../abstracts/channel.abstract';

export type Strategy = (
  notification: Notification,
  channels: readonly Channel[],
) => Promise<void>;
