import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const body = await req.json();
  const now = new Date().toISOString();
  return NextResponse.json(
    {
      id: `202406/mock-${Date.now()}`,
      title: body.title ?? '',
      body: body.body ?? '',
      status: 'investigating',
      severity: body.severity ?? 'minor',
      affectedComponents: [],
      createdAt: now,
      resolvedAt: null,
    },
    { status: 201 }
  );
}
