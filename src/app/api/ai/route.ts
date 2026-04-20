import { NextResponse } from "next/server";
import { model } from "@/lib/gemini";

export async function POST(request: Request) {
  const { question } = await request.json();

  try {
    const result = await model.generateContent(question);
    const text = result.response.text();
    return NextResponse.json({ answer: text });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "AI response failed" }, { status: 500 });
  }
}