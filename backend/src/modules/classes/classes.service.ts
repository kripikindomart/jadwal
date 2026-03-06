import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import {
  Class,
  ClassLecturer,
  ClassStudent,
  ClassSchedule,
  ClassMeeting,
  ClassCourse,
  ClassCourseStudent,
  Room,
} from '../../database/entities';
import {
  CreateClassDto,
  UpdateClassDto,
  AssignLecturersDto,
  EnrollStudentsDto,
} from './dto/classes.dto';
import {
  CreateClassCourseDto,
  UpdateClassCourseDto,
} from './dto/class-course.dto';

@Injectable()
export class ClassesService {
  constructor(
    @InjectRepository(Class)
    private readonly classRepository: Repository<Class>,
    @InjectRepository(ClassLecturer)
    private readonly classLecturerRepository: Repository<ClassLecturer>,
    @InjectRepository(ClassStudent)
    private readonly classStudentRepository: Repository<ClassStudent>,
    @InjectRepository(ClassSchedule)
    private readonly classScheduleRepository: Repository<ClassSchedule>,
    @InjectRepository(ClassMeeting)
    private readonly classMeetingRepository: Repository<ClassMeeting>,
    @InjectRepository(ClassCourse)
    private readonly classCourseRepository: Repository<ClassCourse>,
    @InjectRepository(ClassCourseStudent)
    private readonly classCourseStudentRepository: Repository<ClassCourseStudent>,
  ) {}

  async findAll(
    page = 1,
    limit = 10,
    search?: string,
    courseId?: number,
    semesterId?: number,
  ) {
    const where: any = {};
    if (search) {
      where.name = ILike(`%${search}%`);
    }
    if (courseId) {
      where.courseId = courseId;
    }
    if (semesterId) {
      where.semesterId = semesterId;
    }

    const [data, total] = await this.classRepository.findAndCount({
      where,
      relations: [
        'semester',
        'prodi',
        'classCourses',
        'classCourses.course',
        'classStudents',
      ],
      skip: (page - 1) * limit,
      take: limit,
      order: {
        createdAt: 'DESC',
      },
    });

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const classEntity = await this.classRepository.findOne({
      where: { id },
      relations: [
        'semester',
        'prodi',
        'classCourses',
        'classCourses.course',
        'classCourses.rooms',
        'classCourses.timeslot',
        'classCourses.classSchedules',
        'classCourses.classSchedules.room',
      ],
    });

    if (!classEntity) {
      throw new NotFoundException('Kelas tidak ditemukan');
    }

    // Ambil data dosen pengajar (via classCourses)
    const classCoursesIds = classEntity.classCourses?.map((cc) => cc.id) || [];
    let lecturers: any[] = [];
    let schedules: any[] = [];
    let courseStudents: any[] = [];

    if (classCoursesIds.length > 0) {
      lecturers = await this.classLecturerRepository.find({
        where: classCoursesIds.map((id) => ({ classCourseId: id })),
        relations: ['lecturer', 'lecturer.lecturerProfile', 'classCourse'],
      });

      schedules = await this.classScheduleRepository.find({
        where: classCoursesIds.map((id) => ({ classCourseId: id })),
        relations: ['room', 'classCourse'],
      });

      courseStudents = await this.classCourseStudentRepository.find({
        where: classCoursesIds.map((id) => ({ classCourseId: id })),
        relations: ['student', 'student.studentProfile', 'classCourse'],
      });
    }

    // Ambil data mahasiswa enrolled secara paket rombel
    const students = await this.classStudentRepository.find({
      where: { classId: id },
      relations: ['student', 'student.studentProfile'],
    });

    return {
      ...classEntity,
      classCourses: classEntity.classCourses?.map((cc) => {
        const ccLecturers = lecturers.filter((l) => l.classCourseId === cc.id);
        return {
          ...cc,
          classLecturers: ccLecturers.map((l) => ({
            id: l.id,
            lecturerId: l.lecturerId,
            isPrimary: l.isPrimary,
            lecturer: {
              id: l.lecturerId,
              name: l.lecturer.name,
              fullName:
                `${l.lecturer.lecturerProfile?.frontTitle || ''} ${l.lecturer.name}${l.lecturer.lecturerProfile?.backTitle ? ', ' + l.lecturer.lecturerProfile.backTitle : ''}`.trim(),
              nidn: l.lecturer.lecturerProfile?.nidn,
            },
          })),
          classCourseStudents: courseStudents
            .filter((cs) => cs.classCourseId === cc.id)
            .map((cs) => ({
              id: cs.id,
              studentId: cs.studentId,
              student: {
                id: cs.student.id,
                name: cs.student.name,
                nim: cs.student.studentProfile?.nim,
              },
            })),
        };
      }),
      lecturers: lecturers.map((l) => ({
        id: l.lecturerId,
        name: l.lecturer.name,
        nidn: l.lecturer.lecturerProfile?.nidn,
        isPrimary: l.isPrimary,
        classCourseId: l.classCourseId,
      })),
      students: students.map((s) => ({
        id: s.studentId,
        name: s.student.name,
        nim: s.student.studentProfile?.nim,
      })),
      schedules,
    };
  }

