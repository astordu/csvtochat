import { NextRequest, NextResponse } from 'next/server';
import { localUploadService } from '@/lib/local-upload';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;
    
    // 安全检查：只允许访问 CSV 文件
    if (!filename.endsWith('.csv')) {
      return new NextResponse('File type not allowed', { status: 403 });
    }
    
    // 获取文件内容
    const fileBuffer = await localUploadService.getFile(filename);
    
    if (!fileBuffer) {
      return new NextResponse('File not found', { status: 404 });
    }
    
    // 获取文件信息
    const fileInfo = await localUploadService.getFileInfo(filename);
    
    // 设置响应头
    const headers = new Headers();
    headers.set('Content-Type', 'text/csv');
    headers.set('Content-Disposition', `inline; filename="${filename}"`);
    
    if (fileInfo) {
      headers.set('Content-Length', fileInfo.size.toString());
      headers.set('Last-Modified', fileInfo.mtime.toUTCString());
    }
    
    // 设置缓存头（1小时）
    headers.set('Cache-Control', 'public, max-age=3600');
    
    return new NextResponse(fileBuffer, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('Error serving file:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
