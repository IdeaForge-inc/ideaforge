# IdeaForge

Генератор учебных проектов с ИИ. Преподаватель создаёт группы и задания, студенты по этим заданиям генерируют идеи проектов через LLM, сдают работы и получают оценки.

## Технологии

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Backend**: Node.js + Express
- **База данных**: SQLite
- **ИИ**: OpenRouter (OpenAI-совместимый API), по умолчанию DeepSeek Chat v3
- **Связь**: HTTP/JSON + Server-Sent Events (стриминг генерации)

## Требования

- Node.js 18+ (нужен для `node --watch`)
- npm
- Ключ API от [OpenRouter](https://openrouter.ai/keys)

## Запуск

```bash
# 1. Установить зависимости (корень + client + server)
npm run install:all

# 2. Настроить переменные окружения
cp .env.example .env
# Открыть .env и вписать свой OPENROUTER_API_KEY

# 3. Запустить клиент и сервер одной командой
npm run dev
```

После запуска:

- **Клиент** — http://localhost:5173
- **API-сервер** — http://localhost:3001

База `server/ideaforge.db` создаётся автоматически при первом запуске.

> ⚠️ Перед повторным запуском всегда останавливайте предыдущий процесс (`Ctrl+C`).
> Запуск второго сервера на занятом порту 3001 приведёт к ошибке `EADDRINUSE`,
> а у клиента — к `ECONNREFUSED` при обращении к API.

## Переменные окружения (`.env`)

| Переменная | Назначение | Значение по умолчанию |
|---|---|---|
| `OPENROUTER_API_KEY` | Ключ API OpenRouter (обязателен) | — |
| `OPENROUTER_API_BASE` | Базовый URL API | `https://openrouter.ai/api/v1` |
| `OPENROUTER_MODEL` | Модель для генерации | `deepseek/deepseek-chat-v3-0324:free` |
| `PORT` | Порт API-сервера | `3001` |

## Возможности

**Преподаватель**
- Создаёт группы (с кодом для вступления)
- Создаёт задания с зафиксированными параметрами и дедлайном
- Видит дашборд группы: участников, прогресс, ленту сданных работ
- Ставит оценки и оставляет отзывы, исключает участников, переименовывает группу

**Студент**
- Вступает в группу по коду
- Генерирует идею проекта по заданию (параметры заданы преподавателем)
- Отмечает статус сдачи, прикладывает ссылку на репозиторий
- Ведёт личную историю идей: закладки, шаринг по ссылке, профиль со статистикой

## Аккаунты и авторизация

- Регистрация по логину и паролю; при регистрации выбирается роль (студент / преподаватель).
- Пароль хранится как scrypt-хеш с солью.
- Сессия — токен в `localStorage`, передаётся заголовком `Authorization: Bearer <token>`.

## Архитектура (MVC)

- **Model** — `server/db.js` (схема и доступ к данным), `server/llm.js` (генерация через ИИ)
- **Controller** — `server/index.js` (маршруты `/api/*`, middleware авторизации, валидация)
- **View** — `client/src/` (страницы, компоненты, клиентское состояние)

Поток данных: `View → HTTP (Bearer-токен) → Controller → Model → SQLite → ответ (JSON/SSE) → View`.

## Структура проекта

```
/client            — React-приложение (Vite)
  src/pages        — страницы (Generate, Groups, GroupDetail, History, Profile, Share)
  src/components   — компоненты UI
  src/lib          — состояние, API-хелпер, типы
/server            — Express API
  index.js         — маршруты и middleware
  db.js            — схема SQLite + запросы
  llm.js           — стриминговый клиент LLM
  ideaforge.db     — база (создаётся автоматически)
```

## Сборка (production)

```bash
npm run build              # собирает клиент в client/dist
npm run start --prefix server   # запускает API без watch-режима
```
