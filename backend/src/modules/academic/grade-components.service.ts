import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseCrudService } from '../../common/services/base-crud.service';
import { GradeComponent } from '../../database/entities/grade-component.entity';

@Injectable()
export class GradeComponentsService extends BaseCrudService<GradeComponent> {
  constructor(
    @InjectRepository(GradeComponent)
    repository: Repository<GradeComponent>,
  ) {
    super(repository);
  }

  // Find all components ordered by name
  async findAllOrdered() {
    return this.repository.find({
      order: {
        name: 'ASC',
      },
      where: { isActive: true },
    });
  }
}
