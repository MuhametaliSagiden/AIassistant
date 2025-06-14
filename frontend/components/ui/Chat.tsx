"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send, Loader2 } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { marked } from 'marked'
import { Skeleton } from "@/components/ui/skeleton"
import type { Message } from "@/lib/useTouChat"

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

export default function Chat({ lang, messages, input, setInput, handleSend, isLoading, error }: {
  lang: string,
  messages: Message[],
  input: string,
  setInput: (v: string) => void,
  handleSend: (msg: string) => Promise<void>,
  isLoading: boolean,
  error: string | null
}) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages])

  useEffect(() => { setIsMounted(true) }, [])
  if (!isMounted) return null

  return (
    <div className="relative flex flex-col w-full max-w-2xl min-h-[500px] p-8 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border-2 border-blue-950 dark:border-blue-300 sm:w-full sm:min-h-[60vh]">
      <div className="flex-1 min-h-[300px] max-h-[60vh] overflow-y-auto p-4 space-y-4 hide-scrollbar">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground dark:text-gray-300 text-center">{t("welcome", lang)}</p>
          </div>
        ) : (
          messages.map((message, idx) => (
            <div
              key={idx}
              className={cn(
                "flex gap-3 p-4 rounded-lg animate-fade-in-up transition-all duration-300",
                message.role === "user"
                  ? "bg-blue-100 dark:bg-blue-950 border border-blue-300 dark:border-blue-700 rounded-2xl"
                  : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
              )}
              style={{ animationDelay: `${idx * 60}ms` }}
            >
              <Avatar className="h-8 w-8" {...(message.role === "assistant" ? { 'data-assistant': true } : {})}>
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
                <p className={cn("font-medium", message.role === "user" ? "text-blue-900 dark:text-blue-200" : "text-indigo-700 dark:text-indigo-200")}>{message.role === "user" ? "Вы" : "Ассистент"}</p>
                <div className="prose prose-sm max-w-full break-words dark:prose-invert">
                  {message.role === "assistant"
                    ? <div dangerouslySetInnerHTML={{ __html: markdownToHtml(message.content) }} />
                    : message.content.split("\n").map((line: string, i: number) => (
                        <p key={i}>{line}</p>
                      ))}
                </div>
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex gap-3 p-4 rounded-lg animate-fade-in-up transition-all duration-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <Avatar className="h-8 w-8" data-assistant>
              <AvatarFallback>ИИ</AvatarFallback>
              <AvatarImage src="/AISHA.svg" />
            </Avatar>
            <div className="flex-1 space-y-2">
              <p className="font-medium text-indigo-700 dark:text-indigo-200">Ассистент</p>
              <Skeleton className="h-4 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="border-t p-4 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <form onSubmit={async e => { e.preventDefault(); if (input.trim()) await handleSend(input); }} className="flex gap-2">
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={t("placeholder", lang)}
            className="flex-1 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-400"
            disabled={isLoading}
            aria-label="Введите сообщение"
          />
          <Button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="transition-all duration-200 hover:scale-105 focus:ring-2 focus:ring-blue-400 dark:bg-blue-900 dark:text-white dark:hover:bg-blue-800"
            aria-label="Отправить сообщение"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
        {error && <div className="text-red-600 dark:text-red-400 text-center mt-2 animate-fade-in-up">{error}</div>}
      </div>
    </div>
  )
}