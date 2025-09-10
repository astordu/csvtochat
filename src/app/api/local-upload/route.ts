import { NextRequest, NextResponse } from 'next/server';
import { localUploadService } from '@/lib/local-upload';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }
    
    // 检查文件类型
    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      return NextResponse.json(
        { error: 'Only CSV files are allowed' },
        { status: 400 }
      );
    }
    
    // 检查文件大小（30MB 限制）
    const maxSize = 30 * 1024 * 1024; // 30MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size must be less than 30MB' },
        { status: 400 }
      );
    }
    
    // 上传文件
    const result = await localUploadService.uploadFile(file);
    
    return NextResponse.json({
      url: result.url,
      key: result.key,
      size: file.size,
      name: file.name,
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}
