import { NextRequest, NextResponse } from "next/server";

const API_KEY = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";

export async function GET(req: NextRequest) {
  try {
    if (!API_KEY) {
      return NextResponse.json({ error: "No API Key configured" }, { status: 500 });
    }

    const url = `https://generativelanguage.googleapis.com/v1/models?key=${API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
