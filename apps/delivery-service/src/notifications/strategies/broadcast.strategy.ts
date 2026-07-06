import { Channel } from '../interfaces/channel.interface';
import { Notification } from '@app/shared/interfaces/notification.interface';
import { Strategy } from '../types/strategy.type';
import { getAttempts } from './utils/get-attempts.util';

export const broadcastStrategy: Strategy = async (
  notification: Notification,
  channels: readonly Channel[],
): Promise<void> => {
  const { contacts, message } = notification;
  const attempts = getAttempts(contacts, channels);

  try {
    await Promise.all(
      attempts.map(({ channel, contact }) => channel.send(contact, message)),
    );
  } catch {
    throw new Error(
      `Один или несколько каналов вернули ошибку во время массовой отправки`,
    );
  }
};
