import XLSX from 'xlsx';
import path from 'path';

function generateLecturerTemplate() {
  const ws = XLSX.utils.json_to_sheet([
    {
      'Nama': 'Zuhair Rifqi',
      'Email': 'zuhair@example.com',
      'NIDN': '0011223344',
      'NIP': '199001012020011001',
      'Gelar Depan': 'Dr.',
      'Gelar Belakang': 'M.Kom',
      'Kode Prodi': 'IF-S1'
    }
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Dosen');
  XLSX.writeFile(wb, 'template-dosen.xlsx');
}

function generateStudentTemplate() {
  const ws = XLSX.utils.json_to_sheet([
    {
      'Nama': 'Budi Santoso',
      'Email': 'budi@example.com',
      'NIM': '2024001',
      'Angkatan': 2024,
      'Status': 'aktif',
      'Kode Prodi': 'IF-S1'
    }
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Mahasiswa');
  XLSX.writeFile(wb, 'template-mahasiswa.xlsx');
}

generateLecturerTemplate();
generateStudentTemplate();
console.log('Templates generated successfully');
