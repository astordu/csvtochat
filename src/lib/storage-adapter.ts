import { Redis } from "@upstash/redis";
import { localStorage } from "./local-storage";
import { localUploadService } from "./local-upload";

// 存储适配器接口
export interface StorageAdapter {
  set(key: string, value: string): Promise<void>;
  get(key: string): Promise<string | null>;
  del(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
}

export interface UploadAdapter {
  uploadFile(file: File): Promise<{ url: string; key: string }>;
  getFile(fileName: string): Promise<Buffer | null>;
  deleteFile(fileName: string): Promise<void>;
}

// Redis 存储适配器
export class RedisStorageAdapter implements StorageAdapter {
  constructor(private redis: Redis) {}

  async set(key: string, value: string): Promise<void> {
    await this.redis.set(key, value);
  }

  async get(key: string): Promise<string | null> {
    const result = await this.redis.get(key);
    return result as string | null;
  }

  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.redis.exists(key);
    return result === 1;
  }
}

// 本地存储适配器
export class LocalStorageAdapter implements StorageAdapter {
  async set(key: string, value: string): Promise<void> {
    await localStorage.set(key, value);
  }

  async get(key: string): Promise<string | null> {
    return await localStorage.get(key);
  }

  async del(key: string): Promise<void> {
    await localStorage.del(key);
  }

  async exists(key: string): Promise<boolean> {
    return await localStorage.exists(key);
  }
}

// 本地上传适配器
export class LocalUploadAdapter implements UploadAdapter {
  async uploadFile(file: File): Promise<{ url: string; key: string }> {
    return await localUploadService.uploadFile(file);
  }

  async getFile(fileName: string): Promise<Buffer | null> {
    return await localUploadService.getFile(fileName);
  }

  async deleteFile(fileName: string): Promise<void> {
    await localUploadService.deleteFile(fileName);
  }
}

// 存储工厂
export class StorageFactory {
  private static storageAdapter: StorageAdapter | null = null;
  private static uploadAdapter: UploadAdapter | null = null;

  // 获取存储适配器
  static getStorageAdapter(): StorageAdapter {
    if (!this.storageAdapter) {
      // 检查是否有 Redis 配置
      const hasRedisConfig = !!(
        process.env.UPSTASH_REDIS_REST_URL && 
        process.env.UPSTASH_REDIS_REST_TOKEN
      );

      if (hasRedisConfig) {
        try {
          const redis = new Redis({
            url: process.env.UPSTASH_REDIS_REST_URL!,
            token: process.env.UPSTASH_REDIS_REST_TOKEN!,
          });
          this.storageAdapter = new RedisStorageAdapter(redis);
          console.log('Using Redis storage adapter');
        } catch (error) {
          console.warn('Failed to initialize Redis, falling back to local storage:', error);
          this.storageAdapter = new LocalStorageAdapter();
        }
      } else {
        this.storageAdapter = new LocalStorageAdapter();
        console.log('Using local storage adapter');
      }
    }

    return this.storageAdapter;
  }

  // 获取上传适配器
  static getUploadAdapter(): UploadAdapter {
    if (!this.uploadAdapter) {
      // 检查是否有 S3 配置
      const hasS3Config = !!(
        process.env.S3_UPLOAD_KEY &&
        process.env.S3_UPLOAD_SECRET &&
        process.env.S3_UPLOAD_BUCKET &&
        process.env.S3_UPLOAD_REGION
      );

      if (hasS3Config) {
        // 这里可以添加 S3 上传适配器
        // 目前先使用本地上传
        this.uploadAdapter = new LocalUploadAdapter();
        console.log('S3 config found but using local upload adapter (S3 adapter not implemented yet)');
      } else {
        this.uploadAdapter = new LocalUploadAdapter();
        console.log('Using local upload adapter');
      }
    }

    return this.uploadAdapter;
  }

  // 重置适配器（用于测试）
  static reset() {
    this.storageAdapter = null;
    this.uploadAdapter = null;
  }
}
