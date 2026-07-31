import { Module } from '@nestjs/common';
import { ChannelContext } from './channel.context';

@Module({
  providers: [ChannelContext],
  exports: [ChannelContext],
})
export class ChannelsCoreModule {}
