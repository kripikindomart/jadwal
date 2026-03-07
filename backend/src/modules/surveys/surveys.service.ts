import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SurveyInstrument } from '../../database/entities/survey-instrument.entity';
import { SurveyQuestion } from '../../database/entities/survey-question.entity';
import { SurveyResponse } from '../../database/entities/survey-response.entity';
import { SurveyAnswer } from '../../database/entities/survey-answer.entity';
import { Class } from '../../database/entities/class.entity';
import { ClassStudent } from '../../database/entities/class-student.entity';
import {
  CreateInstrumentDto,
  UpdateInstrumentDto,
  CreateQuestionDto,
  UpdateQuestionDto,
  SubmitResponseDto,
} from './dto/survey.dto';

@Injectable()
export class SurveysService {
  constructor(
    @InjectRepository(SurveyInstrument)
    private instrumentRepo: Repository<SurveyInstrument>,
    @InjectRepository(SurveyQuestion)
    private questionRepo: Repository<SurveyQuestion>,
    @InjectRepository(SurveyResponse)
    private responseRepo: Repository<SurveyResponse>,
    @InjectRepository(SurveyAnswer)
    private answerRepo: Repository<SurveyAnswer>,
    @InjectRepository(Class)
    private classRepository: Repository<Class>,
    @InjectRepository(ClassStudent)
    private classStudentRepo: Repository<ClassStudent>,
  ) {}

  // ============ INSTRUMENTS ============

  async findAllInstruments(query: any) {
    const qb = this.instrumentRepo
      .createQueryBuilder('i')
      .leftJoinAndSelect('i.semester', 'semester')
      .loadRelationCountAndMap('i.questionCount', 'i.questions')
      .loadRelationCountAndMap('i.responseCount', 'i.responses');

    if (query.semesterId) {
      qb.andWhere('i.semesterId = :semesterId', {
        semesterId: query.semesterId,
      });
    }
    if (query.isActive !== undefined) {
      qb.andWhere('i.isActive = :isActive', {
        isActive: query.isActive === 'true',
      });
    }

    qb.orderBy('i.createdAt', 'DESC');
    return qb.getMany();
  }

  async findInstrumentById(id: number) {
    const instrument = await this.instrumentRepo.findOne({
      where: { id },
      relations: ['semester', 'questions'],
      order: { questions: { order: 'ASC' } },
    });
    if (!instrument)
      throw new NotFoundException('Instrumen survei tidak ditemukan');
    return instrument;
  }

  async createInstrument(dto: CreateInstrumentDto) {
    const instrument = this.instrumentRepo.create(dto);
    return this.instrumentRepo.save(instrument);
  }

  async updateInstrument(id: number, dto: UpdateInstrumentDto) {
    const instrument = await this.findInstrumentById(id);
    Object.assign(instrument, dto);
    return this.instrumentRepo.save(instrument);
  }

  async deleteInstrument(id: number) {
    const instrument = await this.findInstrumentById(id);
    await this.instrumentRepo.remove(instrument);
    return { message: 'Instrumen survei berhasil dihapus' };
  }

  async duplicateInstrument(id: number) {
    const original = await this.findInstrumentById(id);
    const newInstrument = this.instrumentRepo.create({
      title: `${original.title} (Copy)`,
      description: original.description,
      semesterId: original.semesterId,
      isActive: false,
    });
    const saved = await this.instrumentRepo.save(newInstrument);

    // Duplicate questions
    if (original.questions?.length) {
      const newQuestions = original.questions.map((q) =>
        this.questionRepo.create({
          instrumentId: saved.id,
          text: q.text,
          type: q.type,
          options: q.options,
          order: q.order,
          isRequired: q.isRequired,
        }),
      );
      await this.questionRepo.save(newQuestions);
    }

    return this.findInstrumentById(saved.id);
  }

  // ============ QUESTIONS ============

