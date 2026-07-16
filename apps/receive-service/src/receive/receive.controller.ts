import { Controller } from '@nestjs/common';
import { ReceiveService } from './receive.service';

@Controller('receive')
export class ReceiveController {
  constructor(private readonly receiveService: ReceiveService) {}
}
