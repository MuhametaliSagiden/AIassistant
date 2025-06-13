"use client"

import { useTouChat } from "@/lib/useTouChat"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send, Loader2 } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

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

export default function Chat({ lang }: { lang: string }) {
  // Получаем кастомный API-ключ из localStorage
  const getApiKey = () => (typeof window !== 'undefined' ? localStorage.getItem('gemini-api-key') : undefined);

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
    setMessages,
    setInput,
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
    <div className="
  relative flex flex-col w-[70vh] h-[30vh] border-2 border-blue-950 rounded-lg bg-background
  overflow-visible
  before:content-[''] before:absolute before:-bottom-5 before:right-0
  before:w-0 before:h-0
  before:border-l-[27px] before:border-l-transparent
  before:border-r-[0px] before:border-r-transparent
  before:border-t-[23px] before:border-t-blue-950
  before:rotate-[-15deg] before:z-10
  after:content-[''] after:absolute after:-bottom-4 after:right-1
  after:w-0 after:h-0
  after:border-l-[25px] after:border-l-transparent
  after:border-r-[0px] after:border-r-transparent
  after:border-t-[23px] after:border-t-white
  after:rotate-[-15deg] after:z-20
">
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
                "flex gap-3 p-4 rounded-lg",
                message.role === "user"
                  ? "bg-blue-300 border border-blue-300 rounded-2xl"
                  : "bg-background"
              )}
            >
              <Avatar className="h-8 w-8">
                {message.role === "user" ? (
                  <>
                    <AvatarFallback>ВЫ</AvatarFallback>
                    <AvatarImage src="/placeholder.svg?height=32&width=32" />
                  </>
                ) : (
                  <>
                    <AvatarFallback>ИИ</AvatarFallback>
                    <AvatarImage src="/placeholder.svg?height=32&width=32" />
                  </>
                )}
              </Avatar>
              <div className="flex-1 space-y-2">
                <p className="font-medium">{message.role === "user" ? "Вы" : "Ассистент"}</p>
                <div className="prose prose-sm">
                  {message.content.split("\n").map((line, i) => (
                    <p key={i}>{line}</p>
                  ))}
                </div>
              </div>
            </div>
          ))
        )}
        {error && (
          <div className="text-red-600 text-center mt-2">{error}</div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t p-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={input}
            onChange={handleInputChange}
            placeholder={t("placeholder", lang)}
            className="flex-1"
            disabled={isLoading}
          />
          <Button type="submit" disabled={isLoading || !input.trim()}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </div>
    </div>
  )
}