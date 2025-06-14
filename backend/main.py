import os
from dotenv import load_dotenv

# Загрузка переменных окружения из .env
load_dotenv()

import asyncio
from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from langchain_google_genai import ChatGoogleGenerativeAI
from fastapi.responses import JSONResponse
import threading
from typing import Optional, Dict, Tuple, Any
import hashlib
import time
from concurrent.futures import ThreadPoolExecutor
import logging
import re
from pymongo import MongoClient
import json
from script_ai_demo import PROMPT

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler()],
)
logger = logging.getLogger("tougpt")

# Получение порта для запуска (используется на Render)
PORT = int(os.environ.get("PORT", 8000))

# Пул потоков для ускорения AI-запросов
executor = ThreadPoolExecutor(max_workers=max(2, os.cpu_count() or 4))

# Предобработка пользовательского запроса для повышения релевантности
def preprocess_query(query: str) -> str:
    query = re.sub(r'\s+', ' ', query.strip().lower())
    query = re.sub(r'^(привет|здравствуйте|доброе утро|добрый день|добрый вечер|пожалуйста|скажи|расскажи|покажи|подскажи|помоги|дай информацию о)[,\s]+', '', query)
    query = re.sub(r'\b(мне|немного|очень|кратко|подробно|пожалуйста|чуть-чуть|просто)\b', '', query)
    if re.search(r'где|как найти|как попасть|расположен|находится', query):
        query = f"местоположение {query}"
    if re.search(r'когда|часы работы|время работы|график работы|режим работы|открыто|закрыто', query):
        query = f"время работы {query}"
    return query.strip()

class MongoDBKnowledgeManager:
    """Работа с базой знаний в MongoDB (NoSQL)."""
    def __init__(self):
        self.mongo_uri = os.getenv("MONGODB_URI")
        self.mongo_db = os.getenv("MONGODB_DB", "toudb")
        # По умолчанию коллекция storage, если нет - tou
        self.mongo_collection = os.getenv("MONGODB_COLLECTION", "storage")
        self._content_cache = ""
        self._cache_timestamp = 0
        self._cache_ttl = 3600  # 1 час кэширования
        self._lock = threading.Lock()
        if not self.mongo_uri:
            logger.warning("MONGODB_URI не задан. База знаний будет пуста.")
        self.client = MongoClient(self.mongo_uri) if self.mongo_uri else None
        self.db = self.client[self.mongo_db] if self.client else None
        # Попытка выбрать storage, если нет - tou
        if self.db is not None:
            if "storage" in self.db.list_collection_names():
                self.collection = self.db["storage"]
                logger.info("Используется коллекция 'storage' для базы знаний.")
            elif "tou" in self.db.list_collection_names():
                self.collection = self.db["tou"]
                logger.info("Используется коллекция 'tou' для базы знаний.")
            else:
                self.collection = None
                logger.error("В базе нет коллекций 'storage' или 'tou'.")
        else:
            self.collection = None
        # Предзагрузка базы знаний ("обучение")
        self._preload_knowledge()

    def _preload_knowledge(self):
        """Загружает всю коллекцию в кэш при старте (эмулирует обучение)."""
        with self._lock:
            if self.collection is None:
                self._content_cache = "База знаний недоступна. Обратитесь к администратору."
                return
            try:
                docs = list(self.collection.find({}, {"_id": 0}))
                texts = []
                for doc in docs:
                    for v in doc.values():
                        if isinstance(v, str) and v.strip():
                            texts.append(v.strip())
                content = "\n\n".join(texts) if texts else "База знаний пуста."
                self._content_cache = content
                self._cache_timestamp = time.time()
                logger.info(f"База знаний загружена в кэш, размер: {len(content)} символов")
            except Exception as e:
                logger.error(f"Ошибка при загрузке базы знаний: {e}")
                self._content_cache = "База знаний недоступна. Обратитесь к администратору."

    def get_knowledge_content(self) -> str:
        """Получить все тексты из коллекции (конкатенация)."""
        with self._lock:
            current_time = time.time()
            if self._content_cache and current_time - self._cache_timestamp < self._cache_ttl:
                return self._content_cache
            # Если кэш устарел, перезагружаем
            self._preload_knowledge()
            return self._content_cache

    def get_relevant_sections(self, query: str) -> str:
        """Ищет документы, где хотя бы одно ключевое слово встречается в любом строковом поле."""
        if self.collection is None:
            return "База знаний недоступна. Обратитесь к администратору."
        keywords = set(re.findall(r'\b\w+\b', query.lower()))
        try:
            docs = list(self.collection.find({}, {"_id": 0}))
            relevant = []
            for doc in docs:
                for v in doc.values():
                    if isinstance(v, str):
                        text = v.lower()
                        if any(kw for kw in keywords if len(kw) > 3 and kw in text):
                            relevant.append(v.strip())
                            break
            return "\n\n".join(relevant) if relevant else self.get_knowledge_content()
        except Exception as e:
            logger.error(f"Ошибка поиска по MongoDB: {e}")
            return self.get_knowledge_content()

knowledge_manager = MongoDBKnowledgeManager()

# Промпт для LLM с инструкциями

# 2. Заглушка для базы знаний
document_content = """
Документы принимаются с 20 июня по 25 августа.
Стоимость обучения — 497 000 тенге в год.
Общежитие находится по адресу: Павлодар, ул. Ломова, 64/1.
"""

# 3. Ввод пользователя
user_query = """
Когда начнётся приём документов?
Какова стоимость обучения в университете?
Где находится общежитие?
"""

# 4. Генерация промпта
final_prompt = PROMPT.format(
    document_content=document_content,
    user_query=user_query
)

print(final_prompt)

