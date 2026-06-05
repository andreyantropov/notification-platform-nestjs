import { Channel } from '../interfaces/channel.interface';
import { Notification } from '../interfaces/notification.interface';
import { Strategy } from '../types/strategy.type';
import { getAttempts } from './utils/get-attempts.util';

export const raceStrategy: Strategy = async (
  notification: Notification,
  channels: readonly Channel[],
): Promise<void> => {
  const { contacts, message } = notification;
  const attempts = getAttempts(contacts, channels);

  try {
    await Promise.any(
      attempts.map(({ channel, contact }) => channel.send(contact, message)),
    );
  } catch {
    throw new Error(
      `Все попытки отправки уведомления (${attempts.length} шт.) завершились неудачей`,
    );
  }
};
