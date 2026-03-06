import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseCrudService } from '../../common/services/base-crud.service';
import { Timeslot } from '../../database/entities/timeslot.entity';

@Injectable()
export class TimeslotsService extends BaseCrudService<Timeslot> {
  constructor(
    @InjectRepository(Timeslot)
    repository: Repository<Timeslot>,
  ) {
    super(repository);
  }

  // Find all timeslots ordered by day and start time
  async findAllOrdered() {
    return this.repository.find({
      order: {
        dayOfWeek: 'ASC',
        startTime: 'ASC',
      },
      where: { isUsable: true },
    });
  }
}
