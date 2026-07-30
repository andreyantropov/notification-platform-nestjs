import { Module } from '@nestjs/common';
import { CHANNELS } from './channels.constants';
import { ChannelContext } from './channel.context';
import { Channel } from './channel.abstract';
import { BITRIX_CHANNEL } from './providers/bitrix/bitrix-channel.constants';
import { BitrixChannelModule } from './providers/bitrix/bitrix-channel.module';
import { EMAIL_CHANNEL } from './providers/email/email-channel.constants';
import { EmailChannelModule } from './providers/email/email-channel.module';

@Module({
  imports: [BitrixChannelModule, EmailChannelModule],
  providers: [
    ChannelContext,
    {
      provide: CHANNELS,
      inject: [BITRIX_CHANNEL, EMAIL_CHANNEL],
      useFactory: (bitrix: Channel, email: Channel) => [bitrix, email],
    },
  ],
  exports: [CHANNELS],
})
export class ChannelsModule {}
