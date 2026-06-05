import { Channel } from '../interfaces/channel.interface';
import { Notification } from '../interfaces/notification.interface';
import { Strategy } from '../types/strategy.type';
import { getAttempts } from './utils/get-attempts.util';

export const sequentialStrategy: Strategy = async (
  notification: Notification,
  channels: readonly Channel[],
): Promise<void> => {
  const { contacts, message } = notification;

  const attempts = getAttempts(contacts, channels);

  for (const { channel, contact } of attempts) {
    try {
      return await channel.send(contact, message);
    } catch {
      continue;
    }
  }

  throw new Error(
    `Все попытки отправки уведомления (${attempts.length} шт.) завершились неудачей`,
  );
};
