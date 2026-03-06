import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Class,
  ClassSchedule,
  Room,
  Timeslot,
  ClassLecturer,
  ClassCourse,
} from '../../database/entities';
import { GenerateScheduleDto } from './dto/classes.dto';

// Data types for the backtracking algorithm
interface ClassReq {
  classCourseId: number;
  lecturerIds: number[];
  onlinePercentage: number;
  roomIds: number[];
  totalMeetings: number;
  preferredTimeslotId?: number;
  startDate?: string;
  // Flexible per-course schedule fields
  scheduledDayOfWeek?: number;
  scheduledStartTime?: string;
  scheduledEndTime?: string;
}

interface Slot {
  id: number;
  dayOfWeek: number;
  startTime: string;
  roomId: number;
}

interface AssignedSlot {
  classCourseId: number;
  timeslotId: number;
  roomId: number | null; // Null if online
  lecturerIds: number[];
  dayOfWeek: number;
  startTime: string;
}

@Injectable()
export class ScheduleGeneratorService {
  private readonly logger = new Logger(ScheduleGeneratorService.name);

  constructor(
    @InjectRepository(ClassCourse)
    private readonly classCourseRepository: Repository<ClassCourse>,
    @InjectRepository(ClassSchedule)
    private readonly classScheduleRepository: Repository<ClassSchedule>,
    @InjectRepository(Room)
    private readonly roomRepository: Repository<Room>,
    @InjectRepository(Timeslot)
    private readonly timeslotRepository: Repository<Timeslot>,
    @InjectRepository(ClassLecturer)
    private readonly classLecturerRepository: Repository<ClassLecturer>,
  ) {}

  async generate(dto: GenerateScheduleDto) {
    const { semesterId } = dto;
    this.logger.log(`Memulai generate jadwal untuk semester ${semesterId}`);

    // Hapus jadwal sebelumnya untuk semester ini jika ada
    const existingClassCourses = await this.classCourseRepository.find({
      where: { class: { semesterId } },
      select: ['id'],
    });

    if (existingClassCourses.length > 0) {
      const ccIds = existingClassCourses.map((cc) => cc.id);
      await this.classScheduleRepository.delete(
        ccIds.map((id) => ({ classCourseId: id })),
      );
    }

    // 1. Ambil data Matakuliah (ClassCourse) yang perlu dijadwalkan
    const classCourses = await this.classCourseRepository.find({
      where: { class: { semesterId } },
      relations: ['rooms'],
    });
    if (classCourses.length === 0) {
      throw new BadRequestException(
        'Tidak ada kelas matakuliah untuk semester ini',
      );
    }

    // Ambil data dosen untuk kelas
    const classReqs: ClassReq[] = [];
    for (const cc of classCourses) {
      const lecturers = await this.classLecturerRepository.find({
        where: { classCourseId: cc.id },
      });
      classReqs.push({
        classCourseId: cc.id,
        lecturerIds: lecturers.map((l) => l.lecturerId),
        onlinePercentage: cc.onlinePercentage,
        roomIds: cc.rooms?.map((r) => r.id) || [],
        totalMeetings: cc.totalMeetings,
        preferredTimeslotId: cc.timeslotId || undefined,
        startDate: cc.startDate ? cc.startDate.toString() : undefined,
        scheduledDayOfWeek: cc.dayOfWeek ?? undefined,
        scheduledStartTime: cc.scheduledStartTime ?? undefined,
        scheduledEndTime: cc.scheduledEndTime ?? undefined,
      });
    }

    // 2. Ambil data Rooms yang usable
    const rooms = await this.roomRepository.find({
      where: { isUsable: true },
    });
    if (rooms.length === 0) {
      throw new BadRequestException('Tidak ada ruangan yang dapat digunakan');
    }

    // 3. Ambil data Timeslots yang usable
    const timeslots = await this.timeslotRepository.find({
      where: { isUsable: true },
      order: { dayOfWeek: 'ASC', startTime: 'ASC' },
    });
    if (timeslots.length === 0) {
      throw new BadRequestException(
        'Tidak ada slot waktu yang dapat digunakan',
      );
    }

    // 4. Flatten slots = Timeslots x Rooms
    const availableSlots: Slot[] = [];
    for (const t of timeslots) {
      for (const r of rooms) {
        availableSlots.push({
          id: t.id,
          dayOfWeek: t.dayOfWeek,
          startTime: t.startTime,
          roomId: r.id,
        });
      }
    }

    // 5. Setup Backtracking
    const assignments: AssignedSlot[] = [];
    // We want to sort classReqs, optionally by most restricted first (e.g., most lecturers)
    classReqs.sort((a, b) => b.lecturerIds.length - a.lecturerIds.length);

    if (this.backtrack(0, classReqs, availableSlots, assignments)) {
      this.logger.log('Jadwal berhasil digenerate.');
      // Simpan ke database
      await this.saveSchedule(assignments, timeslots, classReqs);
      return { message: 'Jadwal berhasil digenerate', success: true };
    } else {
      this.logger.warn('Tidak dapat menemukan jadwal tanpa bentrok.');
      throw new BadRequestException(
        'Tidak dapat menemukan kombinasi jadwal yang tidak bentrok dengan slot/ruang yang ada.',
      );
    }
  }

