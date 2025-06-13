"use client"

import React from "react"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { Send, Loader2 } from "lucide-react"
import type { Chat, Message } from "@/lib/types"

// Генерация заголовка чата по первому сообщению
function getChatTitle(messages: Message[]): string {
  if (!messages.length) return "Новый чат"
  const first = messages.find(m => m.role === "user")
  if (!first) return "Новый чат"
  let title = first.content
  if (title.length > 40) title = title.substring(0, 37) + "..."
  return title
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "/api/ask"

interface ChatProps {
  chatId: string;
  chats: Chat[];
  setChats: (chats: Chat[]) => void;
}

export default function Chat({ chatId, chats, setChats }: ChatProps) {
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const activeChat = chats.find(c => c.id === chatId) || chats[0]

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }) }, [chatId, chats])

  async function handleSend(e?: React.FormEvent) {
    if (e) e.preventDefault()
    if (!input.trim() || loading) return
    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: input.trim() }
    setChats((prev: Chat[]) => prev.map(chat => chat.id === chatId ? { ...chat, messages: [...chat.messages, userMsg] } : chat))
    setInput("")
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: userMsg.content })
      })
      let data: { answer?: string } | null = null;
      try { data = await res.json(); } catch { throw new Error("Ошибка при обработке ответа сервера") }
      const aiMsg: Message = { id: crypto.randomUUID(), role: "assistant", content: data?.answer || "Ошибка сервера. Попробуйте позже." }
      setChats((prev: Chat[]) => prev.map(chat => chat.id === chatId ? { ...chat, messages: [...chat.messages, aiMsg], title: chat.title === "Новый чат" ? getChatTitle([userMsg, ...chat.messages]) : chat.title } : chat))
      if (!res.ok) setError(data?.answer || "Ошибка сервера. Попробуйте позже.")
    } catch (err: unknown) {
      let errorMessage = "Нет соединения с сервером. Проверьте интернет или попробуйте позже."
      if (err && typeof err === 'object' && 'name' in err && (err as { name?: string }).name === 'AbortError') {
        errorMessage = "Превышено время ожидания ответа. Попробуйте позже."
      }
      setChats((prev: Chat[]) => prev.map(chat => chat.id === chatId ? { ...chat, messages: [...chat.messages, { id: crypto.randomUUID(), role: "assistant", content: errorMessage }] } : chat))
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col h-[60vh] min-h-[400px] rounded-xl shadow-lg bg-background border border-border">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {activeChat.messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground text-center">Начните диалог, задав вопрос ассистенту</p>
          </div>
        ) : (
          activeChat.messages.map((message) => (
            <div key={message.id} className={cn("flex gap-3 p-4 rounded-lg", message.role === "user" ? "bg-muted/50" : "bg-background") }>
              <Avatar className="h-8 w-8">
                {message.role === "user" ? <AvatarFallback>ВЫ</AvatarFallback> : <AvatarFallback>ИИ</AvatarFallback>}
                <AvatarImage src="/placeholder.svg?height=32&width=32" />
              </Avatar>
              <div className="flex-1 space-y-2">
                <p className="font-medium">{message.role === "user" ? "Вы" : "Ассистент"}</p>
                <div className="prose prose-sm">
                  {message.content.split("\n").map((line, i) => (<p key={i}>{line}</p>))}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="border-t p-4">
        <form onSubmit={handleSend} className="flex gap-2">
          <Input value={input} onChange={e => setInput(e.target.value)} placeholder="Напишите сообщение..." className="flex-1" disabled={loading} />
          <Button type="submit" disabled={loading || !input.trim()}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</Button>
        </form>
        {error && <div className="mt-2 text-sm text-destructive">{error}</div>}
      </div>
    </div>
  )
}