  async addQuestion(instrumentId: number, dto: CreateQuestionDto) {
    await this.findInstrumentById(instrumentId);

    // Auto-assign order if not provided
    if (dto.order === undefined) {
      const maxOrder = await this.questionRepo
        .createQueryBuilder('q')
        .where('q.instrumentId = :instrumentId', { instrumentId })
        .select('MAX(q.order)', 'max')
        .getRawOne();
      dto.order = (maxOrder?.max || 0) + 1;
    }

    const question = this.questionRepo.create({
      ...dto,
      instrumentId,
    });
    return this.questionRepo.save(question);
  }

  async updateQuestion(questionId: number, dto: UpdateQuestionDto) {
    const question = await this.questionRepo.findOne({
      where: { id: questionId },
    });
    if (!question) throw new NotFoundException('Pertanyaan tidak ditemukan');
    Object.assign(question, dto);
    return this.questionRepo.save(question);
  }

  async deleteQuestion(questionId: number) {
    const question = await this.questionRepo.findOne({
      where: { id: questionId },
    });
    if (!question) throw new NotFoundException('Pertanyaan tidak ditemukan');
    await this.questionRepo.remove(question);
    return { message: 'Pertanyaan berhasil dihapus' };
  }

  async reorderQuestions(instrumentId: number, questionIds: number[]) {
    for (let i = 0; i < questionIds.length; i++) {
      await this.questionRepo.update(
        { id: questionIds[i], instrumentId },
        { order: i + 1 },
      );
    }
    return this.findInstrumentById(instrumentId);
  }

  // ============ RESPONSES ============

  async getMyPendingSurveys(studentId: number) {
    // Find all active instruments and the courses the student is enrolled in
    const instruments = await this.instrumentRepo.find({
      where: { isActive: true },
      relations: ['semester'],
    });

    // For each instrument, find courses the student is enrolled in
    const pendingSurveys: any[] = [];

    for (const instrument of instruments) {
      // Get courses where student is enrolled via class_course_students
      const enrolledCourses = await this.responseRepo.manager
        .createQueryBuilder()
        .select('ccs.classCourseId', 'classCourseId')
        .from('class_course_students', 'ccs')
        .where('ccs.studentId = :studentId', { studentId })
        .getRawMany();

      for (const enrolled of enrolledCourses) {
        // Get lecturers for this course
        const lecturers = await this.responseRepo.manager
          .createQueryBuilder()
          .select(['cl.lecturerId as lecturerId'])
          .from('class_lecturers', 'cl')
          .where('cl.classCourseId = :classCourseId', {
            classCourseId: enrolled.classCourseId,
          })
          .getRawMany();

        for (const lec of lecturers) {
          // Check if already submitted
          const existing = await this.responseRepo.findOne({
            where: {
              instrumentId: instrument.id,
              classCourseId: enrolled.classCourseId,
              studentId,
              lecturerId: lec.lecturerId,
            },
          });

          if (!existing) {
            // Get course and lecturer details
            const courseData = await this.responseRepo.manager
              .createQueryBuilder()
              .select([
                'cc.id',
                'c.name as courseName',
                'cls.name as className',
              ])
              .from('class_courses', 'cc')
              .leftJoin('courses', 'c', 'c.id = cc.courseId')
              .leftJoin('classes', 'cls', 'cls.id = cc.classId')
              .where('cc.id = :id', { id: enrolled.classCourseId })
              .getRawOne();

            const lecturerData = await this.responseRepo.manager
              .createQueryBuilder()
              .select(['u.id', 'u.name', 'lp.fullName'])
              .from('users', 'u')
              .leftJoin('lecturer_profiles', 'lp', 'lp.userId = u.id')
              .where('u.id = :id', { id: lec.lecturerId })
              .getRawOne();

            pendingSurveys.push({
              instrumentId: instrument.id,
              instrumentTitle: instrument.title,
              classCourseId: enrolled.classCourseId,
              courseName: courseData?.courseName || 'Unknown',
              className: courseData?.className || 'Unknown',
              lecturerId: lec.lecturerId,
              lecturerName:
                lecturerData?.fullName || lecturerData?.name || 'Unknown',
            });
          }
        }
      }
    }

    return pendingSurveys;
  }

