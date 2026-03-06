import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Prodi } from '../../database/entities/prodi.entity';
import { BaseCrudService } from '../../common/services/base-crud.service';

@Injectable()
export class ProdisService extends BaseCrudService<Prodi> {
  constructor(
    @InjectRepository(Prodi)
    repository: Repository<Prodi>,
  ) {
    super(repository);
  }
}
