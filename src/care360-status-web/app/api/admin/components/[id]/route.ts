import { NextResponse } from 'next/server';

export async function PUT(req: Request) {
  const body = await req.json();
  return NextResponse.json({ ...body, ok: true });
}

export async function DELETE() {
  return new NextResponse(null, { status: 204 });
}