  async getFormData(
    instrumentId: number,
    classCourseId: number,
    lecturerId: number,
  ) {
    const instrument = await this.findInstrumentById(instrumentId);

    // Get course info
    const courseData = await this.responseRepo.manager
      .createQueryBuilder()
      .select(['cc.id', 'c.name as courseName', 'cls.name as className'])
      .from('class_courses', 'cc')
      .leftJoin('courses', 'c', 'c.id = cc.courseId')
      .leftJoin('classes', 'cls', 'cls.id = cc.classId')
      .where('cc.id = :id', { id: classCourseId })
      .getRawOne();

    // Get lecturer info
    const lecturerData = await this.responseRepo.manager
      .createQueryBuilder()
      .select(['u.id', 'u.name', 'lp.fullName'])
      .from('users', 'u')
      .leftJoin('lecturer_profiles', 'lp', 'lp.userId = u.id')
      .where('u.id = :id', { id: lecturerId })
      .getRawOne();

    return {
      instrument,
      course: {
        id: classCourseId,
        name: courseData?.courseName || 'Unknown',
        className: courseData?.className || 'Unknown',
      },
      lecturer: {
        id: lecturerId,
        name: lecturerData?.fullName || lecturerData?.name || 'Unknown',
      },
    };
  }

  async submitResponse(
    instrumentId: number,
    studentId: number,
    dto: SubmitResponseDto,
  ) {
    // Check if already submitted
    const existing = await this.responseRepo.findOne({
      where: {
        instrumentId,
        classCourseId: dto.classCourseId,
        studentId,
        lecturerId: dto.lecturerId,
      },
    });

    if (existing) {
      throw new ConflictException(
        'Anda sudah mengisi survei untuk dosen ini pada matakuliah ini',
      );
    }

    // Create response with answers
    const response = this.responseRepo.create({
      instrumentId,
      classCourseId: dto.classCourseId,
      studentId,
      lecturerId: dto.lecturerId,
      answers: dto.answers.map((a) =>
        this.answerRepo.create({
          questionId: a.questionId,
          value: a.value,
        }),
      ),
    });

    return this.responseRepo.save(response);
  }

  // ============ RESULTS ============

