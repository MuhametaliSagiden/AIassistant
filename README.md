# ToU AI Assistant

AI-ассистент для университета Торайгырова с интеграцией Supabase и Google Gemini.

## Структура проекта

```
AIassistant/
├── backend/           # FastAPI backend
├── frontend/          # React frontend (Vite)
├── src/              # Основные компоненты React
└── aistudentsreact/  # Next.js приложение (альтернативное)
```

## Быстрый старт

### 1. Установка зависимостей

```bash
npm run install:all
```

### 2. Настройка переменных окружения

Скопируйте `.env.example` в `.env` и заполните:

```bash
cp .env.example .env
```

### 3. Запуск разработки

```bash
npm run dev
```

### 4. Сборка для продакшн

```bash
npm run build
```

## Переменные окружения

- `GOOGLE_API_KEY` - API ключ Google Gemini
- `SUPABASE_URL` - URL проекта Supabase
- `SUPABASE_ANON_KEY` - Анонимный ключ Supabase
- `SUPABASE_DB_URL` - Строка подключения к PostgreSQL

## Возможности

- Чат с AI на базе Google Gemini
- База знаний в Supabase Storage(база заний из общедоступных данных) 
- Многоязычная Поддержка(доработать фронт) 
- Адаптивный дизайн

## API Endpoints

- `GET /` - Главная страница API
- `POST /api/ask` - Отправка вопроса AI
- `GET /api/health` - Проверка состояния

## Деплой

### Vercel (Frontend)
```bash
cd frontend && vercel --prod
```

### Render (Backend)
```bash
cd backend && git push render main
```