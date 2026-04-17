import { NextResponse } from "next/server";
import { model } from "@/lib/gemini";

export async function POST(request: Request) {
  const { question } = await request.json();

  const result = await model.generateContent(question);
  const response = await result.response;
  const text = response.text();

  return NextResponse.json({ answer: text });
}