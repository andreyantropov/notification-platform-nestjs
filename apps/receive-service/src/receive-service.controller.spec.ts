import { Test, TestingModule } from '@nestjs/testing';
import { ReceiveServiceController } from './receive-service.controller';
import { ReceiveServiceService } from './receive-service.service';

describe('ReceiveServiceController', () => {
  let receiveServiceController: ReceiveServiceController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [ReceiveServiceController],
      providers: [ReceiveServiceService],
    }).compile();

    receiveServiceController = app.get<ReceiveServiceController>(ReceiveServiceController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(receiveServiceController.getHello()).toBe('Hello World!');
    });
  });
});
