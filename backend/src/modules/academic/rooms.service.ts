import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Room } from '../../database/entities/room.entity';
import { BaseCrudService } from '../../common/services/base-crud.service';

@Injectable()
export class RoomsService extends BaseCrudService<Room> {
  constructor(
    @InjectRepository(Room)
    repository: Repository<Room>,
  ) {
    super(repository);
  }
}
