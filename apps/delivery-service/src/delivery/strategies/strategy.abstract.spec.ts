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

  class MockEmailChannel extends Channel {
    protected readonly type = Provider.EMAIL;
    async send(): Promise<void> {}
    protected async performSend(): Promise<void> {
      return Promise.resolve();
    }
  }

  class MockBitrixChannel extends Channel {
    protected readonly type = Provider.BITRIX;
    async send(): Promise<void> {}
    protected async performSend(): Promise<void> {
      return Promise.resolve();
    }
  }

  let strategy: TestableStrategy;
  let emailChannel: MockEmailChannel;
  let bitrixChannel: MockBitrixChannel;

  beforeEach(() => {
    strategy = new TestableStrategy();
    emailChannel = new MockEmailChannel();
    bitrixChannel = new MockBitrixChannel();
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
      const secondEmailChannel = new MockEmailChannel();

      const result = strategy.testGetAttempts(
        [emailChannel, secondEmailChannel],
        [contactEmail],
      );

      expect(result).toHaveLength(2);
      expect(result[0].channel).toBe(emailChannel);
      expect(result[1].channel).toBe(secondEmailChannel);
    });
  });
});
