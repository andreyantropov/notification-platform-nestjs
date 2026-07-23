import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigType } from '@nestjs/config';
import { MailerModule } from '@nestjs-modules/mailer';
import { BitrixChannel } from './channels/bitrix.channel';
import { EmailChannel } from './channels/email.channel';
import { MockBitrixChannel } from './channels/mock-bitrix.channel';
import { MockEmailChannel } from './channels/mock-email.channel';
import { StrategyFactory } from './strategies/strategy.factory';
import { BroadcastStrategy } from './strategies/broadcast.strategy';
import { RaceStrategy } from './strategies/race.strategy';
import { SequentialStrategy } from './strategies/sequential.strategy';
import { DeliveryController } from './delivery.controller';
import { DeliveryService } from './delivery.service';
import { ChannelsIndicator } from './indicators/channels.indicator';
import { BITRIX_CHANNEL, CHANNELS, EMAIL_CHANNEL } from './delivery.constants';
import { TerminusModule } from '@nestjs/terminus';
import { Channel } from './channels/channel.abstract';
import { axiosConfig, smtpConfig } from '../config';

const isDev = process.env.NODE_ENV === 'development';

@Module({
  imports: [
    HttpModule.registerAsync({
      inject: [axiosConfig.KEY],
      useFactory: (config: ConfigType<typeof axiosConfig>) => config,
    }),
    MailerModule.forRootAsync({
      inject: [smtpConfig.KEY],
      useFactory: (config: ConfigType<typeof smtpConfig>) => config,
    }),
    TerminusModule,
  ],
  controllers: [DeliveryController],
  providers: [
    DeliveryService,
    StrategyFactory,
    BroadcastStrategy,
    RaceStrategy,
    SequentialStrategy,
    {
      provide: BITRIX_CHANNEL,
      useClass: isDev ? MockBitrixChannel : BitrixChannel,
    },
    {
      provide: EMAIL_CHANNEL,
      useClass: isDev ? MockEmailChannel : EmailChannel,
    },
    {
      provide: CHANNELS,
      inject: [BITRIX_CHANNEL, EMAIL_CHANNEL],
      useFactory: (bitrix: Channel, email: Channel) => [bitrix, email],
    },
    ChannelsIndicator,
  ],
  exports: [ChannelsIndicator],
})
export class DeliveryModule {}