  async getResults(instrumentId: number, query: any) {
    const instrument = await this.findInstrumentById(instrumentId);

    const responsesQb = this.responseRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.student', 'student')
      .leftJoinAndSelect('student.studentProfile', 'studentProfile')
      .leftJoinAndSelect('r.lecturer', 'lecturer')
      .leftJoinAndSelect('lecturer.lecturerProfile', 'lecturerProfile')
      .leftJoinAndSelect('r.classCourse', 'classCourse')
      .leftJoinAndSelect('classCourse.class', 'cClass')
      .leftJoinAndSelect('classCourse.course', 'course')
      .leftJoinAndSelect('r.answers', 'answers')
      .leftJoinAndSelect('answers.question', 'question')
      .where('r.instrumentId = :instrumentId', { instrumentId });

    if (query.classId) {
      responsesQb.andWhere('classCourse.classId = :classId', {
        classId: query.classId,
      });
    }

    if (query.prodiId) {
      responsesQb.andWhere('cClass.prodiId = :prodiId', {
        prodiId: query.prodiId,
      });
    }

    if (query.lecturerId) {
      responsesQb.andWhere('r.lecturerId = :lecturerId', {
        lecturerId: query.lecturerId,
      });
    }

    responsesQb.orderBy('r.submittedAt', 'DESC');

    const responses = await responsesQb.getMany();

    // Aggregate by question
    const questionStats = instrument.questions.map((q) => {
      const answers = responses.flatMap((r) =>
        r.answers.filter((a) => a.questionId === q.id),
      );

      if (q.type === 'likert') {
        const values = answers
          .map((a) => parseInt(a.value))
          .filter((v) => !isNaN(v));
        const avg = values.length
          ? values.reduce((sum, v) => sum + v, 0) / values.length
          : 0;
        const distribution: Record<string, number> = {};
        for (let i = 1; i <= 5; i++) {
          distribution[i.toString()] = values.filter((v) => v === i).length;
        }
        return {
          question: q,
          totalAnswers: values.length,
          average: Math.round(avg * 100) / 100,
          distribution,
        };
      }

      if (q.type === 'multiple_choice') {
        const distribution: Record<string, number> = {};
        for (const a of answers) {
          distribution[a.value] = (distribution[a.value] || 0) + 1;
        }
        return {
          question: q,
          totalAnswers: answers.length,
          distribution,
        };
      }

      // text type
      return {
        question: q,
        totalAnswers: answers.length,
        responses: answers.map((a) => a.value),
      };
    });

    // Aggregate by lecturer
    const lecturerMap = new Map<number, any>();
    for (const r of responses) {
      if (!lecturerMap.has(r.lecturerId)) {
        lecturerMap.set(r.lecturerId, {
          lecturerId: r.lecturerId,
          lecturerName: (r.lecturer as any)?.name || 'Unknown',
          responseCount: 0,
          averageScore: 0,
          totalScore: 0,
        });
      }
      const lecData = lecturerMap.get(r.lecturerId);
      lecData.responseCount++;
      // Calculate avg of likert answers
      const likertAnswers = r.answers
        .filter((a) => a.question?.type === 'likert')
        .map((a) => parseInt(a.value))
        .filter((v) => !isNaN(v));
      if (likertAnswers.length) {
        lecData.totalScore +=
          likertAnswers.reduce((s, v) => s + v, 0) / likertAnswers.length;
      }
    }

    for (const [, data] of lecturerMap) {
      data.averageScore = data.responseCount
        ? Math.round((data.totalScore / data.responseCount) * 100) / 100
        : 0;
      delete data.totalScore;
    }

    // 3. Format the data for the frontend spreadsheet view
    const formattedResults = responses.map((r) => {
      // Map answers by questionId
      const mappedAnswers: Record<number, any> = {};
      r.answers.forEach((ans) => {
        mappedAnswers[ans.questionId] = {
          value: ans.value,
          text: ans.question.text,
          type: ans.question.type,
        };
      });

      // Construct Lecturer Full Name
      const lp = r.lecturer?.lecturerProfile;
      const frontTitle = lp?.frontTitle ? lp.frontTitle + ' ' : '';
      const backTitle = lp?.backTitle ? ', ' + lp.backTitle : '';
      const lecturerName = r.lecturer?.name
        ? frontTitle + r.lecturer.name + backTitle
        : 'Unknown';

      return {
        id: r.id,
        submittedAt: r.submittedAt,
        studentName: r.student?.name,
        studentNim: r.student?.studentProfile?.nim,
        className: r.classCourse?.class?.name,
        courseName: r.classCourse?.course?.name,
        lecturerName: lecturerName,
        answers: mappedAnswers,
      };
    });

    return {
      instrument: {
        id: instrument.id,
        title: instrument.title,
        description: instrument.description || null,
        publicUrlHash: (instrument as any).publicUrlHash || null,
        questions: instrument.questions.map((q) => ({
          id: q.id,
          text: q.text,
          type: q.type,
          order: q.order,
        })),
      },
      totalResponses: responses.length,
      questionStats,
      lecturerSummary: Array.from(lecturerMap.values()),
      spreadsheetData: formattedResults,
    };
  }

  async getPublicResults(hash: string, query: any) {
    const instrument = await this.getPublicInstrumentDetails(hash);
    return this.getResults(instrument.id, query);
  }

  async getPublicRespondents(hash: string, query: any) {
    const instrument = await this.getPublicInstrumentDetails(hash);
    return this.getRespondents(instrument.id, query);
  }

  // ============ RESPONDENT TRACKING ============

