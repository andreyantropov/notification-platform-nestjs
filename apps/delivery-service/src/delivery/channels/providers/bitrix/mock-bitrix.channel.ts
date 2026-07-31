import { Injectable } from '@nestjs/common';
import { Provider } from '@app/shared';
import { Contact } from '@app/shared';
import { Channel } from '../../core/channel.abstract';
import { ChannelContext } from '../../core/channel.context';

@Injectable()
export class MockBitrixChannel extends Channel {
  protected readonly type = Provider.BITRIX;

  constructor(ctx: ChannelContext) {
    super(ctx);
  }

  protected async performSend(
    contact: Contact,
    message: string,
  ): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 50));
    console.log(`[MOCK BITRIX] To: ${contact.value} | Message: ${message}`);
  }
}
