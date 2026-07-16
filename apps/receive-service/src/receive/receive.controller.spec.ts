import { Test, TestingModule } from '@nestjs/testing';
import { ReceiveController } from './receive.controller';
import { ReceiveService } from './receive.service';

describe('ReceiveController', () => {
  let controller: ReceiveController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReceiveController],
      providers: [ReceiveService],
    }).compile();

    controller = module.get<ReceiveController>(ReceiveController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
