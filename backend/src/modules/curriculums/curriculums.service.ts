import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Curriculum } from '../../database/entities/curriculum.entity';
import { CurriculumCourse } from '../../database/entities/curriculum-course.entity';
import { Course } from '../../database/entities/course.entity';
import {
  CreateCurriculumDto,
  UpdateCurriculumDto,
  AddCurriculumCourseDto,
  UpdateCurriculumCourseDto,
} from './dto/curriculum.dto';

@Injectable()
export class CurriculumsService {
  constructor(
    @InjectRepository(Curriculum)
    private readonly currRepo: Repository<Curriculum>,
    @InjectRepository(CurriculumCourse)
    private readonly currCourseRepo: Repository<CurriculumCourse>,
    @InjectRepository(Course)
    private readonly courseRepo: Repository<Course>,
  ) {}

  async findAll(prodiIds?: number[]) {
    const qb = this.currRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.prodi', 'prodi');

    if (prodiIds && prodiIds.length > 0) {
      qb.where('c.prodiId IN (:...prodiIds)', { prodiIds });
    }

    return await qb.orderBy('c.year', 'DESC').getMany();
  }

  async findOne(id: number) {
    const curriculum = await this.currRepo.findOne({
      where: { id },
      relations: ['prodi', 'curriculumCourses', 'curriculumCourses.course'],
    });

    if (!curriculum) {
      throw new NotFoundException(`Curriculum with ID ${id} not found`);
    }

    // Sort courses by semester ascending
    if (curriculum.curriculumCourses) {
      curriculum.curriculumCourses.sort((a, b) => a.semester - b.semester);
    }

    return curriculum;
  }

  async create(createDto: CreateCurriculumDto) {
    const curr = this.currRepo.create(createDto);
    return await this.currRepo.save(curr);
  }

  async update(id: number, updateDto: UpdateCurriculumDto) {
    const curr = await this.findOne(id);
    Object.assign(curr, updateDto);
    return await this.currRepo.save(curr);
  }

  async remove(id: number) {
    const curr = await this.findOne(id);
    return await this.currRepo.softRemove(curr);
  }

  // Curriculum Courses Logic

  async addCourse(curriculumId: number, dto: AddCurriculumCourseDto) {
    const curr = await this.findOne(curriculumId);

    // Verify course exists
    const course = await this.courseRepo.findOne({
      where: { id: dto.courseId },
    });
    if (!course) {
      throw new NotFoundException(`Course with ID ${dto.courseId} not found`);
    }

    const cc = this.currCourseRepo.create({
      curriculumId: curr.id,
      courseId: course.id,
      semester: dto.semester,
      status: dto.status,
      minGrade: dto.minGrade,
      isPackage: dto.isPackage,
      prerequisites: dto.prerequisites,
      concentration: dto.concentration,
    });

    return await this.currCourseRepo.save(cc);
  }

  async updateCourse(
    curriculumId: number,
    courseId: number,
    dto: UpdateCurriculumCourseDto,
  ) {
    const cc = await this.currCourseRepo.findOne({
      where: { curriculumId, courseId },
    });

    if (!cc) {
      throw new NotFoundException(
        `Course ${courseId} is not in curriculum ${curriculumId}`,
      );
    }

    Object.assign(cc, dto);
    return await this.currCourseRepo.save(cc);
  }

  async removeCourse(curriculumId: number, courseId: number) {
    const cc = await this.currCourseRepo.findOne({
      where: { curriculumId, courseId },
    });

    if (!cc) {
      throw new NotFoundException(
        `Course ${courseId} is not in curriculum ${curriculumId}`,
      );
    }

    return await this.currCourseRepo.remove(cc);
  }
}
