import os
from dotenv import load_dotenv

# Загрузка переменных окружения
load_dotenv()

import asyncio
from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from langchain_google_genai import ChatGoogleGenerativeAI
from fastapi.responses import JSONResponse
import sys
import threading
from functools import lru_cache
from typing import Optional, Dict, Tuple, Any
import hashlib
import time
from concurrent.futures import ThreadPoolExecutor
import logging
import re
import psycopg2
from psycopg2.extras import RealDictCursor
import requests

# Оптимизированная настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
    ]
)
logger = logging.getLogger("tougpt")

# Получаем порт из переменных окружения (для Render.com)
PORT = int(os.environ.get("PORT", 8000))

# Оптимизированный пул потоков для AI запросов с ограничением
executor = ThreadPoolExecutor(max_workers=max(2, os.cpu_count() or 4))

# Функция предварительной обработки запросов для улучшения точности ответов
def preprocess_query(query: str) -> str:
    """Предобработка запроса для улучшения релевантности ответа."""
    # Нормализация пробелов и приведение к нижнему регистру
    query = re.sub(r'\s+', ' ', query.strip().lower())
    
    # Удаление общих фраз вежливости для лучшего выделения смысла вопроса
    query = re.sub(r'^(привет|здравствуйте|доброе утро|добрый день|добрый вечер|пожалуйста|скажи|расскажи|покажи|подскажи|помоги|дай информацию о)[,\s]+', '', query)
    
    # Удаление часто встречающихся незначимых слов
    query = re.sub(r'\b(мне|немного|очень|кратко|подробно|пожалуйста|чуть-чуть|просто)\b', '', query)
    
    # Нормализация запросов о расположении
    if re.search(r'где|как найти|как попасть|расположен|находится', query):
        query = f"местоположение {query}"
    
    # Нормализация запросов о времени работы
    if re.search(r'когда|часы работы|время работы|график работы|режим работы|открыто|закрыто', query):
        query = f"время работы {query}"
        
    return query.strip()

