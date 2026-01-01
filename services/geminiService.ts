
import { GoogleGenAI } from "@google/genai";
import { StudentData } from "../types";

export const analyzeStudentProfile = async (data: Partial<StudentData>): Promise<string> => {
  const apiKey = process.env.API_KEY;
  
  if (!apiKey) {
    console.warn("API_KEY is not defined. AI analysis will be skipped.");
    return "Profil kamu legit banget! MTsM 01 Pbg siap bikin kamu makin sigma dan berprestasi. Let's gass!";
  }

  const ai = new GoogleGenAI({ apiKey });
  
  const prompt = `
    Berperanlah sebagai AI Konselor Pendidikan Masa Depan di MTs Muhammadiyah 01 Purbalingga. 
    Sekolah kami memiliki visi "Bener, Pinter, dan Trampil".
    Analisis profil calon murid baru ini dan berikan feedback yang sangat memotivasi, keren, dan menggunakan gaya bahasa Gen Alpha (slay, rizz, sigma, certified, W, gass, dll).
    
    Data Murid:
    - Nama: ${data.namaSiswa}
    - Hobi: ${data.hobi}
    - Asal Sekolah: ${data.namaSekolahMadrasah}
    - Nilai: ${data.totalNilaiUN}
    
    Struktur Jawaban (Markdown):
    1. Greeting yang super keren khas anak muda Purbalingga.
    2. Hubungkan potensi murid dengan visi sekolah (Bener, Pinter, atau Trampil).
    3. Closing statement yang bikin mereka bangga daftar di MTsM 01 Pbg.
    
    Pastikan nada bicaranya asik tapi tetap sopan sebagai representasi madrasah modern.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        temperature: 0.9,
      }
    });
    
    return response.text || "Profil kamu legit banget! MTsM 01 Pbg siap bikin kamu makin sigma dan berprestasi. Let's gass!";
  } catch (error) {
    console.error("AI Analysis failed:", error);
    return "Maaf ya, AI Counselor lagi lowbat. Tapi tenang, profil kamu tetap certified keren!";
  }
};
