import { Module } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { MailerModule } from '@nestjs-modules/mailer';
import { Environment } from '@app/shared';
import { EMAIL_CHANNEL } from './email-channel.constants';
import { EmailChannel } from './email.channel';
import { MockEmailChannel } from './mock-email.channel';
import { appConfig } from '../../../../config/app.config';
import { smtpConfig } from '../../../../config/smtp.config';

@Module({
  imports: [
    MailerModule.forRootAsync({
      inject: [smtpConfig.KEY],
      useFactory: (config: ConfigType<typeof smtpConfig>) => config,
    }),
  ],
  providers: [
    EmailChannel,
    MockEmailChannel,
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
  ],
  exports: [EMAIL_CHANNEL],
})
export class EmailChannelModule {}
