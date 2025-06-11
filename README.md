# TouGPT — AI-ассистент Торайгыров Университета

TouGPT — интеллектуальный ассистент для студентов и сотрудников Торайгыров Университета. Поддерживает два режима: универсальный ИИ и ассистент по базе знаний университета. Интеграция с Supabase (Storage) и Google Gemini.

## Архитектура

```
AIassistant/
├── backend/   # FastAPI, интеграция с Supabase и Gemini
├── frontend/  # Vite + React, современный UI, мобильная адаптация
```

## Возможности
- Чат с AI (Google Gemini, свой ключ или серверный)
- Два режима: универсальный ИИ и ассистент ToU
- Поиск и ответы на основе базы знаний Supabase Storage
- Современный, адаптивный интерфейс
- Быстрый поиск, кэширование, анимации, поддержка мобильных

## Быстрый старт (локально)

1. Установите зависимости:
   ```bash
   npm run install:all
   ```
2. Скопируйте и настройте переменные окружения:
   - Для backend: `.env` (см. пример `.env.example`)
   - Для frontend: `.env` (VITE_API_URL)
3. Запустите оба сервиса:
   ```bash
   npm run dev
   ```

## Переменные окружения (Backend)
- `GOOGLE_API_KEY` — (опционально) серверный ключ Gemini (иначе пользователи вводят свой)
- `SUPABASE_URL` — URL вашего проекта Supabase
- `SUPABASE_ANON_KEY` — анонимный ключ Supabase (только для Storage)
- `SUPABASE_DB_URL` — строка подключения к PostgreSQL (опционально, для прямого доступа)
- `ADMIN_API_KEY` — (опционально) для очистки кэша через API

## Переменные окружения (Frontend)
- `VITE_API_URL` — URL backend (например, https://tou-ai-assistant-backend.onrender.com)

## Деплой

### Backend (Render)
1. Создайте сервис на [Render](https://render.com/), выберите Python, укажите репозиторий.
2. В настройках добавьте переменные окружения (см. выше).
3. Убедитесь, что порт берётся из переменной `PORT`.
4. Стартовая команда: `python main.py`

### Frontend (Vercel)
1. Зайдите на [Vercel](https://vercel.com/), импортируйте папку `frontend` как проект.
2. В настройках проекта добавьте переменную `VITE_API_URL` (строкой, не секретом).
3. Деплойте через интерфейс Vercel или командой:
   ```bash
   cd frontend && vercel --prod
   ```

## API
- `POST /api/ask` — основной эндпоинт (вопрос, режим, ключ)
- `GET /api/health` — статус сервера
- `POST /api/clear-cache` — очистка кэша (требует ADMIN_API_KEY)

## Supabase
- Используется только Storage (bucket `toudb`) для базы знаний.
- Для обновления знаний — просто обновите файлы в бакете.

## Google Gemini
- Ключ можно не указывать на сервере: пользователи смогут ввести свой на фронте.
- Как получить ключ: https://aistudio.google.com/app/apikey

## Контакты и поддержка
- Telegram-боты: @tou_ai_bot, @tou_student_bot
- Вопросы — через GitHub Issues или Telegram

---
© {year} Торайгыров Университет. TouGPT.