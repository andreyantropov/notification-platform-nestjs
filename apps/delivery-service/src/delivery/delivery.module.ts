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
import { appConfig, axiosConfig, smtpConfig } from '../config';
import { Environment } from '@app/shared';

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
    BitrixChannel,
    MockBitrixChannel,
    EmailChannel,
    MockEmailChannel,
    {
      provide: BITRIX_CHANNEL,
      inject: [appConfig.KEY, MockBitrixChannel, BitrixChannel],
      useFactory: (
        config: ConfigType<typeof appConfig>,
        mockBitrixChannel: MockBitrixChannel,
        bitrixChannel: BitrixChannel,
      ) => {
        return config.nodeEnv === Environment.DEVELOPMENT
          ? mockBitrixChannel
          : bitrixChannel;
      },
    },
    {
      provide: EMAIL_CHANNEL,
      inject: [appConfig.KEY, MockEmailChannel, EmailChannel],
      useFactory: (
        config: ConfigType<typeof appConfig>,
        mockEmailChannel: MockEmailChannel,
        emailChannel: EmailChannel,
      ) => {
        return config.nodeEnv === Environment.DEVELOPMENT
          ? mockEmailChannel
          : emailChannel;
      },
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
