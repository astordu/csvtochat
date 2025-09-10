import { promises as fs } from 'fs';
import path from 'path';
import { generateId } from 'ai';

// 确保上传目录存在
const UPLOADS_DIR = path.join(process.cwd(), 'data', 'uploads');

async function ensureUploadsDir() {
  try {
    await fs.access(UPLOADS_DIR);
  } catch {
    await fs.mkdir(UPLOADS_DIR, { recursive: true });
  }
}

// 本地文件上传服务
export class LocalUploadService {
  private initialized = false;

  private async ensureInitialized() {
    if (!this.initialized) {
      await ensureUploadsDir();
      this.initialized = true;
    }
  }

  // 上传文件到本地存储
  async uploadFile(file: File): Promise<{ url: string; key: string }> {
    await this.ensureInitialized();
    
    const fileId = generateId();
    const fileExtension = path.extname(file.name);
    const fileName = `${fileId}${fileExtension}`;
    const filePath = path.join(UPLOADS_DIR, fileName);
    
    // 将文件内容写入本地文件系统
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await fs.writeFile(filePath, buffer);
    
    // 返回访问 URL
    const url = `/api/files/${fileName}`;
    
    return {
      url,
      key: fileName
    };
  }

  // 获取文件内容
  async getFile(fileName: string): Promise<Buffer | null> {
    await this.ensureInitialized();
    
    try {
      const filePath = path.join(UPLOADS_DIR, fileName);
      const buffer = await fs.readFile(filePath);
      return buffer;
    } catch (error) {
      return null;
    }
  }

  // 删除文件
  async deleteFile(fileName: string): Promise<void> {
    await this.ensureInitialized();
    
    try {
      const filePath = path.join(UPLOADS_DIR, fileName);
      await fs.unlink(filePath);
    } catch (error) {
      // 文件不存在，忽略错误
    }
  }

  // 清理过期文件（超过24小时）
  async cleanupExpiredFiles(): Promise<void> {
    await this.ensureInitialized();
    
    try {
      const files = await fs.readdir(UPLOADS_DIR);
      const now = Date.now();
      const oneDayAgo = now - (24 * 60 * 60 * 1000);
      
      for (const file of files) {
        const filePath = path.join(UPLOADS_DIR, file);
        const stats = await fs.stat(filePath);
        
        if (stats.mtime.getTime() < oneDayAgo) {
          await fs.unlink(filePath);
          console.log(`Cleaned up expired upload file: ${file}`);
        }
      }
    } catch (error) {
      console.error('Error cleaning up expired upload files:', error);
    }
  }

  // 获取文件信息
  async getFileInfo(fileName: string): Promise<{ size: number; mtime: Date } | null> {
    await this.ensureInitialized();
    
    try {
      const filePath = path.join(UPLOADS_DIR, fileName);
      const stats = await fs.stat(filePath);
      return {
        size: stats.size,
        mtime: stats.mtime
      };
    } catch (error) {
      return null;
    }
  }
}

// 创建单例实例
export const localUploadService = new LocalUploadService();
