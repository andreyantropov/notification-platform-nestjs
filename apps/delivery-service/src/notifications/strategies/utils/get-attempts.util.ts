import { Contact } from '@app/shared/interfaces/contact.interface';
import { Channel } from '../../interfaces/channel.interface';
import { Attempt } from '../interfaces/attempt.interface';

export const getAttempts = (
  contacts: readonly Contact[],
  channels: readonly Channel[],
): Attempt[] => {
  return contacts.flatMap((contact) =>
    channels
      .filter((channel) => channel.isSupports(contact))
      .map((channel) => ({ channel, contact })),
  );
};
