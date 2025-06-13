"use client"

import { useTouChat } from "@/lib/useTouChat"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send, Loader2 } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { marked } from 'marked'

const chatTranslations = {
  ru: {
    send: "Отправить",
    placeholder: "Введите сообщение...",
    welcome: "У вас возникли вопросы?"
  },
  kk: {
    send: "Жіберу",
    placeholder: "Хабарлама енгізіңіз...",
    welcome: "Сәлеметсіз бе! Сұрақтарыңыз бар ма?",
  },
  en: {
    send: "Send",
    placeholder: "Type a message...",
    welcome: "Hello! Do you have any questions?",
  }
};

type ChatTranslationKey = 'send' | 'placeholder' | 'welcome';
function t(key: ChatTranslationKey, lang: string) {
  return chatTranslations[lang as keyof typeof chatTranslations]?.[key] || key;
}

function markdownToHtml(md: string) {
  return marked.parse(md);
}

// SVG силуэт для профиля
const ProfilePlaceholder = () => (
  <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" width={32} height={32}>
    <circle cx="16" cy="16" r="16" fill="#E5E7EB" />
    <ellipse cx="16" cy="13" rx="6" ry="6" fill="#9CA3AF" />
    <ellipse cx="16" cy="24" rx="10" ry="6" fill="#D1D5DB" />
  </svg>
);

export default function Chat({ lang, width = '70vh', height = '30vh' }: { lang: string, width?: string, height?: string }) {
  // Получаем кастомный API-ключ из localStorage
  const getApiKey = () => (typeof window !== 'undefined' ? localStorage.getItem('gemini-api-key') : undefined);

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
  } = useTouChat({ getApiKey });
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [isMounted, setIsMounted] = useState(false)

  // Прокрутка к последнему сообщению
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages])

  // Предотвращение гидратации
  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted) {
    return null
  }

  return (
    <div
      className={
        `relative flex flex-col border-2 border-blue-950 rounded-lg bg-background overflow-visible shadow-xl transition-shadow duration-300`
      }
      style={{ width, height }}
    >
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground text-center">{t("welcome", lang)}</p>
          </div>
        ) : (
          messages.map((message, idx) => (
            <div
              key={idx}
              className={cn(
                "flex gap-3 p-4 rounded-lg animate-fade-in-up transition-all duration-300",
                message.role === "user"
                  ? "bg-blue-100 border border-blue-300 rounded-2xl"
                  : "bg-white dark:bg-gray-50 border border-gray-200"
              )}
            >
              <Avatar className="h-8 w-8">
                {message.role === "user" ? (
                  <ProfilePlaceholder />
                ) : (
                  <>
                    <AvatarFallback>ИИ</AvatarFallback>
                    <AvatarImage src="/AISHA.svg" />
                  </>
                )}
              </Avatar>
              <div className="flex-1 space-y-2">
                <p className={cn("font-medium", message.role === "user" ? "text-blue-900" : "text-indigo-700")}>{message.role === "user" ? "Вы" : "Ассистент"}</p>
                <div className="prose prose-sm max-w-full break-words">
                  {message.role === "assistant"
                    ? <div dangerouslySetInnerHTML={{ __html: markdownToHtml(message.content) }} />
                    : message.content.split("\n").map((line, i) => (
                        <p key={i}>{line}</p>
                      ))}
                </div>
              </div>
            </div>
          ))
        )}
        {error && (
          <div className="text-red-600 text-center mt-2 animate-fade-in-up">{error}</div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="border-t p-4 bg-white dark:bg-gray-50">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={input}
            onChange={handleInputChange}
            placeholder={t("placeholder", lang)}
            className="flex-1"
            disabled={isLoading}
            aria-label="Введите сообщение"
          />
          <Button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="transition-all duration-200 hover:scale-105 focus:ring-2 focus:ring-blue-400"
            aria-label="Отправить сообщение"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </div>
    </div>
  )
}