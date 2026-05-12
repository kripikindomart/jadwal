import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppSetting } from '../../database/entities';
import * as crypto from 'crypto';

const ENCRYPTION_KEY =
  process.env.SETTINGS_ENCRYPTION_KEY || 'default-32-char-key-change-me!!';
const IV_LENGTH = 16;

@Injectable()
export class SettingsService implements OnModuleInit {
  constructor(
    @InjectRepository(AppSetting)
    private readonly settingsRepository: Repository<AppSetting>,
  ) {}

  async onModuleInit() {
    await this.seedDefaults();
  }

  private async seedDefaults() {
    const defaults: Partial<AppSetting>[] = [
      { key: 'app_name', value: 'Prodi CMS', type: 'text', isEncrypted: false },
      { key: 'app_logo', value: '', type: 'text', isEncrypted: false },
      { key: 'app_copyright', value: '© 2026 Pascasarjana', type: 'text', isEncrypted: false },
      { key: 'active_semester_id', value: '', type: 'text', isEncrypted: false },
      { key: 'ai_provider', value: 'openai', type: 'text', isEncrypted: false },
      { key: 'ai_api_key', value: '', type: 'text', isEncrypted: true },
      { key: 'ai_model', value: 'gpt-4o', type: 'text', isEncrypted: false },
    ];

    for (const setting of defaults) {
      const exists = await this.settingsRepository.findOne({
        where: { key: setting.key },
      });
      if (!exists) {
        await this.settingsRepository.save(
          this.settingsRepository.create(setting),
        );
      }
    }
  }

  async getAll(): Promise<Record<string, string>> {
    const settings = await this.settingsRepository.find();
    const result: Record<string, string> = {};

    for (const s of settings) {
      if (s.isEncrypted && s.value) {
        // Mask encrypted values for display
        result[s.key] = s.value ? '••••••••' : '';
      } else {
        result[s.key] = s.value || '';
      }
    }

    return result;
  }

  async getPublic(): Promise<Record<string, string>> {
    const publicKeys = ['app_name', 'app_logo', 'app_copyright', 'active_semester_id'];
    const settings = await this.settingsRepository.find();
    const result: Record<string, string> = {};

    for (const s of settings) {
      if (publicKeys.includes(s.key)) {
        result[s.key] = s.value || '';
      }
    }

    return result;
  }

  async get(key: string): Promise<string | null> {
    const setting = await this.settingsRepository.findOne({ where: { key } });
    if (!setting) return null;

    if (setting.isEncrypted && setting.value) {
      return this.decrypt(setting.value);
    }

    return setting.value;
  }

  async update(data: Record<string, string>): Promise<Record<string, string>> {
    for (const [key, value] of Object.entries(data)) {
      let setting = await this.settingsRepository.findOne({ where: { key } });

      if (!setting) {
        setting = this.settingsRepository.create({
          key,
          value: '',
          type: 'text',
          isEncrypted: false,
        });
      }

      // If encrypted field and value is the mask, skip (don't overwrite)
      if (setting.isEncrypted && value === '••••••••') {
        continue;
      }

      if (setting.isEncrypted && value) {
        setting.value = this.encrypt(value);
      } else {
        setting.value = value;
      }

      await this.settingsRepository.save(setting);
    }

    return this.getAll();
  }

  private encrypt(text: string): string {
    const key = Buffer.from(ENCRYPTION_KEY.padEnd(32).slice(0, 32));
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  private decrypt(text: string): string {
    try {
      const key = Buffer.from(ENCRYPTION_KEY.padEnd(32).slice(0, 32));
      const parts = text.split(':');
      const iv = Buffer.from(parts.shift()!, 'hex');
      const encrypted = parts.join(':');
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch {
      return '';
    }
  }
}
