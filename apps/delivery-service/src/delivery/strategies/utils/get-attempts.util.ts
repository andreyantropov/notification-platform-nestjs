import { Contact } from '@app/shared';
import { Channel } from '../../types/channel.abstract';
import { Attempt } from '../types/attempt.interface';

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
