
import React, { useState, useEffect, useRef } from 'react';
import { StudentData, FormStep, AppState } from './types';
import FormStepIndicator from './components/FormStepIndicator';
import { analyzeStudentProfile } from './services/geminiService';
import { Icons } from './constants';

const INITIAL_DATA: Partial<StudentData> = {
  agama: 'Islam',
  wargaNegara: 'WNI',
  tahunAjaran: '2024/2025',
  jenisKelamin: 'Laki-laki',
  propinsi: 'Jawa Tengah',
  kabupaten: 'Purbalingga',
  jarakTempatTinggal: 'Kurang dari 1 km',
  transportasi: 'Jalan Kaki',
  statusSekolahAsal: 'Negeri',
  jenisLembagaJenjang: 'SD'
};

const App: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem('mts_pendaftaran_db');
    const allRegistrants = saved ? JSON.parse(saved) : [];
    return {
      currentStep: 'personal',
      studentData: { ...INITIAL_DATA, noUrut: (allRegistrants.length + 1).toString() },
      errors: {},
      isSubmitting: false,
      isFinished: false,
      aiAnalysis: null,
      allRegistrants: allRegistrants,
      editingIndex: null
    };
  });

  useEffect(() => {
    localStorage.setItem('mts_pendaftaran_db', JSON.stringify(state.allRegistrants));
  }, [state.allRegistrants]);

  const validateField = (field: keyof StudentData, value: string): string => {
    if (!value || value.trim() === '') {
      const requiredFields: (keyof StudentData)[] = [
        'namaSiswa', 'nisn', 'nik', 'tempatLahir', 'tanggalLahir', 
        'alamat', 'nomorTelepon', 'noKK', 'namaKepKeluarga',
        'namaAyah', 'namaIbu', 'namaSekolahMadrasah'
      ];
      if (requiredFields.includes(field)) return 'Bidang ini wajib diisi';
    }

    // Numeric validations
    const numericFields = ['nisn', 'nik', 'nikAyah', 'nikIbu', 'noKK', 'kodePos', 'npsnSekolah'];
    if (numericFields.includes(field as string) && value && !/^\d+$/.test(value)) {
      return 'Hanya boleh berisi angka';
    }

    if (field === 'nisn' && value && value.length !== 10) return 'NISN harus 10 digit';
    if ((field === 'nik' || field === 'nikAyah' || field === 'nikIbu' || field === 'noKK') && value && value.length !== 16) {
      return 'NIK/No KK harus 16 digit';
    }
    if (field === 'nomorTelepon' && value && (value.length < 10 || value.length > 15)) {
      return 'Nomor HP tidak valid (10-15 digit)';
    }

    return '';
  };

  const updateData = (fields: Partial<StudentData>) => {
    const newErrors = { ...state.errors };
    
    Object.keys(fields).forEach((key) => {
      const field = key as keyof StudentData;
      const error = validateField(field, fields[field] as string);
      if (error) newErrors[field] = error;
      else delete newErrors[field];
    });

    setState(prev => ({
      ...prev,
      studentData: { ...prev.studentData, ...fields },
      errors: newErrors
    }));
  };

  const validateStep = (step: FormStep): boolean => {
    const stepFields: Record<FormStep, (keyof StudentData)[]> = {
      personal: ['namaSiswa', 'nisn', 'nik', 'tempatLahir', 'tanggalLahir'],
      address: ['alamat', 'nomorTelepon'],
      family: ['noKK', 'namaKepKeluarga', 'namaAyah', 'namaIbu'],
      guardian: [],
      assistance: [],
      school: ['namaSekolahMadrasah'],
      review: []
    };

    const currentFields = stepFields[step];
    const newErrors = { ...state.errors };
    let isValid = true;

    currentFields.forEach(field => {
      const value = (state.studentData[field] as string) || '';
      const error = validateField(field, value);
      if (error) {
        newErrors[field] = error;
        isValid = false;
      }
    });

    if (!isValid) {
      setState(prev => ({ ...prev, errors: newErrors }));
      alert('Mohon lengkapi data wajib dengan benar sebelum melanjutkan.');
    }

    return isValid;
  };

  const nextStep = (next: FormStep) => {
    if (validateStep(state.currentStep)) {
      setState(prev => ({ ...prev, currentStep: next }));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const startNewInput = () => {
    setState(prev => ({
      ...prev,
      currentStep: 'personal',
      isFinished: false,
      aiAnalysis: null,
      editingIndex: null,
      errors: {},
      studentData: { 
        ...INITIAL_DATA, 
        noUrut: (prev.allRegistrants.length + 1).toString() 
      }
    }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEdit = (index: number) => {
    const dataToEdit = state.allRegistrants[index];
    setState(prev => ({
      ...prev,
      studentData: { ...dataToEdit },
      currentStep: 'personal',
      isFinished: false,
      editingIndex: index,
      errors: {}
    }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (index: number) => {
    if (window.confirm(`Hapus data pendaftar "${state.allRegistrants[index].namaSiswa}"?`)) {
      setState(prev => {
        const newList = prev.allRegistrants.filter((_, i) => i !== index);
        const updatedList = newList.map((item, i) => ({ 
          ...item, 
          noUrut: (i + 1).toString() 
        }));
        
        return { 
          ...prev, 
          allRegistrants: updatedList,
          editingIndex: null,
          studentData: prev.editingIndex === index ? { ...INITIAL_DATA, noUrut: (updatedList.length + 1).toString() } : prev.studentData
        };
      });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const exportBackupJSON = () => {
    const dataStr = JSON.stringify(state.allRegistrants, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `BACKUP_DB_MTSM01_${new Date().toISOString().split('T')[0]}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const importBackupJSON = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        if (Array.isArray(json)) {
          if (confirm(`Impor ${json.length} data siswa? Ini akan menggantikan database saat ini.`)) {
            setState(prev => ({
              ...prev,
              allRegistrants: json,
              studentData: { ...INITIAL_DATA, noUrut: (json.length + 1).toString() }
            }));
          }
        }
      } catch (err) {
        alert('Format file tidak valid!');
      }
    };
    reader.readAsText(file);
  };

  const downloadExcel = (data: Partial<StudentData>[]) => {
    if (data.length === 0) return alert('Database masih kosong!');
    const headers = [
      "No", "Nama Siswa", "NIS Lokal", "NISN", "NIK", "Tempat Lahir", "Tanggal Lahir", "Agama", "Warga Negara", 
      "Jenis Kelamin", "Hobi", "Anak Ke", "Jumlah Saudara", "Jenis Tempat Tinggal", "Alamat", "Propinsi", "Kabupaten", 
      "Kecamatan", "Desa/Kelurahan", "Kode Pos", "Nomor Telepon", "Jarak Tempat Tinggal", "Transportasi", "Jarak Tempuh", 
      "No. KK", "Nama Kep. Keluarga", "Nama Ayah", "NIK Ayah", "Tempat Lahir Ayah", "Tgl Lahir Ayah", "Status Ayah", 
      "Pekerjaan Ayah", "Penghasilan Ayah Perbulan", "Pendidikan Ayah", "Nama Ibu", "NIK Ibu", "Tempat Lahir Ibu", 
      "Tgl Lahir Ibu", "Status Ibu", "Pekerjaan Ibu", "Penghasilan Ibu Perbulan", "Pendidikan Ibu", "Nama Wali", 
      "Tahun Lahir Wali", "NIK Wali", "Pendidikan Wali", "Pekerjaan Wali", "Penghasilan Wali", "KKS/KPS", "PKH", 
      "PIP", "KIP", "Status Kepemilikan Rumah Orang Tua", "Alamat Ortu", "Propinsi Ortu", "Kabupaten Ortu", 
      "Kecamatan Ortu", "Desa/Kelurahan Ortu", "Kode Pos Ortu", "Tahun Ajaran", "Jenis Lembaga Jenjang", 
      "Status Sekolah", "NPSN Sekolah", "Nama Sekolah/Madrasah", "Lokasi Sekolah", "No. Peserta UN", 
      "No. Blanko SKHU", "No. Seri Ijazah", "Total Nilai UN"
    ];
    const rows = data.map((s) => [
      s.noUrut, s.namaSiswa, s.nisLokal, s.nisn, s.nik, s.tempatLahir, s.tanggalLahir, s.agama, s.wargaNegara,
      s.jenisKelamin, s.hobi, s.anakKe, s.jumlahSaudara, s.jenisTempatTinggal, s.alamat, s.propinsi, s.kabupaten,
      s.kecamatan, s.desaKelurahan, s.kodePos, s.nomorTelepon, s.jarakTempatTinggal, s.transportasi, s.jarakTempuh,
      s.noKK, s.namaKepKeluarga, s.namaAyah, s.nikAyah, s.tempatLahirAyah, s.tglLahirAyah, s.statusAyah,
      s.pekerjaanAyah, s.penghasilanAyahPerbulan, s.pendidikanAyah, s.namaIbu, s.nikIbu, s.tempatLahirIbu,
      s.tglLahirIbu, s.statusIbu, s.pekerjaanIbu, s.penghasilanIbuPerbulan, s.pendidikanIbu, s.namaWali,
      s.tahunLahirWali, s.nikWali, s.pendidikanWali, s.pekerjaanWali, s.penghasilanWali, s.kksKps, s.pkh,
      s.pip, s.kip, s.statusKepemilikanRumahOrangTua, s.alamatOrtu, s.propinsiOrtu, s.kabupatenOrtu,
      s.kecamatanOrtu, s.desaKelurahanOrtu, s.kodePosOrtu, s.tahunAjaran, s.jenisLembagaJenjang,
      s.statusSekolahAsal, s.npsnSekolah, s.namaSekolahMadrasah, s.lokasiSekolah, s.noPesertaUN,
      s.noBlankoSKHU, s.noSeriIjazah, s.totalNilaiUN
    ]);
    const ws = (window as any).XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = (window as any).XLSX.utils.book_new();
    (window as any).XLSX.utils.book_append_sheet(wb, ws, "Database EMIS");
    (window as any).XLSX.writeFile(wb, `EMIS_MTsM01_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleSubmit = async () => {
    if (!validateStep('school')) return;

    setState(prev => ({ ...prev, isSubmitting: true }));
    let analysis = state.aiAnalysis;
    const isNewName = state.studentData.namaSiswa !== state.allRegistrants[state.editingIndex ?? -1]?.namaSiswa;
    if (isNewName || !analysis) {
        analysis = await analyzeStudentProfile(state.studentData);
    }
    
    setState(prev => {
      const updatedRegistrants = [...prev.allRegistrants];
      if (prev.editingIndex !== null) {
        updatedRegistrants[prev.editingIndex] = prev.studentData;
      } else {
        updatedRegistrants.push(prev.studentData);
      }
      return { 
        ...prev, 
        isSubmitting: false, 
        isFinished: true,
        aiAnalysis: analysis,
        allRegistrants: updatedRegistrants
      };
    });
  };

  const renderInput = (label: string, field: keyof StudentData, type: string = "text") => {
    const error = state.errors[field];
    return (
      <div className="mb-4">
        <label className="block text-slate-500 text-[10px] font-black mb-1 uppercase tracking-wider flex justify-between items-center">
          <span>{label}</span>
          {error && <span className="text-red-500 lowercase font-bold">{error}</span>}
        </label>
        <input
          type={type}
          className={`w-full bg-slate-900/50 border ${error ? 'border-red-500 ring-1 ring-red-500/20' : 'border-slate-800'} text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 ${error ? 'focus:ring-red-500' : 'focus:ring-maroon'} focus:border-transparent transition-all`}
          value={(state.studentData[field] as string) || ''}
          onChange={(e) => updateData({ [field]: e.target.value })}
        />
      </div>
    );
  };

  const renderSelect = (label: string, field: keyof StudentData, options: string[]) => {
    const error = state.errors[field];
    return (
      <div className="mb-4">
        <label className="block text-slate-500 text-[10px] font-black mb-1 uppercase tracking-wider flex justify-between items-center">
          <span>{label}</span>
          {error && <span className="text-red-500 lowercase font-bold">{error}</span>}
        </label>
        <select
          className={`w-full bg-slate-900/50 border ${error ? 'border-red-500' : 'border-slate-800'} text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 ${error ? 'focus:ring-red-500' : 'focus:ring-maroon'} transition-all`}
          value={(state.studentData[field] as string) || ''}
          onChange={(e) => updateData({ [field]: e.target.value })}
        >
          {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      </div>
    );
  };

  const renderPersonal = () => (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-black flex items-center gap-2 text-white">
          <span className="w-1 h-6 bg-maroon rounded-full"></span> Identitas Siswa
        </h3>
        <div className="flex items-center gap-2">
           <span className="bg-slate-900 text-slate-400 text-[9px] font-bold px-3 py-1 rounded-full border border-slate-800 flex items-center gap-1">
             <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> DB CONNECTED
           </span>
           <span className="bg-maroon/20 text-maroon text-[10px] font-black px-3 py-1 rounded-full border border-maroon/30">
             NO URUT: {state.studentData.noUrut}
           </span>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-4">
        {renderInput("Nama Lengkap *", "namaSiswa")}
        {renderInput("NISN *", "nisn")}
        {renderInput("NIK (16 Digit) *", "nik")}
        {renderInput("NIS Lokal", "nisLokal")}
        {renderInput("Tempat Lahir *", "tempatLahir")}
        {renderInput("Tanggal Lahir *", "tanggalLahir", "date")}
        {renderSelect("Agama", "agama", ["Islam", "Kristen", "Katolik", "Hindu", "Buddha"])}
        {renderSelect("Jenis Kelamin", "jenisKelamin", ["Laki-laki", "Perempuan"])}
        {renderInput("Hobi", "hobi")}
        {renderInput("Anak Ke", "anakKe", "number")}
        {renderInput("Jumlah Saudara", "jumlahSaudara", "number")}
        {renderInput("Warga Negara", "wargaNegara")}
      </div>
      <button onClick={() => nextStep('address')} className="w-full mt-6 maroon-gradient text-white py-3 rounded-xl font-black uppercase text-sm tracking-widest shadow-lg shadow-maroon/20">Selanjutnya</button>
    </div>
  );

  const renderAddress = () => (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      <h3 className="text-xl font-black mb-4 flex items-center gap-2 text-white">
        <span className="w-1 h-6 bg-maroon rounded-full"></span> Domisili & Transport
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-4">
        <div className="lg:col-span-3">{renderInput("Alamat Jalan/Dukuh *", "alamat")}</div>
        {renderInput("Propinsi", "propinsi")}
        {renderInput("Kabupaten", "kabupaten")}
        {renderInput("Kecamatan", "kecamatan")}
        {renderInput("Desa / Kelurahan", "desaKelurahan")}
        {renderInput("Kode Pos", "kodePos")}
        {renderInput("Nomor HP Aktif *", "nomorTelepon")}
        {renderSelect("Transportasi", "transportasi", ["Jalan Kaki", "Sepeda", "Motor", "Antar Jemput", "Angkutan Umum"])}
        {renderSelect("Jarak ke Madrasah", "jarakTempatTinggal", ["Kurang dari 1 km", "Lebih dari 1 km"])}
        {renderInput("Waktu Tempuh (Menit)", "jarakTempuh")}
        {renderSelect("Tempat Tinggal", "jenisTempatTinggal", ["Bersama Orang Tua", "Wali", "Kos", "Asrama"])}
      </div>
      <div className="flex gap-4 mt-6">
        <button onClick={() => setState(prev => ({ ...prev, currentStep: 'personal' }))} className="flex-1 bg-slate-800 text-slate-300 py-3 rounded-xl font-bold uppercase text-xs">Kembali</button>
        <button onClick={() => nextStep('family')} className="flex-[2] maroon-gradient text-white py-3 rounded-xl font-black uppercase text-sm">Lanjut ke Ortu</button>
      </div>
    </div>
  );

  const renderFamily = () => (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      <h3 className="text-xl font-black mb-4 flex items-center gap-2 text-white">
        <span className="w-1 h-6 bg-maroon rounded-full"></span> Data Orang Tua & KK
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-4 mb-6">
        {renderInput("Nomor Kartu Keluarga (KK) *", "noKK")}
        {renderInput("Nama Kepala Keluarga *", "namaKepKeluarga")}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="glass p-4 rounded-2xl">
          <h4 className="text-maroon font-black text-xs uppercase mb-3 border-b border-maroon/10 pb-1">Profil Ayah</h4>
          {renderInput("Nama Ayah *", "namaAyah")}
          {renderInput("NIK Ayah", "nikAyah")}
          {renderInput("Pekerjaan", "pekerjaanAyah")}
          {renderSelect("Pendidikan", "pendidikanAyah", ["SD", "SMP", "SMA", "D3", "S1", "S2"])}
          {renderInput("Penghasilan / Bulan", "penghasilanAyahPerbulan")}
        </div>
        <div className="glass p-4 rounded-2xl">
          <h4 className="text-maroon font-black text-xs uppercase mb-3 border-b border-maroon/10 pb-1">Profil Ibu</h4>
          {renderInput("Nama Ibu *", "namaIbu")}
          {renderInput("NIK Ibu", "nikIbu")}
          {renderInput("Pekerjaan", "pekerjaanIbu")}
          {renderSelect("Pendidikan", "pendidikanIbu", ["SD", "SMP", "SMA", "D3", "S1", "S2"])}
          {renderInput("Penghasilan / Bulan", "penghasilanIbuPerbulan")}
        </div>
      </div>
      <div className="flex gap-4 mt-6">
        <button onClick={() => setState(prev => ({ ...prev, currentStep: 'address' }))} className="flex-1 bg-slate-800 text-slate-300 py-3 rounded-xl font-bold uppercase text-xs">Kembali</button>
        <button onClick={() => nextStep('guardian')} className="flex-[2] maroon-gradient text-white py-3 rounded-xl font-black uppercase text-sm">Lanjut Wali</button>
      </div>
    </div>
  );

  const renderGuardian = () => (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      <h3 className="text-xl font-black mb-4 flex items-center gap-2 text-white">
        <span className="w-1 h-6 bg-maroon rounded-full"></span> Data Wali (Opsional)
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-4">
        {renderInput("Nama Wali", "namaWali")}
        {renderInput("NIK Wali", "nikWali")}
        {renderInput("Tahun Lahir Wali", "tahunLahirWali")}
        {renderInput("Pekerjaan Wali", "pekerjaanWali")}
        {renderInput("Pendidikan Wali", "pendidikanWali")}
        {renderInput("Penghasilan Wali", "penghasilanWali")}
      </div>
      <div className="flex gap-4 mt-6">
        <button onClick={() => setState(prev => ({ ...prev, currentStep: 'family' }))} className="flex-1 bg-slate-800 text-slate-300 py-3 rounded-xl font-bold uppercase text-xs">Kembali</button>
        <button onClick={() => nextStep('assistance')} className="flex-[2] maroon-gradient text-white py-3 rounded-xl font-black uppercase text-sm">Lanjut Bantuan</button>
      </div>
    </div>
  );

  const renderAssistance = () => (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      <h3 className="text-xl font-black mb-4 flex items-center gap-2 text-white">
        <span className="w-1 h-6 bg-maroon rounded-full"></span> Kesejahteraan & Rumah
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-4">
        {renderInput("Nomor KKS / KPS", "kksKps")}
        {renderInput("Nomor PKH", "pkh")}
        {renderInput("Nomor PIP", "pip")}
        {renderInput("Nomor KIP", "kip")}
        {renderSelect("Status Rumah Ortu", "statusKepemilikanRumahOrangTua", ["Milik Sendiri", "Sewa/Kontrak", "Milik Orang Tua", "Milik Saudara"])}
      </div>
      <div className="flex gap-4 mt-6">
        <button onClick={() => setState(prev => ({ ...prev, currentStep: 'guardian' }))} className="flex-1 bg-slate-800 text-slate-300 py-3 rounded-xl font-bold uppercase text-xs">Kembali</button>
        <button onClick={() => nextStep('school')} className="flex-[2] maroon-gradient text-white py-3 rounded-xl font-black uppercase text-sm">Lanjut Sekolah</button>
      </div>
    </div>
  );

  const renderSchool = () => (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      <h3 className="text-xl font-black mb-4 flex items-center gap-2 text-white">
        <span className="w-1 h-6 bg-maroon rounded-full"></span> Pendidikan Sebelumnya
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-4">
        {renderInput("Nama Sekolah Asal *", "namaSekolahMadrasah")}
        {renderInput("NPSN Sekolah", "npsnSekolah")}
        {renderSelect("Jenjang Sekolah", "jenisLembagaJenjang", ["SD", "MI", "Paket A"])}
        {renderSelect("Status Sekolah", "statusSekolahAsal", ["Negeri", "Swasta"])}
        {renderInput("Lokasi Sekolah", "lokasiSekolah")}
        {renderInput("No Peserta UN", "noPesertaUN")}
        {renderInput("No Blanko SKHU", "noBlankoSKHU")}
        {renderInput("No Seri Ijazah", "noSeriIjazah")}
        {renderInput("Total Nilai UN", "totalNilaiUN", "number")}
      </div>
      <div className="flex gap-4 mt-6">
        <button onClick={() => setState(prev => ({ ...prev, currentStep: 'assistance' }))} className="flex-1 bg-slate-800 text-slate-300 py-3 rounded-xl font-bold uppercase text-xs">Kembali</button>
        <button onClick={() => nextStep('review')} className="flex-[2] maroon-gradient text-white py-3 rounded-xl font-black uppercase text-sm">Lanjut Review</button>
      </div>
    </div>
  );

  const renderReview = () => (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      <h3 className="text-xl font-black mb-4 flex items-center gap-2 text-white">
        <span className="w-1 h-6 bg-maroon rounded-full"></span> Konfirmasi Akhir
      </h3>
      <div className="glass p-6 rounded-2xl mb-6 text-sm text-slate-300">
        <p className="mb-4 text-xs font-bold text-slate-500 uppercase">Review Data Sebelum Simpan</p>
        <div className="grid grid-cols-2 gap-4">
           <div><span className="text-slate-500 block uppercase text-[8px]">Siswa</span>{state.studentData.namaSiswa || '-'}</div>
           <div><span className="text-slate-500 block uppercase text-[8px]">NISN</span>{state.studentData.nisn || '-'}</div>
           <div><span className="text-slate-500 block uppercase text-[8px]">Sekolah Asal</span>{state.studentData.namaSekolahMadrasah || '-'}</div>
           <div><span className="text-slate-500 block uppercase text-[8px]">Status</span>{state.editingIndex !== null ? <span className="text-maroon font-black">EDITING MODE</span> : 'PENDAFTARAN BARU'}</div>
        </div>
      </div>
      <div className="flex gap-4 mt-6">
        <button onClick={() => setState(prev => ({ ...prev, currentStep: 'school' }))} className="flex-1 bg-slate-800 text-slate-300 py-3 rounded-xl font-bold uppercase text-xs">Cek Ulang</button>
        <button 
          onClick={handleSubmit} 
          disabled={state.isSubmitting}
          className="flex-[2] maroon-gradient text-white py-3 rounded-xl font-black uppercase text-sm flex items-center justify-center gap-2"
        >
          {state.isSubmitting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : (state.editingIndex !== null ? 'Simpan Perubahan' : 'Selesaikan Pendaftaran')}
        </button>
      </div>
    </div>
  );

  const renderRegistrationCard = (data: Partial<StudentData>) => (
    <div id="registration-card" className="print-card glass bg-slate-900 border-2 border-maroon rounded-[40px] p-10 max-w-xl mx-auto shadow-2xl relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-32 h-32 maroon-gradient rounded-bl-[100px] opacity-20 -mr-10 -mt-10 transition-all group-hover:scale-110" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-maroon/10 rounded-tr-[80px] -ml-5 -mb-5" />
      <div className="flex items-start justify-between mb-8 border-b border-maroon/20 pb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 maroon-gradient rounded-2xl flex items-center justify-center font-black text-2xl text-white shadow-lg shadow-maroon/20">M1</div>
          <div>
            <h2 className="print-maroon-text text-xl font-black tracking-tighter leading-none uppercase">KARTU PENDAFTARAN</h2>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">MTs Muhammadiyah 01 Purbalingga</p>
            <p className="text-maroon text-[9px] font-bold uppercase mt-1">Tahun Pelajaran 2024/2025</p>
          </div>
        </div>
        <div className="print-maroon-bg bg-maroon/10 border border-maroon/30 px-4 py-2 rounded-xl text-center">
          <span className="block text-[8px] font-black text-maroon/60 uppercase">No Urut</span>
          <span className="block text-2xl font-black text-maroon">#{data.noUrut}</span>
        </div>
      </div>
      <div className="space-y-6 relative z-10 text-left">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Nama Lengkap</span>
          <p className="text-2xl font-black text-white uppercase tracking-tight">{data.namaSiswa || 'TIDAK TERIDENTIFIKASI'}</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">NISN</span>
            <p className="text-sm font-bold text-slate-200">{data.nisn || '-'}</p>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Jenis Kelamin</span>
            <p className="text-sm font-bold text-slate-200">{data.jenisKelamin || '-'}</p>
          </div>
          <div className="flex flex-col gap-1 col-span-2">
            <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Asal Sekolah</span>
            <p className="text-sm font-bold text-slate-200">{data.namaSekolahMadrasah || '-'}</p>
          </div>
        </div>
        <div className="mt-8 pt-6 border-t border-slate-800 text-center">
          <p className="text-[9px] text-slate-600 font-bold uppercase italic mb-2 tracking-tighter">"Cerdas, Berkarakter, Islami - Bener, Pinter, Trampil"</p>
          <div className="w-full h-12 bg-slate-950/50 rounded-xl border border-slate-800 flex items-center justify-center">
             <span className="text-[10px] text-slate-700 font-mono tracking-[0.5em]">{data.nik || 'VERIFIED-M1-PBG'}</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderDashboard = () => (
    <div className="mt-20 border-t border-slate-900 pt-16 no-print">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-6">
        <div>
          <h2 className="text-3xl font-black tracking-tighter uppercase leading-none">DATABASE <span className="text-maroon">SISWA</span></h2>
          <div className="flex items-center gap-2 mt-2">
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Total: {state.allRegistrants.length} Pendaftar</p>
            <span className="w-1 h-1 rounded-full bg-slate-700" />
            <p className="text-[10px] text-green-500 font-black uppercase animate-pulse tracking-tighter">Auto-Saved to Browser</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <button onClick={() => downloadExcel(state.allRegistrants)} disabled={state.allRegistrants.length === 0} className="flex-1 md:flex-none bg-maroon text-white px-5 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all disabled:opacity-20 flex items-center justify-center gap-2 shadow-lg shadow-maroon/20"><Icons.Sparkles /> Export Excel EMIS</button>
          <div className="flex-1 md:flex-none flex gap-2">
            <button onClick={exportBackupJSON} disabled={state.allRegistrants.length === 0} title="Backup Database ke File JSON" className="flex-1 md:flex-none bg-slate-800 hover:bg-slate-700 text-white px-4 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2">Backup</button>
            <button onClick={() => fileInputRef.current?.click()} title="Restore Database dari File JSON" className="flex-1 md:flex-none bg-slate-800 hover:bg-slate-700 text-white px-4 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2">Restore</button>
            <input type="file" ref={fileInputRef} onChange={importBackupJSON} accept=".json" className="hidden" />
          </div>
        </div>
      </div>
      {state.allRegistrants.length === 0 ? (
        <div className="glass p-20 rounded-[40px] text-center border-dashed border-slate-800">
          <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-700"><Icons.User /></div>
          <p className="text-slate-600 font-bold text-sm uppercase tracking-widest italic">Database Kosong</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {state.allRegistrants.map((item, idx) => (
            <div key={idx} className={`glass p-5 rounded-3xl transition-all group border ${state.editingIndex === idx ? 'border-maroon ring-1 ring-maroon/50 shadow-lg shadow-maroon/10' : 'border-maroon/5 hover:border-maroon/20'}`}>
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 maroon-gradient rounded-xl flex items-center justify-center font-black text-white text-xs">#{item.noUrut}</div>
                   <div>
                     <h4 className="font-black text-white leading-tight uppercase tracking-tight text-sm text-left">{item.namaSiswa}{state.editingIndex === idx && <span className="ml-2 text-[8px] bg-maroon text-white px-2 py-0.5 rounded-full">SEDANG DIEDIT</span>}</h4>
                     <p className="text-slate-500 text-[9px] font-bold uppercase tracking-widest text-left">{item.nisn || 'Tanpa NISN'} • {item.namaSekolahMadrasah || 'Sekolah Belum Diisi'}</p>
                   </div>
                </div>
                <div className="flex gap-2">
                   <button onClick={() => handleEdit(idx)} title="Edit Data" className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${state.editingIndex === idx ? 'bg-maroon text-white' : 'bg-slate-800 hover:bg-white hover:text-black'}`}><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                   <button onClick={() => handleDelete(idx)} title="Hapus Data" className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-red-600 hover:text-white flex items-center justify-center transition-all"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  if (state.isFinished) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
         <div className="no-print">
           <div className="w-20 h-20 bg-maroon rounded-full flex items-center justify-center mb-8 shadow-2xl shadow-maroon/50 animate-bounce mx-auto"><svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg></div>
           <h1 className="text-4xl font-black mb-2 tracking-tighter uppercase">{state.editingIndex !== null ? 'UPDATE BERHASIL!' : 'DATA TERSIMPAN!'} 🚀</h1>
           <p className="text-slate-500 font-bold uppercase text-xs tracking-widest mb-10">Silakan Cetak Kartu Pendaftaran Siswa Di Bawah Ini</p>
         </div>
         <div className="mb-10 w-full animate-in zoom-in-95 duration-500">{renderRegistrationCard(state.studentData)}</div>
         {state.aiAnalysis && (
            <div className="glass p-8 rounded-[30px] max-w-lg text-left mb-8 border-maroon/20 relative group overflow-hidden mx-auto no-print">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-maroon/5 rounded-full blur-2xl" />
              <h4 className="text-maroon font-black text-[10px] uppercase mb-4 tracking-widest flex items-center gap-2">AI Counselor Insight:</h4>
              <div className="text-slate-300 text-sm leading-relaxed italic prose prose-invert prose-maroon">{state.aiAnalysis}</div>
            </div>
         )}
         <div className="flex flex-col md:flex-row gap-4 w-full max-w-md no-print mx-auto">
            <button onClick={handlePrint} className="flex-1 bg-white text-black hover:bg-maroon hover:text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl transition-all flex items-center justify-center gap-2">Cetak Kartu</button>
            <button onClick={startNewInput} className="flex-1 maroon-gradient text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-maroon/20">Input Siswa Lain</button>
         </div>
         <div className="w-full max-w-4xl text-left mt-20 no-print mx-auto">{renderDashboard()}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 pb-20 no-print">
      <nav className="p-6 sticky top-0 z-50 bg-slate-950/90 backdrop-blur-xl border-b border-slate-900">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-maroon rounded-xl flex items-center justify-center font-black text-white italic shadow-lg shadow-maroon/30">M1</div>
            <div className="text-left">
              <h1 className="font-black text-lg tracking-tighter leading-none uppercase">MTs MUHAMMADIYAH 01</h1>
              <span className="text-[10px] text-maroon font-black tracking-[0.2em] uppercase">Purbalingga</span>
            </div>
          </div>
          <div className="hidden md:flex flex-col items-end">
             <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Visi Madrasah</span>
             <span className="text-xs font-bold text-slate-300 italic">"Bener, Pinter, Trampil"</span>
          </div>
        </div>
      </nav>
      <main className="max-w-4xl mx-auto p-6 mt-10">
        <header className="mb-12 text-left">
          <div className="flex items-center gap-4 mb-4">
             <div className="px-3 py-1 bg-maroon/10 border border-maroon/20 rounded-full text-maroon text-[10px] font-black uppercase tracking-widest">Admin Panel v2.7</div>
             {state.editingIndex !== null && <div className="px-3 py-1 bg-orange-500 text-white rounded-full text-[10px] font-black uppercase tracking-widest animate-pulse">Mode Edit Aktif</div>}
             <div className="px-3 py-1 bg-green-900/10 text-green-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-green-500" /> DB ACTIVE</div>
          </div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-4 leading-none">{state.editingIndex !== null ? 'UPDATE' : 'FUTURE'} <br/><span className="text-maroon uppercase">{state.editingIndex !== null ? 'DATA SISWA.' : 'STARTS HERE.'}</span></h1>
          <p className="text-slate-500 font-bold text-lg max-w-xl leading-snug uppercase tracking-tight">{state.editingIndex !== null ? `Sedang mengoreksi data: ${state.studentData.namaSiswa}` : 'Sistem PPDB Digital Terintegrasi EMIS. Validasi real-time aktif! ⚡'}</p>
        </header>
        <div className="glass rounded-[40px] p-6 md:p-12 shadow-2xl relative border-maroon/10">
          <FormStepIndicator currentStep={state.currentStep} />
          <div className="mt-8">
            {state.currentStep === 'personal' && renderPersonal()}
            {state.currentStep === 'address' && renderAddress()}
            {state.currentStep === 'family' && renderFamily()}
            {state.currentStep === 'guardian' && renderGuardian()}
            {state.currentStep === 'assistance' && renderAssistance()}
            {state.currentStep === 'school' && renderSchool()}
            {state.currentStep === 'review' && renderReview()}
          </div>
        </div>
        {renderDashboard()}
      </main>
      <footer className="mt-20 py-10 text-center">
        <div className="flex justify-center gap-2 mb-4">{[1,2,3].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-maroon/30" />)}</div>
        <p className="text-slate-700 text-[10px] font-black uppercase tracking-[0.3em]">Terintegrasi Template EMIS Kemenag Madrasah • MTs Muhammadiyah 01 Purbalingga</p>
      </footer>
    </div>
  );
};

export default App;
