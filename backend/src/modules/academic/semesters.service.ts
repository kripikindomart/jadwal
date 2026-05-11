import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Semester } from '../../database/entities/semester.entity';
import { BaseCrudService } from '../../common/services/base-crud.service';
import { DeepPartial } from 'typeorm';

@Injectable()
export class SemestersService extends BaseCrudService<Semester> {
  constructor(
    @InjectRepository(Semester)
    repository: Repository<Semester>,
  ) {
    super(repository);
  }
  async create(createDto: DeepPartial<Semester>): Promise<Semester> {
    if (createDto.isActive) {
      await this.repository.update({ isActive: true }, { isActive: false });
    }
    return super.create(createDto);
  }

  async update(id: number, updateDto: DeepPartial<Semester>): Promise<Semester> {
    if (updateDto.isActive) {
      await this.repository.update({ isActive: true }, { isActive: false });
    }
    return super.update(id, updateDto);
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