  async getRespondents(instrumentId: number, query: any) {
    // 1. Get all responses for this instrument grouped by class
    const responsesQb = this.responseRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.student', 'student')
      .leftJoinAndSelect('student.studentProfile', 'sp')
      .leftJoinAndSelect('r.lecturer', 'lecturer')
      .leftJoinAndSelect('lecturer.lecturerProfile', 'lp')
      .leftJoinAndSelect('r.classCourse', 'cc')
      .leftJoinAndSelect('cc.class', 'cls')
      .leftJoinAndSelect('cc.course', 'course')
      .where('r.instrumentId = :instrumentId', { instrumentId });

    if (query.prodiId) {
      responsesQb.andWhere('cls.prodiId = :prodiId', {
        prodiId: query.prodiId,
      });
    }

    const responses = await responsesQb
      .orderBy('r.submittedAt', 'DESC')
      .getMany();

    // 2. Collect unique classIds from responses
    const classIds = [
      ...new Set(responses.map((r) => r.classCourse?.classId).filter(Boolean)),
    ];

    // 3. For each class, get all registered students
    const classesData: any[] = [];
    for (const classId of classIds) {
      const classEntity = await this.classRepository.findOne({
        where: { id: classId },
        relations: ['prodi'],
      });
      if (!classEntity) continue;

      // Get all students in this class
      // Get all unique students taking courses in this class
      const classStudentsRaw = await this.responseRepo.manager
        .createQueryBuilder()
        .select(['u.id as studentId', 'u.name as studentName', 'sp.nim'])
        .from('users', 'u')
        .leftJoin('student_profiles', 'sp', 'sp.userId = u.id')
        .innerJoin('class_course_students', 'ccs', 'ccs.studentId = u.id')
        .innerJoin('class_courses', 'cc', 'cc.id = ccs.classCourseId')
        .where('cc.classId = :classId', { classId })
        .groupBy('u.id')
        .addGroupBy('u.name')
        .addGroupBy('sp.nim')
        .getRawMany();

      const classStudents = classStudentsRaw.map((s) => ({
        studentId: s.studentid || s.studentId,
        studentName: s.studentname || s.studentName,
        nim: s.sp_nim || '-',
      }));

      // Get responses for this class
      const classResponses = responses.filter(
        (r) => r.classCourse?.classId === classId,
      );

      // Map student status
      const studentList = classStudents.map((cs) => {
        const studentResponses = classResponses.filter(
          (r) => r.studentId === cs.studentId,
        );
        return {
          studentId: cs.studentId,
          studentName: cs.studentName || 'Unknown',
          nim: cs.nim,
          totalResponses: studentResponses.length,
          filled: studentResponses.length > 0,
          responses: studentResponses.map((r) => ({
            responseId: r.id,
            courseName: r.classCourse?.course?.name || '-',
            lecturerName: r.lecturer?.name || '-',
            submittedAt: r.submittedAt,
          })),
        };
      });

      // Sort: unfilled first, then by name
      studentList.sort((a, b) => {
        if (a.filled !== b.filled) return a.filled ? 1 : -1;
        return a.studentName.localeCompare(b.studentName);
      });

      classesData.push({
        classId,
        className: classEntity.name,
        prodiName: (classEntity as any).prodi?.name || '-',
        totalStudents: classStudents.length,
        filledCount: studentList.filter((s) => s.filled).length,
        students: studentList,
      });
    }

    return { classes: classesData };
  }

  async deleteResponse(instrumentId: number, responseId: number) {
    const response = await this.responseRepo.findOne({
      where: { id: responseId, instrumentId },
    });
    if (!response) {
      throw new NotFoundException('Response tidak ditemukan');
    }

    // Delete answers first, then response
    await this.answerRepo.delete({ responseId });
    await this.responseRepo.delete(responseId);

    return { message: 'Response berhasil dihapus/direset' };
  }

  // ============ PUBLIC EVALUATION ============