  private backtrack(
    classIndex: number,
    classReqs: ClassReq[],
    availableSlots: Slot[],
    assignments: AssignedSlot[],
  ): boolean {
    if (classIndex === classReqs.length) {
      return true; // Semua kelas berhasil dijadwalkan
    }

    const currentClass = classReqs[classIndex];

    for (const slot of availableSlots) {
      // Wajib gunakan slot yang telah ditentukan (jika ada)
      if (
        currentClass.preferredTimeslotId !== undefined &&
        slot.id !== currentClass.preferredTimeslotId
      ) {
        continue;
      }

      // Prioritaskan/hanya gunakan ruangan pilihan jika diset (dan jika bukan 100% online)
      if (
        currentClass.onlinePercentage < 100 &&
        currentClass.roomIds.length > 0
      ) {
        if (!currentClass.roomIds.includes(slot.roomId)) {
          continue;
        }
      }

      if (this.isValidAssignment(currentClass, slot, assignments)) {
        // Coba tempatkan
        assignments.push({
          classCourseId: currentClass.classCourseId,
          timeslotId: slot.id,
          roomId: currentClass.onlinePercentage === 100 ? null : slot.roomId, // Set null jika 100% online
          lecturerIds: currentClass.lecturerIds,
          dayOfWeek: slot.dayOfWeek,
          startTime: slot.startTime,
        });

        // Rekursi untuk kelas selanjutnya
        if (
          this.backtrack(classIndex + 1, classReqs, availableSlots, assignments)
        ) {
          return true;
        }

        // Backtrack: copot jadwal
        assignments.pop();
      }
    }

    return false; // Harus backtrack
  }

  private isValidAssignment(
    currentClass: ClassReq,
    slot: Slot,
    assignments: AssignedSlot[],
  ): boolean {
    for (const assigned of assignments) {
      // Bentrok Ruangan & Waktu (abaikan bentrok ruangan jika kelas 100% online)
      if (
        assigned.timeslotId === slot.id &&
        assigned.roomId === slot.roomId &&
        currentClass.onlinePercentage < 100 &&
        assigned.roomId !== null
      ) {
        return false;
      }

      // Bentrok Dosen (waktu yang sama)
      if (assigned.timeslotId === slot.id) {
        const hasConflictLecturer = currentClass.lecturerIds.some((id) =>
          assigned.lecturerIds.includes(id),
        );
        if (hasConflictLecturer) return false;
      }
    }
    return true;
  }

  /**
   * Fisher-Yates shuffle: randomly pick `count` unique indices from 0..total-1
   */
  private pickRandomOfflineIndices(total: number, count: number): Set<number> {
    const indices = Array.from({ length: total }, (_, i) => i);
    // Shuffle
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    return new Set(indices.slice(0, count));
  }

