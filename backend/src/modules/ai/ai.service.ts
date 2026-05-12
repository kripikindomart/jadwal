import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppSetting, ClassMeeting } from '../../database/entities';

@Injectable()
export class AiService {
  constructor(
    @InjectRepository(AppSetting)
    private readonly settingsRepo: Repository<AppSetting>,
    @InjectRepository(ClassMeeting)
    private readonly meetingRepo: Repository<ClassMeeting>,
  ) {}

  async summarizeJournal(classCourseId: number): Promise<{ summary: string }> {
    const meetings = await this.meetingRepo.find({
      where: { classCourseId },
      order: { meetingNumber: 'ASC' },
    });

    const filledMeetings = meetings.filter((m) => m.topic);
    if (filledMeetings.length === 0) {
      throw new BadRequestException('Belum ada jurnal yang diisi untuk kelas ini');
    }

    const journalText = filledMeetings
      .map((m) => `Pertemuan ${m.meetingNumber}: ${m.topic}${m.notes ? ' - ' + m.notes : ''}`)
      .join('\n');

    const config = await this.getAiConfig();
    if (!config.apiKey) {
      throw new BadRequestException('API Key AI belum dikonfigurasi. Silakan atur di menu Pengaturan.');
    }

    const prompt = `Anda adalah asisten akademik. Rangkum jurnal perkuliahan berikut menjadi satu paragraf ringkas (3-5 kalimat) yang menjelaskan materi apa saja yang telah diajarkan selama semester ini. Gunakan bahasa Indonesia formal.\n\nJurnal:\n${journalText}`;

    const summary = await this.callAi(config, prompt);
    return { summary };
  }

  async generateSurveyQuestions(context: string): Promise<{ questions: any[] }> {
    const config = await this.getAiConfig();
    if (!config.apiKey) {
      throw new BadRequestException('API Key AI belum dikonfigurasi');
    }

    const prompt = `Buatkan 10 pertanyaan survei evaluasi dosen berdasarkan konteks berikut: "${context}". Format output sebagai JSON array dengan struktur: [{"text": "pertanyaan", "type": "scale"}]. Tipe bisa "scale" (skala 1-5) atau "essay". Gunakan bahasa Indonesia.`;

    const result = await this.callAi(config, prompt);

    try {
      const questions = JSON.parse(result);
      return { questions };
    } catch {
      return { questions: [{ text: result, type: 'essay' }] };
    }
  }

  private async getAiConfig() {
    const settings = await this.settingsRepo.find({
      where: [{ key: 'ai_provider' }, { key: 'ai_api_key' }, { key: 'ai_model' }],
    });

    const map: Record<string, string> = {};
    for (const s of settings) {
      map[s.key] = s.value || '';
    }

    // Decrypt API key
    let apiKey = map['ai_api_key'] || '';
    if (apiKey && apiKey.includes(':')) {
      // It's encrypted, try to decrypt
      try {
        const crypto = await import('crypto');
        const ENCRYPTION_KEY = process.env.SETTINGS_ENCRYPTION_KEY || 'default-32-char-key-change-me!!';
        const key = Buffer.from(ENCRYPTION_KEY.padEnd(32).slice(0, 32));
        const parts = apiKey.split(':');
        const iv = Buffer.from(parts.shift()!, 'hex');
        const encrypted = parts.join(':');
        const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        apiKey = decrypted;
      } catch {
        apiKey = '';
      }
    }

    return {
      provider: map['ai_provider'] || 'openai',
      apiKey,
      model: map['ai_model'] || 'gpt-4o',
    };
  }

  private async callAi(config: { provider: string; apiKey: string; model: string }, prompt: string): Promise<string> {
    const { provider, apiKey, model } = config;

    if (provider === 'openai' || provider === 'anthropic') {
      // OpenAI-compatible API (works for OpenAI and many proxies)
      const baseUrl = provider === 'anthropic'
        ? 'https://api.anthropic.com/v1'
        : 'https://api.openai.com/v1';

      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          ...(provider === 'anthropic' ? { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' } : {}),
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 1000,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        throw new BadRequestException(`AI API error: ${response.status} - ${err}`);
      }

      const data = await response.json() as any;
      return data.choices?.[0]?.message?.content || 'Tidak ada respons dari AI';
    }

    if (provider === 'gemini') {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
          }),
        },
      );

      if (!response.ok) {
        const err = await response.text();
        throw new BadRequestException(`Gemini API error: ${response.status} - ${err}`);
      }

      const data = await response.json() as any;
      return data.candidates?.[0]?.content?.parts?.[0]?.text || 'Tidak ada respons dari AI';
    }

    throw new BadRequestException(`Provider AI "${provider}" tidak didukung`);
  }
}
