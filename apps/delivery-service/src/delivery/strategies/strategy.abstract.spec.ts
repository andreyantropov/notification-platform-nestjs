import { Strategy } from './strategy.abstract';
import { Channel } from '../channels/channel.abstract';
import { Contact, Provider } from '@app/shared';

describe('Strategy', () => {
  class TestableStrategy extends Strategy {
    async execute(): Promise<void> {}

    public testGetAttempts(
      channels: readonly Channel[],
      contacts: readonly Contact[],
    ) {
      return this.getAttempts(channels, contacts);
    }
  }

  class MockChannel extends Channel {
    protected readonly type: Provider;
    constructor(type: Provider) {
      super();
      this.type = type;
    }
    async send(): Promise<void> {}
    protected async performSend(): Promise<void> {
      return Promise.resolve();
    }
  }

  let strategy: TestableStrategy;
  let emailChannel: MockChannel;
  let bitrixChannel: MockChannel;

  beforeEach(() => {
    strategy = new TestableStrategy();
    emailChannel = new MockChannel(Provider.EMAIL);
    bitrixChannel = new MockChannel(Provider.BITRIX);
  });

  describe('getAttempts', () => {
    it('should map contacts to their corresponding supporting channels', () => {
      const contactEmail: Contact = {
        type: Provider.EMAIL,
        value: 'test@email.com',
      };
      const contactBitrix: Contact = { type: Provider.BITRIX, value: '12345' };

      const result = strategy.testGetAttempts(
        [emailChannel, bitrixChannel],
        [contactEmail, contactBitrix],
      );

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        channel: emailChannel,
        contact: contactEmail,
      });
      expect(result[1]).toEqual({
        channel: bitrixChannel,
        contact: contactBitrix,
      });
    });

    it('should ignore contacts if no supporting channel is found', () => {
      const contactEmail: Contact = {
        type: Provider.EMAIL,
        value: 'test@email.com',
      };

      const result = strategy.testGetAttempts([bitrixChannel], [contactEmail]);

      expect(result).toHaveLength(0);
    });

    it('should duplicate pairs if multiple channels support the same contact', () => {
      const contactEmail: Contact = {
        type: Provider.EMAIL,
        value: 'test@email.com',
      };
      const secondEmailChannel = new MockChannel(Provider.EMAIL);

      const result = strategy.testGetAttempts(
        [emailChannel, secondEmailChannel],
        [contactEmail],
      );

      expect(result).toHaveLength(2);
      expect(result[0].channel).toBe(emailChannel);
      expect(result[1].channel).toBe(secondEmailChannel);
    });

    it('should return an empty array if channels or contacts are empty', () => {
      const contactEmail: Contact = {
        type: Provider.EMAIL,
        value: 'test@email.com',
      };

      expect(strategy.testGetAttempts([], [contactEmail])).toEqual([]);
      expect(strategy.testGetAttempts([emailChannel], [])).toEqual([]);
    });

    it('should group attempts by contacts first, then by channels', () => {
      const contact1: Contact = { type: Provider.EMAIL, value: 'c1@test.com' };
      const contact2: Contact = { type: Provider.EMAIL, value: 'c2@test.com' };
      const ch1 = new MockChannel(Provider.EMAIL);
      const ch2 = new MockChannel(Provider.EMAIL);

      const result = strategy.testGetAttempts([ch1, ch2], [contact1, contact2]);

      expect(result).toHaveLength(4);
      expect(result[0]).toEqual({ contact: contact1, channel: ch1 });
      expect(result[1]).toEqual({ contact: contact1, channel: ch2 });
      expect(result[2]).toEqual({ contact: contact2, channel: ch1 });
      expect(result[3]).toEqual({ contact: contact2, channel: ch2 });
    });
  });
});