  async create(dto: CreateClassDto) {
    const newClass = this.classRepository.create(dto);
    return await this.classRepository.save(newClass);
  }

  async update(id: number, dto: UpdateClassDto) {
    const classEntity = await this.classRepository.findOne({ where: { id } });
    if (!classEntity) {
      throw new NotFoundException('Kelas tidak ditemukan');
    }

    Object.assign(classEntity, dto);
    return await this.classRepository.save(classEntity);
  }

  async remove(id: number) {
    const result = await this.classRepository.softDelete(id);
    if (result.affected === 0) {
      throw new NotFoundException('Kelas tidak ditemukan');
    }
    return { message: 'Kelas berhasil dihapus' };
  }

  async restore(id: number) {
    const result = await this.classRepository.restore(id);
    if (result.affected === 0) {
      throw new NotFoundException('Kelas tidak ditemukan');
    }
    return { message: 'Kelas berhasil dipulihkan' };
  }

  async forceDelete(id: number) {
    const classEntity = await this.classRepository.findOne({
      where: { id },
      withDeleted: true,
    });
    if (!classEntity) {
      throw new NotFoundException('Kelas tidak ditemukan');
    }

    // Cascading manual (ClassCourse dipisah/disebarkan jika dibutuhkan. Tapi karena on delete cascade di DB / ORM, biarkan Class Course terhapus yang akan menghapus relationnya)
    await this.classStudentRepository.delete({ classId: id });

    return await this.classRepository.remove(classEntity);
  }

  async bulkAction(action: 'trash' | 'restore' | 'forceDelete', ids: number[]) {
    if (action === 'trash') {
      await this.classRepository.softDelete(ids);
    } else if (action === 'restore') {
      await this.classRepository.restore(ids);
      await this.classStudentRepository.delete(
        ids.map((id) => ({ classId: id })),
      );
      const entities = await this.classRepository.find({
        where: ids.map((id) => ({ id })),
        withDeleted: true,
      });
      await this.classRepository.remove(entities);
    }
    return { message: `${ids.length} kelas berhasil diproses` };
  }

  // Manajemen Matakuliah dalam Rombel (ClassCourse)
  async addClassCourse(classId: number, dto: CreateClassCourseDto) {
    const classEntity = await this.classRepository.findOne({
      where: { id: classId },
    });
    if (!classEntity)
      throw new NotFoundException('Rombel (Kelas) tidak ditemukan');

    const { roomIds, ...classCourseData } = dto;
    const newClassCourse = this.classCourseRepository.create({
      classId,
      ...classCourseData,
      rooms: roomIds ? roomIds.map((id) => ({ id }) as Room) : [],
    });

    return await this.classCourseRepository.save(newClassCourse);
  }

