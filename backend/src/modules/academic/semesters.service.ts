import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Semester } from '../../database/entities/semester.entity';
import { BaseCrudService } from '../../common/services/base-crud.service';

@Injectable()
export class SemestersService extends BaseCrudService<Semester> {
  constructor(
    @InjectRepository(Semester)
    repository: Repository<Semester>,
  ) {
    super(repository);
  }

  async setActive(id: number): Promise<Semester> {
    const target = await this.findOneOrFail(id);

    // Nonaktifkan semua yang lain
    await this.repository.update({ isActive: true }, { isActive: false });

    // Aktifkan target
    target.isActive = true;
    return this.repository.save(target);
  }
}
