import { Test, TestingModule } from '@nestjs/testing';
import { ConcentrationsController } from './concentrations.controller';

describe('ConcentrationsController', () => {
  let controller: ConcentrationsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConcentrationsController],
    }).compile();

    controller = module.get<ConcentrationsController>(ConcentrationsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
