import 'dotenv/config';

const API_BASE = process.env.OPENROUTER_API_BASE || 'https://openrouter.ai/api/v1';
const API_KEY = process.env.OPENROUTER_API_KEY;
const MODEL = process.env.OPENROUTER_MODEL || 'deepseek/deepseek-chat-v3-0324:free';

function buildSystemPrompt(lang) {
  const isRussian = /рус|russ/i.test(lang || '') || !lang;
  if (isRussian) {
    return `Ты — IdeaForge, ассистент, который придумывает реалистичные, чётко ограниченные учебные проекты для студентов, изучающих разработку ПО.

Всегда отвечай чистым Markdown СТРОГО по этой структуре, ВСЕ заголовки — на русском языке:

# {Цепляющее название проекта}

## Какую проблему решает
2–3 предложения с описанием реальной проблемы.

## Ключевые функции
- от 5 до 7 конкретных функций списком

## Рекомендуемый стек
- по одной строке на технологию с кратким обоснованием

## Дорожная карта реализации
1. от 3 до 5 пронумерованных шагов, каждый — один абзац

## Обоснование сложности
Короткий абзац, почему проект соответствует заданной сложности с учётом размера команды и сроков.

Функции должны быть конкретными (не размыто «система пользователей», а «JWT-аутентификация с refresh-токенами»). Пиши предметно, без воды.`;
  }
  return `You are IdeaForge — an assistant that designs realistic, scoped practice projects for students learning software development.

Reply in clean Markdown with this exact structure. Write ALL section headings in the language: ${lang}.

# {Catchy Project Title}

## Problem it solves
2-3 sentences describing the real-world problem.

## Core features
- 5 to 7 concrete features as a bulleted list

## Suggested tech stack
- One line per technology with a short reason

## Implementation roadmap
1. 3 to 5 numbered steps, each one paragraph

## Difficulty justification
A short paragraph explaining why this fits the requested difficulty for the given team size and timeframe.

Keep features specific (not vague like "user system" — say "JWT auth with refresh tokens"). Be concrete. No filler.`;
}

function buildUserPrompt(p) {
  const stackParts = [...(p.techStack || [])];
  if (p.customTech && p.customTech.trim()) stackParts.push(...p.customTech.split(',').map(s => s.trim()).filter(Boolean));
  const stack = stackParts.join(', ') || 'на усмотрение разработчика';
  const lang = p.customLanguage?.trim() || p.language || 'Русский';
  const extra = p.extraRequirements?.trim();

  return `Сгенерируй идею проекта с этими параметрами:

- Тип проекта: ${p.projectType}
- Сложность: ${p.difficulty}
- Команда: ${p.teamSize} чел.
- Срок: ${p.timeToComplete}
- Область: ${p.domain}
- Стек технологий: ${stack}
${extra ? `- Дополнительные требования: ${extra}` : ''}

Ответь на языке: ${lang}. Масштаб проекта должен реалистично соответствовать сроку — проект на 1 день должен быть минимальным.`;
}

export async function streamIdea(params, { onToken, onDone, onError }) {
  if (!API_KEY) {
    onError(new Error('OPENROUTER_API_KEY is not configured'));
    return;
  }

  try {
    const lang = params.customLanguage?.trim() || params.language || 'Русский';
    const res = await fetch(`${API_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: buildSystemPrompt(lang) },
          { role: 'user', content: buildUserPrompt(params) },
        ],
        temperature: 1,
        top_p: 0.95,
        max_tokens: 16384,
        stream: true,
      }),
    });

    if (!res.ok || !res.body) {
      const text = await res.text().catch(() => '');
      throw new Error(`Upstream ${res.status}: ${text.slice(0, 200)}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let full = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let nl;
      while ((nl = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, nl).trim();
        buffer = buffer.slice(nl + 1);
        if (!line.startsWith('data:')) continue;
        const data = line.slice(5).trim();
        if (data === '[DONE]') {
          onDone(full);
          return;
        }
        try {
          const json = JSON.parse(data);
          const delta = json.choices?.[0]?.delta?.content;
          if (delta) {
            full += delta;
            onToken(delta);
          }
        } catch {
          /* ignore partial JSON */
        }
      }
    }
    onDone(full);
  } catch (err) {
    onError(err);
  }
}

export function extractTitle(markdown) {
  const match = markdown.match(/^#\s+(.+?)\s*$/m);
  return match ? match[1].trim() : 'Untitled Project';
}
