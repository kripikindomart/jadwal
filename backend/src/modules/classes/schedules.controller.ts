import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Query,
  Req,
  Delete,
  Patch,
  Param,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { ScheduleGeneratorService } from './schedule-generator.service';
import { GenerateScheduleDto } from './dto/classes.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { ClassSchedule, ClassCourse } from '../../database/entities';

@ApiTags('Schedules')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('api/schedules')
export class SchedulesController {
  constructor(
    private readonly scheduleGeneratorService: ScheduleGeneratorService,
    @InjectRepository(ClassSchedule)
    private readonly classScheduleRepository: Repository<ClassSchedule>,
    @InjectRepository(ClassCourse)
    private readonly classCourseRepository: Repository<ClassCourse>,
  ) {}

  @Get()
  @RequirePermissions('schedules.view')
  @ApiOperation({ summary: 'Mendapatkan daftar jadwal berdasarkan semester' })
  async findAll(@Query('semesterId') semesterId: string) {
    if (!semesterId) {
      return [];
    }
    const schedules = await this.classScheduleRepository.find({
      where: {
        classCourse: { class: { semesterId: parseInt(semesterId, 10) } },
      },
      relations: [
        'classCourse',
        'classCourse.class',
        'classCourse.course',
        'room',
        'classCourse.classLecturers',
        'classCourse.classLecturers.lecturer',
      ],
      order: {
        dayOfWeek: 'ASC',
        startTime: 'ASC',
      },
    });

    return schedules.map((s) => ({
      id: s.id,
      dayOfWeek: s.dayOfWeek,
      startTime: s.startTime,
      endTime: s.endTime,
      room: s.room ? s.room.name : 'TBA',
      class: {
        id: s.classCourse.class.id,
        name: s.classCourse.class.name,
        course: s.classCourse.course ? s.classCourse.course.name : 'Unknown',
        lecturers: s.classCourse.classLecturers?.map(
          (cl: any) => cl.lecturer?.name || 'Unknown',
        ),
      },
    }));
  }

  @Get('my-schedule')
  @ApiOperation({ summary: 'Mendapatkan jadwal personal user login' })
  async getMySchedule(
    @Req() req: any,
    @Query('semesterId') semesterId: string,
  ) {
    if (!semesterId) {
      return [];
    }
    const userId = req.user.id;

    const schedules = await this.classScheduleRepository.find({
      where: [
        {
          classCourse: {
            class: {
              semesterId: parseInt(semesterId, 10),
              classStudents: { studentId: userId },
            },
          },
        },
        {
          classCourse: {
            class: {
              semesterId: parseInt(semesterId, 10),
            },
            classCourseStudents: { studentId: userId },
          },
        },
        {
          classCourse: {
            class: {
              semesterId: parseInt(semesterId, 10),
            },
            classLecturers: { lecturerId: userId },
          },
        },
      ],
      relations: [
        'classCourse',
        'classCourse.class',
        'classCourse.course',
        'room',
        'classCourse.classLecturers',
        'classCourse.classLecturers.lecturer',
      ],
      order: {
        dayOfWeek: 'ASC',
        startTime: 'ASC',
      },
    });

    return schedules.map((s) => ({
      id: s.id,
      dayOfWeek: s.dayOfWeek,
      startTime: s.startTime,
      endTime: s.endTime,
      room: s.room ? s.room.name : 'TBA',
      class: {
        id: s.classCourse.class.id,
        name: s.classCourse.class.name,
        course: s.classCourse.course ? s.classCourse.course.name : 'Unknown',
        lecturers: s.classCourse.classLecturers?.map(
          (cl: any) => cl.lecturer?.name || 'Unknown',
        ),
      },
    }));
  }

  @Post('generate')
  @RequirePermissions('schedules.generate')
  @ApiOperation({
    summary: 'Men-generate jadwal dengan backtracking algortihm',
  })
  generate(@Body() dto: GenerateScheduleDto) {
    return this.scheduleGeneratorService.generate(dto);
  }

  @Delete('class/:classId')
  @RequirePermissions('schedules.generate')
  @ApiOperation({ summary: 'Menghapus seluruh jadwal milik rombel' })
  async deleteScheduleByClass(@Param('classId') classId: string) {
    const classCourses = await this.classCourseRepository.find({
      where: { classId: parseInt(classId, 10) },
      select: ['id'],
    });

    if (classCourses.length === 0) {
      return { message: 'Tidak ada matakuliah di rombel ini', success: true };
    }

    const classCourseIds = classCourses.map((cc) => cc.id);

    const result = await this.classScheduleRepository.delete({
      classCourseId: In(classCourseIds),
    });

    return {
      message: `Berhasil menghapus jadwal rombel`,
      success: true,
    };
  }