class SupabaseKnowledgeManager:
    """Менеджер для работы с базой знаний в Supabase."""
    
    def __init__(self):
        self.supabase_url = os.getenv("SUPABASE_URL")
        self.supabase_key = os.getenv("SUPABASE_ANON_KEY")
        self.supabase_db_url = os.getenv("SUPABASE_DB_URL")
        self._content_cache = ""
        self._cache_timestamp = 0
        self._cache_ttl = 300  # 5 минут
        self._lock = threading.Lock()
        
        if not self.supabase_url or not self.supabase_key:
            logger.warning("Supabase credentials not found. Knowledge base will be empty.")
    
    def _fetch_from_supabase_rest(self) -> str:
        """Получение данных через Supabase REST API."""
        if not self.supabase_url or not self.supabase_key:
            return ""
            
        try:
            headers = {
                "apikey": self.supabase_key,
                "Authorization": f"Bearer {self.supabase_key}",
                "Content-Type": "application/json"
            }
            
            # Получаем данные из основных таблиц знаний
            knowledge_tables = [
                "university_info",
                "departments", 
                "faculties",
                "programs",
                "contacts",
                "schedules",
                "events"
            ]
            
            all_content = []
            
            for table in knowledge_tables:
                try:
                    url = f"{self.supabase_url}/rest/v1/{table}"
                    response = requests.get(url, headers=headers, timeout=10)
                    
                    if response.status_code == 200:
                        data = response.json()
                        if data:
                            all_content.append(f"=== {table.upper()} ===")
                            for row in data:
                                row_text = " | ".join([f"{k}: {v}" for k, v in row.items() if v is not None])
                                all_content.append(row_text)
                            all_content.append("")
                    else:
                        logger.warning(f"Failed to fetch {table}: {response.status_code}")
                        
                except Exception as e:
                    logger.warning(f"Error fetching table {table}: {e}")
                    continue
            
            return "\n".join(all_content)
            
        except Exception as e:
            logger.error(f"Error fetching from Supabase REST API: {e}")
            return ""
    
    def _fetch_from_supabase_db(self) -> str:
        """Получение данных напрямую из PostgreSQL базы Supabase."""
        if not self.supabase_db_url:
            return ""
            
        try:
            conn = psycopg2.connect(self.supabase_db_url)
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            
            # Получаем список таблиц
            cursor.execute("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_type = 'BASE TABLE'
                AND table_name NOT LIKE 'auth_%'
                AND table_name NOT LIKE 'storage_%'
                AND table_name NOT LIKE 'realtime_%'
            """)
            
            tables = [row['table_name'] for row in cursor.fetchall()]
            all_content = []
            
            for table in tables:
                try:
                    cursor.execute(f"SELECT * FROM {table} LIMIT 100")
                    rows = cursor.fetchall()
                    
                    if rows:
                        all_content.append(f"=== {table.upper()} ===")
                        for row in rows:
                            row_text = " | ".join([f"{k}: {v}" for k, v in dict(row).items() if v is not None])
                            all_content.append(row_text)
                        all_content.append("")
                        
                except Exception as e:
                    logger.warning(f"Error fetching table {table}: {e}")
                    continue
            
            conn.close()
            return "\n".join(all_content)
            
        except Exception as e:
            logger.error(f"Error connecting to Supabase DB: {e}")
            return ""
    
    def get_knowledge_content(self) -> str:
        """Получает содержимое базы знаний с кешированием."""
        with self._lock:
            current_time = time.time()
            
            # Проверяем кеш
            if (self._content_cache and 
                current_time - self._cache_timestamp < self._cache_ttl):
                return self._content_cache
            
            # Обновляем кеш
            start_time = time.time()
            
            # Пробуем сначала DB URL, потом REST API
            content = self._fetch_from_supabase_db()
            if not content:
                content = self._fetch_from_supabase_rest()
            
            if not content:
                content = "База знаний недоступна. Обратитесь к администратору."
            
            self._content_cache = content
            self._cache_timestamp = current_time
            
            load_time = time.time() - start_time
            logger.info(f"Knowledge base updated in {load_time:.2f}s, size: {len(content)} chars")
            
            return content
    
    def get_relevant_sections(self, query: str) -> str:
        """Извлекает релевантные разделы знаний по запросу."""
        full_content = self.get_knowledge_content()
        
        if not full_content or "недоступна" in full_content:
            return full_content
        
        # Простой поиск релевантных разделов по ключевым словам
        keywords = set(re.findall(r'\b\w+\b', query.lower()))
        sections = full_content.split("=== ")
        relevant_sections = []
        
        for section in sections:
            if any(keyword in section.lower() for keyword in keywords if len(keyword) > 3):
                relevant_sections.append("=== " + section if section else section)
        
        return "\n".join(relevant_sections) if relevant_sections else full_content

# Инициализируем менеджер базы знаний
knowledge_manager = SupabaseKnowledgeManager()

# Оптимизированный промпт с инструкциями для более точных ответов
PROMPT = """
Ты — AI-ассистент университета Торайгырова. Твоя задача - предоставлять точную информацию на основе базы знаний университета.

Рекомендации для ответов:
1. Отвечай точно на основе предоставленных данных.
2. Если информации недостаточно, честно признай это.
3. Будь лаконичным, но информативным.
4. Используй маркированные списки для перечислений.
5. Форматируй ответ для удобства чтения.

База знаний:
{document_content}

Вопрос: {user_query}

Ответ:
"""

class OptimizedLLMManager:
    """Менеджер для работы с LLM-моделями с оптимизацией и кешированием."""
    
    def __init__(self):
        self.default_api_key = os.getenv("GOOGLE_API_KEY")
        self._llm_cache = {}
        self._lock = threading.Lock()

        if self.default_api_key:
            self._create_llm(self.default_api_key)
    
    def _create_llm(self, api_key: str) -> Any:
        """Создание экземпляра LLM с оптимизированными параметрами."""
        try:
            llm = ChatGoogleGenerativeAI(
                model="gemini-1.5-flash",
                temperature=0.1,
                max_tokens=1000,
                google_api_key=api_key,
                request_timeout=30,
                top_p=0.95,
                top_k=40,
            )
            return llm
        except Exception as e:
            logger.warning(f"Не удалось создать экземпляр gemini-1.5-flash: {e}, пробую резервную модель")
            
            # Если не удалось создать flash модель, используем pro модель
            llm = ChatGoogleGenerativeAI(
                model="gemini-1.5-pro",
                temperature=0.2,
                max_tokens=1000,
                google_api_key=api_key,
                request_timeout=45,
            )
            return llm

    def get_llm(self, api_key: Optional[str] = None) -> Any:
        """Получение LLM с кэшированием по API-ключу."""
        key = api_key or self.default_api_key
        if not key:
            raise ValueError("API ключ не предоставлен")

        with self._lock:
            if key not in self._llm_cache:
                self._llm_cache[key] = self._create_llm(key)
            return self._llm_cache[key]

# Инициализируем менеджер LLM
llm_manager = OptimizedLLMManager()

# Кэш для ответов с TTL и ограничением размера
response_cache: Dict[str, Tuple[str, float]] = {}
CACHE_TTL = 300  # 5 минут
MAX_CACHE_SIZE = 200  # Максимальное количество элементов в кеше

def get_cache_key(query: str, content_hash: str) -> str:
    """Генерация ключа для кеша."""
    # Нормализуем запрос для лучшего совпадения кеша
    normalized_query = re.sub(r'\s+', ' ', query.lower().strip())
    return hashlib.md5(f"{normalized_query}:{content_hash}".encode()).hexdigest()

def is_cache_valid(timestamp: float) -> bool:
    """Проверка валидности кеша по времени."""
    return time.time() - timestamp < CACHE_TTL

def cleanup_cache() -> None:
    """Очистка устаревших записей кеша."""
    global response_cache
    current_time = time.time()
    # Удаляем устаревшие записи
    expired_keys = [k for k, (_, ts) in response_cache.items() if current_time - ts > CACHE_TTL]
    for k in expired_keys:
        del response_cache[k]
    
    # Если кеш всё ещё слишком большой, удаляем самые старые записи
    if len(response_cache) > MAX_CACHE_SIZE:
        # Сортируем по времени создания (от старых к новым)
        sorted_items = sorted(response_cache.items(), key=lambda x: x[1][1])
        # Определяем количество элементов для удаления
        to_remove = len(response_cache) - MAX_CACHE_SIZE
        # Удаляем самые старые элементы
        for i in range(to_remove):
            del response_cache[sorted_items[i][0]]

def cached_ai_answer(document_content: str, content_hash: str, user_query: str, api_key: Optional[str] = None) -> str:
    """Получение ответа AI с кешированием для повторяющихся запросов."""
    # Предобработка запроса
    processed_query = preprocess_query(user_query)
    cache_key = get_cache_key(processed_query, content_hash)

    # Проверяем кеш
    if cache_key in response_cache:
        cached_response, timestamp = response_cache[cache_key]
        if is_cache_valid(timestamp):
            logger.info(f"Найден кеш для запроса: {user_query[:50]}...")
            return cached_response

    # Генерируем новый ответ
    start_time = time.time()
    
    try:
        llm = llm_manager.get_llm(api_key)
        
        # Формируем промпт с релевантным контентом
        prompt = PROMPT.format(document_content=document_content, user_query=user_query)
        
        # Получаем ответ от модели
        response = llm.invoke(prompt)
        content = response.content.strip() if hasattr(response, "content") else str(response).strip()
        
        # Проверяем на пустые или слишком короткие ответы
        if not content or len(content) < 10:
            content = "Извините, я не смог сформировать ответ на основе имеющейся информации."
            
        # Сохраняем в кеш
        response_cache[cache_key] = (content, time.time())
        
        # Очищаем старые записи из кеша
        cleanup_cache()
        
        response_time = time.time() - start_time
        logger.info(f"Ответ AI сгенерирован за {response_time:.2f}с для запроса: {user_query[:50]}...")
        
        return content
    except Exception as e:
        logger.error(f"Ошибка генерации ответа AI: {str(e)}")
        return f"Произошла ошибка при обработке вашего запроса: {str(e)}"


async def get_ai_answer_async(user_query: str, api_key: Optional[str] = None) -> str:
    """Асинхронная обработка AI запроса с оптимизацией производительности."""
    # Получаем базу знаний из Supabase
    content_to_use = knowledge_manager.get_relevant_sections(user_query)
    
    if not content_to_use or not content_to_use.strip():
        return "База знаний пуста или недоступна. Обратитесь к администратору."

    try:
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            executor,
            cached_ai_answer,
            content_to_use,
            hashlib.md5(content_to_use.encode()).hexdigest(),
            user_query,
            api_key
        )
        return result
    except Exception as e:
        logger.error(f"AI Error: {str(e)}")
        return f"Произошла ошибка при обработке запроса. Повторите попытку позже."

# Инициализация FastAPI
app = FastAPI(
    title="ToU AI Assistant", 
    version="3.0.0",
    description="AI-ассистент университета Торайгырова с интеграцией Supabase",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# Настройка CORS для продакшн
ALLOWED_ORIGINS = [
    "https://tou-ai-assistant.vercel.app",  # Ваш фронтенд на Vercel
    "http://localhost:3000",  # Для разработки
    "http://localhost:5173",  # Для Vite
]

if os.getenv("NODE_ENV") == "development":
    ALLOWED_ORIGINS.extend(["http://localhost:*", "http://127.0.0.1:*"])

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

class QueryRequest(BaseModel):
    """Модель запроса для эндпоинта /api/ask"""
    question: str
    api_key: Optional[str] = None

@app.get("/")
async def root():
    """Корневой эндпоинт"""
    return {
        "message": "ToU AI Assistant API",
        "version": "3.0.0",
        "status": "running",
        "docs": "/api/docs"
    }

@app.get("/api/health")
async def health():
    """Эндпоинт проверки работоспособности сервера"""
    try:
        # Проверяем подключение к Supabase
        knowledge_status = "connected" if knowledge_manager.supabase_url else "not_configured"
        
        return {
            "status": "ok",
            "timestamp": time.time(),
            "cache_size": len(response_cache),
            "version": "3.0.0",
            "knowledge_base": knowledge_status,
            "environment": os.getenv("NODE_ENV", "production")
        }
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": str(e)}
        )

@app.post("/api/ask")
async def ask_ai(req: QueryRequest, x_api_key: Optional[str] = Header(None)):
    """Основной эндпоинт для получения ответов от AI"""
    if not req.question or not req.question.strip():
        return JSONResponse(
            status_code=400,
            content={"answer": "Вопрос не может быть пустым."}
        )

    api_key = x_api_key or req.api_key

    try:
        start_time = time.time()
        answer = await get_ai_answer_async(req.question, api_key)
        processing_time = time.time() - start_time
        
        cache_key = get_cache_key(preprocess_query(req.question), "")
        is_cached = cache_key in response_cache and is_cache_valid(response_cache[cache_key][1])

        return JSONResponse(
            status_code=200,
            content={
                "answer": answer,
                "processing_time": round(processing_time, 2),
                "cached": is_cached
            }
        )
    except ValueError as e:
        logger.error(f"Validation error: {str(e)}")
        return JSONResponse(
            status_code=400,
            content={
                "answer": f"Ошибка запроса: {str(e)}",
                "error": True
            }
        )
    except Exception as e:
        logger.error(f"Server error: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={
                "answer": f"Произошла внутренняя ошибка сервера.",
                "error": True
            }
        )

@app.post("/api/clear-cache")
async def clear_cache(api_key: Optional[str] = Header(None)):
    """Очистка кеша ответов"""
    global response_cache
    admin_key = os.getenv("ADMIN_API_KEY")
    
    if not admin_key or api_key != admin_key:
        return JSONResponse(
            status_code=401,
            content={"status": "Недостаточно прав для этой операции"}
        )
    
    old_size = len(response_cache)
    response_cache.clear()
    return {"status": "Кеш очищен", "old_size": old_size, "timestamp": time.time()}

# Запуск приложения
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=PORT,
        log_level="info",
        access_log=True
    )
