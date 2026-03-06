import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Course } from '../../database/entities/course.entity';
import { Prodi } from '../../database/entities/prodi.entity';
import { BaseCrudService } from '../../common/services/base-crud.service';

@Injectable()
export class CoursesService extends BaseCrudService<Course> {
  constructor(
    @InjectRepository(Course)
    repository: Repository<Course>,
    @InjectRepository(Prodi)
    private readonly prodiRepository: Repository<Prodi>,
  ) {
    super(repository);
  }

  /**
   * Import courses from pre-mapped JSON rows (parsed on the frontend).
   * Each row should have: code, name, sks, semesterDefault, prodiCode
   */
  async importCourses(rows: any[]) {
    const prodis = await this.prodiRepository.find();
    const prodiMap = new Map(prodis.map((p) => [p.code.toLowerCase(), p.id]));

    let total = 0;
    let successful = 0;
    const failed: { row: any; reason: string }[] = [];

    for (const row of rows) {
      total++;
      try {
        const code = row.code?.toString().trim()?.toUpperCase();
        const name = row.name?.toString().trim();
        const sks = parseInt(row.sks, 10);
        const semesterDefault = parseInt(row.semesterDefault, 10) || 1;
        const prodiCode = row.prodiCode?.toString().trim()?.toLowerCase();

        if (!code || !name || isNaN(sks)) {
          failed.push({
            row,
            reason: 'Kolom Kode, Matakuliah, atau SKS kosong/tidak valid.',
          });
          continue;
        }

        // If prodiCode is provided, look it up
        let prodiId: number | undefined;
        if (prodiCode) {
          prodiId = prodiMap.get(prodiCode);
          if (!prodiId) {
            failed.push({
              row,
              reason: `Kode Prodi '${row.prodiCode}' tidak terdaftar di sistem.`,
            });
            continue;
          }
        } else {
          failed.push({
            row,
            reason: 'Kode Prodi kosong.',
          });
          continue;
        }

        // Check if course code already exists
        const existing = await this.repository.findOne({ where: { code } });
        if (existing) {
          failed.push({ row, reason: `Kode Matakuliah '${code}' sudah ada.` });
          continue;
        }

        const newCourse = this.repository.create({
          code,
          name,
          sks,
          semesterDefault,
          prodiId,
        });

        await this.repository.save(newCourse);
        successful++;
      } catch (err: any) {
        failed.push({ row, reason: err.message || 'Error tidak diketahui' });
      }
    }

    return {
      message: 'Proses import selesai',
      total,
      successful,
      failed,
    };
  }
}
