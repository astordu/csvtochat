import { promises as fs } from 'fs';
import path from 'path';

// 确保数据目录存在
const DATA_DIR = path.join(process.cwd(), 'data');
const CHATS_DIR = path.join(DATA_DIR, 'chats');
const LIMITS_DIR = path.join(DATA_DIR, 'limits');

async function ensureDir(dir: string) {
  try {
    await fs.access(dir);
  } catch {
    await fs.mkdir(dir, { recursive: true });
  }
}

// 初始化目录
async function initDirectories() {
  await ensureDir(DATA_DIR);
  await ensureDir(CHATS_DIR);
  await ensureDir(LIMITS_DIR);
}

// 本地存储类，模拟 Redis API
export class LocalStorage {
  private initialized = false;

  private async ensureInitialized() {
    if (!this.initialized) {
      await initDirectories();
      this.initialized = true;
    }
  }

  async set(key: string, value: string): Promise<void> {
    await this.ensureInitialized();
    
    // 根据 key 前缀决定存储位置
    if (key.startsWith('chat:')) {
      const filename = key.replace('chat:', '') + '.json';
      const filepath = path.join(CHATS_DIR, filename);
      await fs.writeFile(filepath, value, 'utf8');
    } else if (key.startsWith('limit:')) {
      const filename = key.replace('limit:', '') + '.json';
      const filepath = path.join(LIMITS_DIR, filename);
      await fs.writeFile(filepath, value, 'utf8');
    } else {
      // 默认存储到根目录
      const filepath = path.join(DATA_DIR, key + '.json');
      await fs.writeFile(filepath, value, 'utf8');
    }
  }

  async get(key: string): Promise<string | null> {
    await this.ensureInitialized();
    
    try {
      let filepath: string;
      
      if (key.startsWith('chat:')) {
        const filename = key.replace('chat:', '') + '.json';
        filepath = path.join(CHATS_DIR, filename);
      } else if (key.startsWith('limit:')) {
        const filename = key.replace('limit:', '') + '.json';
        filepath = path.join(LIMITS_DIR, filename);
      } else {
        filepath = path.join(DATA_DIR, key + '.json');
      }
      
      const content = await fs.readFile(filepath, 'utf8');
      return content;
    } catch (error) {
      // 文件不存在或其他错误
      return null;
    }
  }

  async del(key: string): Promise<void> {
    await this.ensureInitialized();
    
    try {
      let filepath: string;
      
      if (key.startsWith('chat:')) {
        const filename = key.replace('chat:', '') + '.json';
        filepath = path.join(CHATS_DIR, filename);
      } else if (key.startsWith('limit:')) {
        const filename = key.replace('limit:', '') + '.json';
        filepath = path.join(LIMITS_DIR, filename);
      } else {
        filepath = path.join(DATA_DIR, key + '.json');
      }
      
      await fs.unlink(filepath);
    } catch (error) {
      // 文件不存在，忽略错误
    }
  }

  async exists(key: string): Promise<boolean> {
    const value = await this.get(key);
    return value !== null;
  }

  // 获取所有聊天记录的文件名
  async getChatKeys(): Promise<string[]> {
    await this.ensureInitialized();
    
    try {
      const files = await fs.readdir(CHATS_DIR);
      return files
        .filter(file => file.endsWith('.json'))
        .map(file => 'chat:' + file.replace('.json', ''));
    } catch {
      return [];
    }
  }

  // 清理过期文件（超过7天的聊天记录）
  async cleanupExpiredFiles(): Promise<void> {
    await this.ensureInitialized();
    
    try {
      const files = await fs.readdir(CHATS_DIR);
      const now = Date.now();
      const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filepath = path.join(CHATS_DIR, file);
          const stats = await fs.stat(filepath);
          
          if (stats.mtime.getTime() < sevenDaysAgo) {
            await fs.unlink(filepath);
            console.log(`Cleaned up expired chat file: ${file}`);
          }
        }
      }
    } catch (error) {
      console.error('Error cleaning up expired files:', error);
    }
  }
}

// 创建单例实例
export const localStorage = new LocalStorage();