  @Delete(':id')
  @RequirePermissions('schedules.generate')
  @ApiOperation({ summary: 'Menghapus satu pertemuan jadwal' })
  async deleteOneSchedule(@Param('id') id: string) {
    const sched = await this.classScheduleRepository.findOne({
      where: { id: parseInt(id, 10) },
    });
    if (!sched) throw new NotFoundException('Jadwal tidak ditemukan');

    await this.classScheduleRepository.remove(sched);
    return { message: 'Jadwal pertemuan berhasil dihapus', success: true };
  }

  @Post('manual')
  @RequirePermissions('schedules.generate')
  @ApiOperation({ summary: 'Menambah manual satu pertemuan' })
  @ApiBody({
    schema: {
      example: {
        classCourseId: 1,
        roomId: 2,
        dayOfWeek: 1,
        startTime: '08:00',
        endTime: '10:00',
        date: '2024-01-01',
      },
    },
  })
  async createManualSchedule(@Body() dto: any) {
    const newSched = this.classScheduleRepository.create({
      classCourseId: dto.classCourseId,
      roomId: dto.roomId || null,
      dayOfWeek: dto.dayOfWeek,
      date: dto.date, // YYYY-MM-DD
      startTime: dto.startTime,
      endTime: dto.endTime,
    });
    await this.classScheduleRepository.save(newSched);
    return {
      message: 'Jadwal pertemuan manual berhasil ditambahkan',
      success: true,
      data: newSched,
    };
  }

  @Patch(':id')
  @RequirePermissions('schedules.generate')
  @ApiOperation({ summary: 'Mengubah jadwal satu pertemuan (reschedule)' })
  async updateOneSchedule(@Param('id') id: string, @Body() dto: any) {
    const sched = await this.classScheduleRepository.findOne({
      where: { id: parseInt(id, 10) },
    });
    if (!sched) throw new NotFoundException('Jadwal tidak ditemukan');

    if (dto.date !== undefined) sched.date = dto.date;
    if (dto.startTime !== undefined) sched.startTime = dto.startTime;
    if (dto.endTime !== undefined) sched.endTime = dto.endTime;
    if (dto.roomId !== undefined) sched.roomId = dto.roomId;
    if (dto.dayOfWeek !== undefined) sched.dayOfWeek = dto.dayOfWeek;

    await this.classScheduleRepository.save(sched);
    return {
      message: 'Jadwal berhasil diperbarui',
      success: true,
      data: sched,
    };
  }

  @Post('bulk-update')
  @RequirePermissions('schedules.generate')
  @ApiOperation({
    summary: 'Batch update jadwal (reschedule banyak pertemuan sekaligus)',
  })
  async bulkUpdate(
    @Body()
    dto: {
      ids: number[];
      date?: string;
      startTime?: string;
      endTime?: string;
      roomId?: number | null;
    },
  ) {
    const schedules = await this.classScheduleRepository.findByIds(dto.ids);
    if (schedules.length === 0)
      throw new NotFoundException('Tidak ada jadwal yang ditemukan');

    for (const sched of schedules) {
      if (dto.date !== undefined) sched.date = dto.date;
      if (dto.startTime !== undefined) sched.startTime = dto.startTime;
      if (dto.endTime !== undefined) sched.endTime = dto.endTime;
      if (dto.roomId !== undefined) (sched as any).roomId = dto.roomId;
    }

    await this.classScheduleRepository.save(schedules);
    return {
      message: `${schedules.length} jadwal berhasil diperbarui`,
      success: true,
    };
  }

  @Post('bulk-delete')
  @RequirePermissions('schedules.generate')
  @ApiOperation({ summary: 'Hapus banyak jadwal sekaligus' })
  async bulkDelete(@Body() dto: { ids: number[] }) {
    if (!dto.ids || dto.ids.length === 0) {
      return { message: 'Tidak ada jadwal yang dipilih', success: false };
    }
    await this.classScheduleRepository.delete(dto.ids);
    return {
      message: `${dto.ids.length} jadwal berhasil dihapus`,
      success: true,
    };
  }
}
