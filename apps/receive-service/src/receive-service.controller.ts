import { Controller, Get } from '@nestjs/common';
import { ReceiveServiceService } from './receive-service.service';

@Controller()
export class ReceiveServiceController {
  constructor(private readonly receiveServiceService: ReceiveServiceService) {}

  @Get()
  getHello(): string {
    return this.receiveServiceService.getHello();
  }
}