  async updateClassCourse(classCourseId: number, dto: UpdateClassCourseDto) {
    const classCourse = await this.classCourseRepository.findOne({
      where: { id: classCourseId },
      relations: ['rooms'],
    });
    if (!classCourse)
      throw new NotFoundException('Data Matakuliah Rombel tidak ditemukan');

    const { roomIds, ...classCourseData } = dto;
    Object.assign(classCourse, classCourseData);

    if (roomIds !== undefined) {
      classCourse.rooms = roomIds.map((id) => ({ id }) as Room);
    }

    return await this.classCourseRepository.save(classCourse);
  }

  async removeClassCourse(classCourseId: number) {
    const classCourse = await this.classCourseRepository.findOne({
      where: { id: classCourseId },
    });
    if (!classCourse)
      throw new NotFoundException('Data Matakuliah Rombel tidak ditemukan');

    return await this.classCourseRepository.remove(classCourse);
  }
  async assignLecturers(classCourseId: number, dto: AssignLecturersDto) {
    // Note: Parameter controller sebaiknya menggunakan ID classCourse
    // Hapus dosen lama untuk kelas matakuliah ini
    await this.classLecturerRepository.delete({ classCourseId });

    // Masukkan dosen baru
    if (dto.lecturerIds && dto.lecturerIds.length > 0) {
      const classLecturers = dto.lecturerIds.map((lecturerId, index) => {
        return this.classLecturerRepository.create({
          classCourseId,
          lecturerId,
          isPrimary: index === 0, // Dosen pertama diset primary by default
        });
      });
      await this.classLecturerRepository.save(classLecturers);
    }

    return { message: 'Dosen berhasil ditugaskan ke Matakuliah' };
  }

  // Pengaturan Mahasiswa (Enroll)
  async enrollStudents(classId: number, dto: EnrollStudentsDto) {
    const classEntity = await this.classRepository.findOne({
      where: { id: classId },
    });
    if (!classEntity) throw new NotFoundException('Kelas tidak ditemukan');

    // Hapus enrolled mahasiswa lama untuk kelas ini
    await this.classStudentRepository.delete({ classId });

    // Enroll mahasiswa baru
    if (dto.studentIds && dto.studentIds.length > 0) {
      const classStudents = dto.studentIds.map((studentId) => {
        return this.classStudentRepository.create({
          classId,
          studentId,
          semesterId: classEntity.semesterId,
        });
      });
      await this.classStudentRepository.save(classStudents);
    }

    return { message: 'Mahasiswa berhasil di-enroll' };
  }

  // Pengaturan Mahasiswa per Matakuliah (Enroll)
  async enrollCourseStudents(classCourseId: number, dto: EnrollStudentsDto) {
    const classCourse = await this.classCourseRepository.findOne({
      where: { id: classCourseId },
    });
    if (!classCourse)
      throw new NotFoundException('Matakuliah Rombel tidak ditemukan');

    // Hapus enrolled mahasiswa lama untuk matakuliah ini
    await this.classCourseStudentRepository.delete({ classCourseId });

    // Enroll mahasiswa baru
    if (dto.studentIds && dto.studentIds.length > 0) {
      const courseStudents = dto.studentIds.map((studentId) => {
        return this.classCourseStudentRepository.create({
          classCourseId,
          studentId,
        });
      });
      await this.classCourseStudentRepository.save(courseStudents);
    }

    return { message: 'Berhasil mengatur peserta untuk matakuliah ini' };
  }

  async unenrollCourseStudent(classCourseId: number, studentId: number) {
    const record = await this.classCourseStudentRepository.findOne({
      where: { classCourseId, studentId },
    });
    if (!record) throw new NotFoundException('Data enrollment tidak ditemukan');
    await this.classCourseStudentRepository.remove(record);
    return { message: 'Mahasiswa berhasil dihapus dari matakuliah' };
  }
}
