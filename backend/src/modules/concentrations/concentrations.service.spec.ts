import { Test, TestingModule } from '@nestjs/testing';
import { ConcentrationsService } from './concentrations.service';

describe('ConcentrationsService', () => {
  let service: ConcentrationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ConcentrationsService],
    }).compile();

    service = module.get<ConcentrationsService>(ConcentrationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
