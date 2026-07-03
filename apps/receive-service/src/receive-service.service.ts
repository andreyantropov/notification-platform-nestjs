import { Injectable } from '@nestjs/common';

@Injectable()
export class ReceiveServiceService {
  getHello(): string {
    return 'Hello World!';
  }
}