  private async saveSchedule(
    assignments: AssignedSlot[],
    timeslots: Timeslot[],
    classReqs: ClassReq[],
  ) {
    const timeslotMap = new Map<number, Timeslot>();
    for (const t of timeslots) {
      timeslotMap.set(t.id, t);
    }

    const classReqMap = new Map<number, ClassReq>();
    for (const req of classReqs) {
      classReqMap.set(req.classCourseId, req);
    }

    // Load ALL rooms so we can fallback when preferred room is taken
    const allRooms = await this.roomRepository.find({
      where: { isUsable: true },
    });

    // Track room bookings: key = "YYYY-MM-DD|startTime|roomId" → classCourseId
    const roomBookings = new Map<string, number>();

    // Load existing room schedules for conflict checking across all courses
    const existingRoomSchedules = await this.classScheduleRepository
      .createQueryBuilder('cs')
      .where('cs.roomId IS NOT NULL')
      .getMany();

    for (const es of existingRoomSchedules) {
      if (es.date && es.startTime && es.roomId) {
        const key = `${es.date}|${es.startTime}|${es.roomId}`;
        roomBookings.set(key, es.classCourseId);
      }
    }

    const toSave: any[] = [];

    for (const a of assignments) {
      const ts = timeslotMap.get(a.timeslotId);
      if (!ts) {
        throw new BadRequestException(
          `Timeslot ${a.timeslotId} tidak ditemukan.`,
        );
      }

      const req = classReqMap.get(a.classCourseId);
      const totalMeetings = req?.totalMeetings || 16;
      const onlinePercentage = req?.onlinePercentage || 0;

      // Use flexible fields if set, otherwise fallback to timeslot values
      const useDayOfWeek = req?.scheduledDayOfWeek ?? a.dayOfWeek;
      const useStartTime = req?.scheduledStartTime ?? ts.startTime;
      const useEndTime = req?.scheduledEndTime ?? ts.endTime;

      // Calculate how many meetings are offline
      const offlineMeetingsCount = Math.round(
        (totalMeetings * (100 - onlinePercentage)) / 100,
      );

      // RANDOMIZE: Pick which meeting indices are offline (spread across weeks)
      const offlineIndices = this.pickRandomOfflineIndices(
        totalMeetings,
        offlineMeetingsCount,
      );

      let currentDate = req?.startDate ? new Date(req.startDate) : new Date();

      // Align to matching day of week
      while (currentDate.getDay() !== useDayOfWeek) {
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Get preferred rooms for this course
      const preferredRoomIds = req?.roomIds || [];

      for (let i = 0; i < totalMeetings; i++) {
        const dateStr = currentDate.toISOString().split('T')[0];
        const isOffline = offlineIndices.has(i);

        let finalRoomId: number | undefined = undefined;

        if (isOffline && a.roomId !== null) {
          // Try to assign a room, checking for conflicts
          const candidateRooms =
            preferredRoomIds.length > 0
              ? [
                  ...preferredRoomIds,
                  ...allRooms
                    .map((r) => r.id)
                    .filter((id) => !preferredRoomIds.includes(id)),
                ]
              : allRooms.map((r) => r.id);

          for (const roomId of candidateRooms) {
            const bookingKey = `${dateStr}|${useStartTime}|${roomId}`;
            if (!roomBookings.has(bookingKey)) {
              finalRoomId = roomId;
              roomBookings.set(bookingKey, a.classCourseId);
              break;
            }
          }

          // If no room available at all, log warning but still save as online
          if (finalRoomId === undefined) {
            this.logger.warn(
              `No available room for course ${a.classCourseId} on ${dateStr} ${useStartTime}. Falling back to online.`,
            );
          }
        }

        toSave.push(
          this.classScheduleRepository.create({
            classCourseId: a.classCourseId,
            roomId: finalRoomId,
            dayOfWeek: useDayOfWeek,
            date: dateStr,
            startTime: useStartTime,
            endTime: useEndTime,
          }),
        );

        // Next week
        currentDate.setDate(currentDate.getDate() + 7);
      }
    }

    await this.classScheduleRepository.save(toSave);
  }
}
