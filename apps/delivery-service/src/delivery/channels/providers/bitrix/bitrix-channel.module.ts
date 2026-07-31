import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigType } from '@nestjs/config';
import { Environment } from '@app/shared';
import { BITRIX_CHANNEL } from './bitrix-channel.constants';
import { BitrixChannel } from './bitrix.channel';
import { MockBitrixChannel } from './mock-bitrix.channel';
import { appConfig } from '../../../../config/app.config';
import { axiosConfig } from '../../../../config/axios.config';
import { ChannelsCoreModule } from '../../core/channels-core.module';

@Module({
  imports: [
    HttpModule.registerAsync({
      inject: [axiosConfig.KEY],
      useFactory: (config: ConfigType<typeof axiosConfig>) => config,
    }),
    ChannelsCoreModule,
  ],
  providers: [
    BitrixChannel,
    MockBitrixChannel,
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
  ],
  exports: [BITRIX_CHANNEL],
})
export class BitrixChannelModule {}