  async getPublicInstrumentDetails(hash: string) {
    const numericId = isNaN(Number(hash)) ? 0 : Number(hash);
    const instrument = await this.instrumentRepo.findOne({
      where: [
        { publicUrlHash: hash, isActive: true },
        { id: numericId, isActive: true },
      ],
      relations: ['semester', 'questions'],
      order: { questions: { order: 'ASC' } },
    });
    if (!instrument)
      throw new NotFoundException('Instrumen tidak ditemukan atau tidak aktif');
    return instrument;
  }

  async getPublicStudyPrograms(hash: string) {
    await this.getPublicInstrumentDetails(hash);
    const results = await this.responseRepo.manager
      .createQueryBuilder()
      .select(['p.id', 'p.name', 'p.code'])
      .from('prodis', 'p')
      .orderBy('p.name', 'ASC')
      .getRawMany();

    return results.map((p) => ({
      id: p.p_id || p.id,
      name: p.p_name || p.name,
      code: p.p_code || p.code,
    }));
  }

  async getPublicClasses(hash: string, prodiId: number) {
    const instrument = await this.getPublicInstrumentDetails(hash);
    const classes = await this.classRepository.find({
      select: ['id', 'name'],
      where: {
        prodiId: prodiId,
        semesterId: instrument.semesterId,
      },
      order: {
        name: 'ASC',
      },
    });

    return classes;
  }

  async getPublicClassCourses(classId: number) {
    const courses = await this.responseRepo.manager
      .createQueryBuilder()
      .select(['cc.id', 'c.name as courseName', 'c.code as courseCode'])
      .from('class_courses', 'cc')
      .leftJoin('courses', 'c', 'c.id = cc.courseId')
      .where('cc.classId = :classId', { classId })
      .orderBy('c.name', 'ASC')
      .getRawMany();

    const mappedCourses = courses.map((c) => ({
      id: c.cc_id,
      courseName: c.coursename || c.courseName, // postgres makes aliases lowercase sometimes depending on quoting
      courseCode: c.coursecode || c.courseCode,
      lecturers: [] as any[],
    }));

    for (const course of mappedCourses) {
      const lecturers = await this.responseRepo.manager
        .createQueryBuilder()
        .select(['u.id', 'u.name', 'lp.frontTitle', 'lp.backTitle', 'lp.nidn'])
        .from('class_lecturers', 'cl')
        .leftJoin('users', 'u', 'u.id = cl.lecturerId')
        .leftJoin('lecturer_profiles', 'lp', 'lp.userId = u.id')
        .where('cl.classCourseId = :ccId', { ccId: course.id })
        .getRawMany();

      course.lecturers = lecturers.map((l) => {
        const front = l.lp_fronttitle || l.lp_frontTitle || '';
        const back = l.lp_backtitle || l.lp_backTitle || '';
        const uName = l.u_name || 'Unknown';
        const fullName = [front, uName, back].filter(Boolean).join(' ');

        return {
          id: l.u_id,
          name: fullName,
          nidn: l.lp_nidn,
        };
      });
    }
    return mappedCourses;
  }

  async getPublicStudents(classCourseId: number) {
    const students = await this.responseRepo.manager
      .createQueryBuilder()
      .select(['u.id', 'u.name', 'sp.nim'])
      .from('class_course_students', 'ccs')
      .leftJoin('users', 'u', 'u.id = ccs.studentId')
      .leftJoin('student_profiles', 'sp', 'sp.userId = u.id')
      .where('ccs.classCourseId = :ccId', { ccId: classCourseId })
      .orderBy('u.name', 'ASC')
      .getRawMany();

    return students.map((s) => ({
      ...s,
      displayName: `${s.sp_nim || ''} - ${s.u_name || ''}`.replace(/^ - /, ''),
      id: s.u_id,
      name: s.u_name,
      nim: s.sp_nim,
    }));
  }

