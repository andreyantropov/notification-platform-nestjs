import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { MailerModule } from '@nestjs-modules/mailer';
import { BitrixChannel } from './channels/bitrix.channel';
import { EmailChannel } from './channels/email.channel';
import { MockBitrixChannel } from './channels/mock-bitrix.channel';
import { MockEmailChannel } from './channels/mock-email.channel';
import { BitrixChannelConfig } from './channels/bitrix.channel.config';
import { EmailChannelConfig } from './channels/email.channel.config';
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

const isDev = process.env.NODE_ENV === 'development';

@Module({
  imports: [
    HttpModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        timeout: config.get<number>('AXIOS_TIMEOUT_MS')!,
        maxRedirects: 5,
      }),
    }),
    MailerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        transport: {
          host: config.getOrThrow<string>('SMTP_HOST'),
          port: config.get<number>('SMTP_PORT')!,
          secure: config.get<boolean>('SMTP_SECURE')!,
          auth: {
            user: config.getOrThrow<string>('SMTP_USER'),
            pass: config.getOrThrow<string>('SMTP_PASS'),
          },
          greetingTimeout: config.get<number>('SMTP_GREETING_TIMEOUT_MS')!,
          socketTimeout: config.get<number>('SMTP_SOCKET_TIMEOUT_MS')!,
          connectionTimeout: config.get<number>('SMTP_CONNECTION_TIMEOUT_MS')!,
          pool: true,
          maxConnections: 5,
        },
      }),
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
      provide: BitrixChannelConfig,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new BitrixChannelConfig(
          config.getOrThrow<string>('BITRIX_BASE_URL'),
          config.getOrThrow<string>('BITRIX_USER_ID'),
          config.getOrThrow<string>('BITRIX_AUTH_TOKEN'),
          config.get<number>('BITRIX_TIMEOUT_MS')!,
          {
            maxConcurrent: config.get<number>('BITRIX_CONCURRENCY')!,
            minTime: config.get<number>('BITRIX_DELAY_MS')!,
          },
        ),
    },
    {
      provide: EmailChannelConfig,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new EmailChannelConfig(
          config.getOrThrow<string>('SMTP_FROM'),
          config.getOrThrow<string>('SMTP_SUBJECT'),
          config.get<number>('SMTP_TIMEOUT_MS')!,
          {
            maxConcurrent: config.get<number>('SMTP_CONCURRENCY')!,
            minTime: config.get<number>('SMTP_DELAY_MS')!,
          },
        ),
    },
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
