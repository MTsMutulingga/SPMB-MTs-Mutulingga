
export interface StudentData {
  noUrut: string;
  namaSiswa: string;
  nisLokal: string;
  nisn: string;
  nik: string;
  tempatLahir: string;
  tanggalLahir: string;
  agama: string;
  wargaNegara: string;
  jenisKelamin: string;
  hobi: string;
  anakKe: string;
  jumlahSaudara: string;
  jenisTempatTinggal: string;
  alamat: string;
  propinsi: string;
  kabupaten: string;
  kecamatan: string;
  desaKelurahan: string;
  kodePos: string;
  nomorTelepon: string;
  jarakTempatTinggal: string;
  transportasi: string;
  jarakTempuh: string;
  noKK: string;
  namaKepKeluarga: string;
  
  // Data Ayah
  namaAyah: string;
  nikAyah: string;
  tempatLahirAyah: string;
  tglLahirAyah: string;
  statusAyah: string;
  pekerjaanAyah: string;
  penghasilanAyahPerbulan: string;
  pendidikanAyah: string;
  
  // Data Ibu
  namaIbu: string;
  nikIbu: string;
  tempatLahirIbu: string;
  tglLahirIbu: string;
  statusIbu: string;
  pekerjaanIbu: string;
  penghasilanIbuPerbulan: string;
  pendidikanIbu: string;
  
  // Data Wali
  namaWali: string;
  tahunLahirWali: string;
  nikWali: string;
  pendidikanWali: string;
  pekerjaanWali: string;
  penghasilanWali: string;
  
  // Bantuan & Rumah
  kksKps: string;
  pkh: string;
  pip: string;
  kip: string;
  statusKepemilikanRumahOrangTua: string;
  
  // Alamat Ortu
  alamatOrtu: string;
  propinsiOrtu: string;
  kabupatenOrtu: string;
  kecamatanOrtu: string;
  desaKelurahanOrtu: string;
  kodePosOrtu: string;
  
  // Sekolah Asal
  tahunAjaran: string;
  jenisLembagaJenjang: string;
  statusSekolahAsal: string;
  npsnSekolah: string;
  namaSekolahMadrasah: string;
  lokasiSekolah: string;
  noPesertaUN: string;
  noBlankoSKHU: string;
  noSeriIjazah: string;
  totalNilaiUN: string;
}

export type FormStep = 'personal' | 'address' | 'family' | 'guardian' | 'assistance' | 'school' | 'review';

export interface AppState {
  currentStep: FormStep;
  studentData: Partial<StudentData>;
  errors: Record<string, string>;
  isSubmitting: boolean;
  isFinished: boolean;
  aiAnalysis: string | null;
  allRegistrants: Partial<StudentData>[];
  editingIndex: number | null;
}