  async getPublicClassStudents(classId: number) {
    const students = await this.responseRepo.manager
      .createQueryBuilder()
      .select(['u.id', 'u.name', 'sp.nim'])
      .from('users', 'u')
      .leftJoin('student_profiles', 'sp', 'sp.userId = u.id')
      .innerJoin('class_course_students', 'ccs', 'ccs.studentId = u.id')
      .innerJoin('class_courses', 'cc', 'cc.id = ccs.classCourseId')
      .where('cc.classId = :classId', { classId })
      .groupBy('u.id') // Ensure distinct students
      .addGroupBy('u.name')
      .addGroupBy('sp.nim')
      .orderBy('u.name', 'ASC')
      .getRawMany();

    return students.map((s) => ({
      id: s.u_id,
      name: s.u_name,
      nim: s.sp_nim,
      displayName: `${s.sp_nim || ''} - ${s.u_name || ''}`.replace(/^ - /, ''),
    }));
  }

  async getPublicStudentClassCourses(classId: number, studentId: number) {
    // 1. Get all courses the student is enrolled in for this specific class
    const courses = await this.responseRepo.manager
      .createQueryBuilder()
      .select(['cc.id', 'c.name as courseName', 'c.code as courseCode'])
      .from('class_courses', 'cc')
      .innerJoin('class_course_students', 'ccs', 'ccs.classCourseId = cc.id')
      .leftJoin('courses', 'c', 'c.id = cc.courseId')
      .where('cc.classId = :classId', { classId })
      .andWhere('ccs.studentId = :studentId', { studentId })
      .orderBy('c.name', 'ASC')
      .getRawMany();

    const mappedCourses = courses.map((c) => ({
      id: c.cc_id,
      courseName: c.coursename || c.courseName, // Handling postgres alias casing
      courseCode: c.coursecode || c.courseCode,
      lecturers: [] as any[],
    }));

    // 2. Fetch lecturers for these specific courses
    for (const course of mappedCourses) {
      const lecturers = await this.responseRepo.manager
        .createQueryBuilder()
        .select(['u.id', 'u.name', 'lp.frontTitle', 'lp.backTitle', 'lp.nidn'])
        .from('class_lecturers', 'cl')
        .leftJoin('users', 'u', 'u.id = cl.lecturerId')
        .leftJoin('lecturer_profiles', 'lp', 'lp.userId = u.id')
        .where('cl.classCourseId = :ccId', { ccId: course.id })
        .getRawMany();

      course.lecturers = lecturers.map((l) => {
        const front = l.lp_fronttitle || l.lp_frontTitle || '';
        const back = l.lp_backtitle || l.lp_backTitle || '';
        const uName = l.u_name || 'Unknown';
        const fullName = [front, uName, back].filter(Boolean).join(' ');

        return {
          id: l.u_id,
          name: fullName,
          nidn: l.lp_nidn,
        };
      });
    }
    return mappedCourses;
  }

  async submitPublicResponse(hash: string, dto: any) {
    // any type used temporarily, avoiding extra imports here
    const instrument = await this.getPublicInstrumentDetails(hash);

    const responsesToSave = [];

    // dto expects: { studentId: number, evaluations: [{ classCourseId, lecturerId, answers: [...] }] }
    for (const evalData of dto.evaluations) {
      // Check if already submitted
      const existing = await this.responseRepo.findOne({
        where: {
          instrumentId: instrument.id,
          classCourseId: evalData.classCourseId,
          studentId: dto.studentId,
          lecturerId: evalData.lecturerId,
        },
      });

      if (existing) {
        throw new ConflictException(
          'Anda sudah mengisi survei untuk salah satu dosen pada matakuliah ini',
        );
      }

      const response = this.responseRepo.create({
        instrumentId: instrument.id,
        classCourseId: evalData.classCourseId,
        studentId: dto.studentId,
        lecturerId: evalData.lecturerId,
        answers: evalData.answers.map((a: any) =>
          this.answerRepo.create({
            questionId: a.questionId,
            value: a.value,
          }),
        ),
      });

      responsesToSave.push(response);
    }

    return this.responseRepo.save(responsesToSave);
  }
}
