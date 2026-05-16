'use client';

import { useEffect, useState } from 'react';

type Props = {
    question: string;
}

export default function AiChat({ question }: Props) {
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

useEffect(() => {
  const controller = new AbortController();

  setAnswer(null);
  setLoading(true);

  fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question }),
    signal: controller.signal,
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.error) setAnswer('回答の取得に失敗しました。');
      else setAnswer(data.answer);
    })
    .catch((e) => { if (e.name !== 'AbortError') setAnswer('回答の取得に失敗しました。'); })
    .finally(() => setLoading(false));

  return () => controller.abort();
}, [question]);

  if (loading) return <p className="text-sm text-gray-400">回答を生成中...</p>;
  if (!answer) return null;
  return <p className="text-sm text-gray-700 whitespace-pre-wrap">{answer}</p>;
}