# 5. Отправка в модель
response = model.generate_content(final_prompt)
print("""\n
Когда начнётся приём документов?
Какова стоимость обучения в университете?
Где находится общежитие?
""")
print(response.text)


class OptimizedLLMManager:
    """Менеджер для работы с LLM (Google Gemini), с кешированием по ключу."""
    def __init__(self):
        self.default_api_key = os.getenv("GOOGLE_API_KEY")
        self._llm_cache = {}
        self._lock = threading.Lock()
        if self.default_api_key:
            self._create_llm(self.default_api_key)
    def _create_llm(self, api_key: str) -> Any:
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
            llm = ChatGoogleGenerativeAI(
                model="gemini-1.5-pro",
                temperature=0.2,
                max_tokens=1000,
                google_api_key=api_key,
                request_timeout=45,
            )
            return llm
    def get_llm(self, api_key: Optional[str] = None) -> Any:
        key = api_key or self.default_api_key
        if not key:
            raise ValueError("API ключ не предоставлен")
        with self._lock:
            if key not in self._llm_cache:
                self._llm_cache[key] = self._create_llm(key)
            return self._llm_cache[key]

llm_manager = OptimizedLLMManager()

# Кеш ответов AI
response_cache: Dict[str, Tuple[str, float]] = {}
CACHE_TTL = 300
MAX_CACHE_SIZE = 200

def get_cache_key(query: str, content_hash: str) -> str:
    """Генерация ключа для кеша ответа."""
    normalized_query = re.sub(r'\s+', ' ', query.lower().strip())
    return hashlib.md5(f"{normalized_query}:{content_hash}".encode()).hexdigest()

def is_cache_valid(timestamp: float) -> bool:
    """Проверка актуальности кеша."""
    return time.time() - timestamp < CACHE_TTL

def cleanup_cache() -> None:
    """Удаление устаревших и лишних записей из кеша."""
    global response_cache
    current_time = time.time()
    expired_keys = [k for k, (_, ts) in response_cache.items() if current_time - ts > CACHE_TTL]
    for k in expired_keys:
        del response_cache[k]
    if len(response_cache) > MAX_CACHE_SIZE:
        sorted_items = sorted(response_cache.items(), key=lambda x: x[1][1])
        to_remove = len(response_cache) - MAX_CACHE_SIZE
        for i in range(to_remove):
            del response_cache[sorted_items[i][0]]

def cached_ai_answer(document_content: str, content_hash: str, user_query: str, api_key: Optional[str] = None) -> str:
    """Ответ AI с кешированием (по базе знаний и запросу)."""
    processed_query = preprocess_query(user_query)
    cache_key = get_cache_key(processed_query, content_hash)
    if cache_key in response_cache:
        cached_response, timestamp = response_cache[cache_key]
        if is_cache_valid(timestamp):
            logger.info(f"Найден кеш для запроса: {user_query[:50]}...")
            return cached_response
    start_time = time.time()
    try:
        llm = llm_manager.get_llm(api_key)
        prompt = PROMPT.format(document_content=document_content, user_query=user_query)
        response = llm.invoke(prompt)
        content = response.content.strip() if hasattr(response, "content") else str(response).strip()
        if not content or len(content) < 10:
            content = "Извините, я не смог сформировать ответ на основе имеющейся информации."
        response_cache[cache_key] = (content, time.time())
        cleanup_cache()
        response_time = time.time() - start_time
        logger.info(f"Ответ AI сгенерирован за {response_time:.2f}с для запроса: {user_query[:50]}...")
        return content
    except Exception as e:
        logger.error(f"Ошибка генерации ответа AI: {str(e)}")
        return f"Произошла ошибка при обработке вашего запроса: {str(e)}"

async def get_ai_answer_async(user_query: str, api_key: Optional[str] = None) -> str:
    """Асинхронный AI-ответ с учетом базы знаний."""
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

# FastAPI-приложение
app = FastAPI(
    title="ToU AI Assistant",
    version="3.0.0",
    description="AI-ассистент университета Торайгырова с интеграцией MongoDB",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# CORS для фронтенда (Vercel, локально)
ALLOWED_ORIGINS = [
    "https://tougpt.vercel.app/",
    "http://localhost:3000",
    "http://localhost:5173",
]
if os.getenv("NODE_ENV") == "development":
    ALLOWED_ORIGINS.extend(["http://localhost:*", "http://127.0.0.1:*"])
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

class QueryRequest(BaseModel):
    """Модель запроса для /api/ask"""
    question: str
    api_key: Optional[str] = None
    mode: Optional[str] = 'tou'

@app.get("/")
async def root():
    """Корневой эндпоинт API"""
    return {
        "message": "ToU AI Assistant API",
        "version": "3.0.0",
        "status": "running",
        "docs": "/api/docs"
    }

@app.get("/api/health")
async def health():
    """Проверка состояния сервера и MongoDB"""
    try:
        knowledge_status = "connected" if knowledge_manager.collection is not None else "not_configured"
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
    """Получить ответ AI (универсальный или ToU-режим)"""
    if not req.question or not req.question.strip():
        return JSONResponse(
            status_code=400,
            content={"answer": "Вопрос не может быть пустым."}
        )
    api_key = x_api_key or req.api_key
    mode = req.mode or 'tou'
    try:
        start_time = time.time()
        if mode == 'universal':
            llm = llm_manager.get_llm(api_key)
            response = llm.invoke(req.question)
            answer = response.content.strip() if hasattr(response, "content") else str(response).strip()
            processing_time = time.time() - start_time
            return JSONResponse(
                status_code=200,
                content={
                    "answer": answer,
                    "processing_time": round(processing_time, 2),
                    "cached": False
                }
            )
        else:
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
    """Очистить кеш ответов (требует ADMIN_API_KEY)"""
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=PORT,
        log_level="info",
        access_log=True
    )
