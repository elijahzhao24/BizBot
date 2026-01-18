import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Get the FormData from the request (contains the 'file' field)
    const formData = await request.formData();

    // Forward the request to the backend API
    const backendUrl = 'http://localhost:8000';
    
    console.log('Forwarding upload to:', `${backendUrl}/upload`);
    
    // Forward the FormData directly to the backend
    const response = await fetch(`${backendUrl}/upload`, {
      method: 'POST',
      body: formData, // Pass FormData as-is, it handles multipart encoding
    });

    const text = await response.text();
    
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: text || 'Unknown error from backend' };
    }

    if (!response.ok) {
      console.error('Backend error:', response.status, data);
      return NextResponse.json(data, { status: response.status });
    }

    console.log('Upload successful:', data);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Upload proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to upload image', details: String(error) },
      { status: 500 }
    );
  }
}

