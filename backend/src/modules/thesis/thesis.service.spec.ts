import { BadRequestException } from '@nestjs/common';
import { ThesisService } from './thesis.service';
import { ThesisStatus } from '../../database/entities/thesis-submission.entity';
import { ExamStatus } from '../../database/entities/thesis-exam-schedule.entity';
import { ThesisFlowMode } from '../../database/entities/prodi.entity';

function createRepoMock() {
  return {
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn(),
    count: jest.fn(),
    delete: jest.fn(),
    create: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
}

describe('ThesisService', () => {
  let service: ThesisService;
  const thesisRepo = createRepoMock();
  const supervisorRepo = createRepoMock();
  const examRepo = createRepoMock();
  const examinerRepo = createRepoMock();
  const logRepo = createRepoMock();
  const prodiRepo = createRepoMock();

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ThesisService(
      thesisRepo as any,
      supervisorRepo as any,
      examRepo as any,
      examinerRepo as any,
      logRepo as any,
      prodiRepo as any,
    );
  });

  it('rejects status that is not allowed by flow mode', async () => {
    thesisRepo.findOne.mockResolvedValue({
      id: 1,
      prodiId: 10,
      studentId: 100,
      status: ThesisStatus.THESIS_GUIDANCE,
    });
    prodiRepo.findOne.mockResolvedValue({ id: 10, thesisFlowMode: ThesisFlowMode.B });

    await expect(
      service.updateStatus(1, ThesisStatus.RESULT_PASSED),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects invalid direct jump transition', async () => {
    thesisRepo.findOne.mockResolvedValue({
      id: 2,
      prodiId: 11,
      studentId: 101,
      status: ThesisStatus.SUPERVISOR_ASSIGNED,
    });
    prodiRepo.findOne.mockResolvedValue({ id: 11, thesisFlowMode: ThesisFlowMode.C });

    await expect(
      service.updateStatus(2, ThesisStatus.RESULT_EXAM_SCHEDULED),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('builds history timeline from thesis process records', async () => {
    thesisRepo.findOne.mockResolvedValue({
      id: 3,
      status: ThesisStatus.RESULT_PASSED,
      prodi: { thesisFlowMode: ThesisFlowMode.C },
      title: 'Analisis Sistem',
      createdAt: new Date('2026-01-01T08:00:00.000Z'),
      submittedAt: new Date('2026-01-02T08:00:00.000Z'),
      approvedAt: new Date('2026-01-03T08:00:00.000Z'),
      completedAt: null,
    });
    supervisorRepo.find.mockResolvedValue([
      {
        role: 'PEMBIMBING_1',
        lecturerId: 20,
        lecturer: { name: 'Dosen A' },
        skNumber: 'SK-1',
        assignedAt: new Date('2026-01-04T08:00:00.000Z'),
      },
    ]);
    logRepo.find.mockResolvedValue([
      {
        topic: 'Bab 1',
        date: '2026-01-05',
        lecturer: { name: 'Dosen A' },
        chapter: 'BAB 1',
        status: 'DONE',
        createdAt: new Date('2026-01-05T08:00:00.000Z'),
      },
    ]);
    examRepo.find.mockResolvedValue([
      {
        type: 'SEMINAR_HASIL',
        date: '2026-01-10',
        startTime: '09:00:00',
        endTime: '11:00:00',
        status: ExamStatus.PASSED,
        result: 'Lulus',
        score: 88,
        revisionDeadline: null,
        createdAt: new Date('2026-01-06T08:00:00.000Z'),
        updatedAt: new Date('2026-01-10T12:00:00.000Z'),
      },
    ]);

    const history = await service.getHistory(3);

    expect(history.flowMode).toBe(ThesisFlowMode.C);
    expect(history.timeline.length).toBeGreaterThan(0);
    expect(history.timeline[0].type).toBe('THESIS_CREATED');
    expect(history.timeline.some((e: any) => e.type === 'SUPERVISOR_ASSIGNED')).toBe(true);
    expect(history.timeline.some((e: any) => e.type === 'EXAM_RESULT')).toBe(true);
  });
});

