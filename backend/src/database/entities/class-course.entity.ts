import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  ManyToMany,
  JoinTable,
  JoinColumn,
} from 'typeorm';
import { Class } from './class.entity';
import { Course } from './course.entity';
import { ClassLecturer } from './class-lecturer.entity';
import { ClassSchedule } from './class-schedule.entity';
import { ClassMeeting } from './class-meeting.entity';
import { ClassCourseStudent } from './class-course-student.entity';
import { Room } from './room.entity';
import { Timeslot } from './timeslot.entity';

@Entity('class_courses')
export class ClassCourse {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  classId: number;

  @Column()
  courseId: number;

  @Column({ default: 0 })
  onlinePercentage: number;

  @Column({ default: 16 })
  totalMeetings: number;

  @Column({ type: 'date', nullable: true })
  startDate: string;

  @Column({ type: 'date', nullable: true })
  endDate: string;

  @Column({
    type: 'int',
    nullable: true,
    comment: '0=Sunday, 1=Monday ... 6=Saturday',
  })
  dayOfWeek: number;

  @Column({ type: 'time', nullable: true })
  scheduledStartTime: string;

  @Column({ type: 'time', nullable: true })
  scheduledEndTime: string;

  @Column({ nullable: true })
  timeslotId: number;

  @ManyToOne(() => Timeslot, { nullable: true })
  @JoinColumn({ name: 'timeslotId' })
  timeslot: Timeslot;

  @ManyToOne(() => Class, (cls) => cls.classCourses, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'classId' })
  class: Class;

  @ManyToOne(() => Course)
  @JoinColumn({ name: 'courseId' })
  course: Course;

  @ManyToMany(() => Room)
  @JoinTable({
    name: 'class_course_rooms',
    joinColumn: { name: 'classCourseId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'roomId', referencedColumnName: 'id' },
  })
  rooms: Room[];

  @OneToMany(() => ClassLecturer, (classLecturer) => classLecturer.classCourse)
  classLecturers: ClassLecturer[];

  @OneToMany(() => ClassSchedule, (classSchedule) => classSchedule.classCourse)
  classSchedules: ClassSchedule[];

  @OneToMany(() => ClassMeeting, (classMeeting) => classMeeting.classCourse)
  classMeetings: ClassMeeting[];

  @OneToMany(
    () => ClassCourseStudent,
    (student: ClassCourseStudent) => student.classCourse,
  )
  classCourseStudents: ClassCourseStudent[];
}
