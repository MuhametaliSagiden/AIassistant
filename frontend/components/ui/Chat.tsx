"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { Send, Loader2, Plus, Trash2, Moon, Sun } from "lucide-react"

// Типы для чата и сообщений
interface Message {
  id: string
  role: "user" | "assistant"
  content: string
}
interface Chat {
  id: string
  title: string
  messages: Message[]
}

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

export default function Chat() {
  // История чатов
  const [chats, setChats] = useState<Chat[]>(() => {
    try {
      const raw = localStorage.getItem("tou-chats")
      if (raw) {
        const arr = JSON.parse(raw)
        return Array.isArray(arr) && arr.length > 0 ? arr : [{ id: crypto.randomUUID(), title: "Новый чат", messages: [] }]
      }
    } catch {}
    return [{ id: crypto.randomUUID(), title: "Новый чат", messages: [] }]
  })
  const [activeId, setActiveId] = useState(() => chats[0]?.id || "")
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [theme, setTheme] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("tou-theme") || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
    }
    return "light"
  })
  // Адаптивность
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Сохраняем чаты и тему
  useEffect(() => { localStorage.setItem("tou-chats", JSON.stringify(chats)) }, [chats])
  useEffect(() => { localStorage.setItem("tou-theme", theme); document.documentElement.classList.toggle("dark", theme === "dark") }, [theme])

  // Прокрутка к последнему сообщению
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }) }, [activeId, chats])

  // Проверка на существование активного чата
  useEffect(() => {
    if (!chats.find(c => c.id === activeId) && chats.length > 0) setActiveId(chats[0].id)
  }, [chats, activeId])

  const activeChat = chats.find(c => c.id === activeId) || chats[0]

  // Отправка сообщения
  async function handleSend(e?: React.FormEvent) {
    if (e) e.preventDefault()
    if (!input.trim() || loading) return
    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: input.trim() }
    setChats(prev => prev.map(chat => chat.id === activeId ? { ...chat, messages: [...chat.messages, userMsg] } : chat))
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
      setChats(prev => prev.map(chat => chat.id === activeId ? { ...chat, messages: [...chat.messages, aiMsg], title: chat.title === "Новый чат" ? getChatTitle([userMsg, ...chat.messages]) : chat.title } : chat))
      if (!res.ok) setError(data?.answer || "Ошибка сервера. Попробуйте позже.")
    } catch (err: unknown) {
      let errorMessage = "Нет соединения с сервером. Проверьте интернет или попробуйте позже."
      if (err && typeof err === 'object' && 'name' in err && (err as { name?: string }).name === 'AbortError') {
        errorMessage = "Превышено время ожидания ответа. Попробуйте позже."
      }
      setChats(prev => prev.map(chat => chat.id === activeId ? { ...chat, messages: [...chat.messages, { id: crypto.randomUUID(), role: "assistant", content: errorMessage }] } : chat))
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  // Создание нового чата
  function handleNewChat() {
    const newChat: Chat = { id: crypto.randomUUID(), title: "Новый чат", messages: [] }
    setChats(prev => [newChat, ...prev])
    setActiveId(newChat.id)
    setInput("")
    setError(null)
    setSidebarOpen(false)
  }

  // Удаление чата
  function handleDeleteChat(id: string) {
    setChats(prev => {
      const filtered = prev.filter(c => c.id !== id)
      if (filtered.length === 0) {
        const newChat: Chat = { id: crypto.randomUUID(), title: "Новый чат", messages: [] }
        setActiveId(newChat.id)
        return [newChat]
      }
      if (id === activeId) setActiveId(filtered[0].id)
      return filtered
    })
  }

  // Смена темы
  function handleToggleTheme() { setTheme(t => t === "dark" ? "light" : "dark") }

  // UI
  return (
    <div className="flex w-full max-w-5xl h-[70vh] min-h-[400px] rounded-lg shadow-lg overflow-hidden bg-background border border-border">
      {/* Sidebar (история чатов) */}
      <aside className={cn("flex flex-col bg-muted/40 w-64 min-w-[180px] max-w-[260px] h-full border-r border-border transition-all duration-300 z-20", sidebarOpen ? "block" : "hidden sm:block")}> 
        <div className="flex items-center justify-between p-4 border-b border-border">
          <span className="font-bold text-lg">Чаты</span>
          <Button variant="ghost" size="icon" onClick={handleNewChat} title="Новый чат"><Plus /></Button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {chats.map(chat => (
            <div key={chat.id} className={cn("flex items-center gap-2 px-4 py-2 cursor-pointer group", chat.id === activeId ? "bg-primary/10" : "hover:bg-muted/60")}
              onClick={() => { setActiveId(chat.id); setSidebarOpen(false) }}>
              <Avatar className="h-7 w-7"><AvatarFallback>💬</AvatarFallback></Avatar>
              <span className="flex-1 truncate text-sm">{chat.title}</span>
              <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100" onClick={e => { e.stopPropagation(); handleDeleteChat(chat.id) }} title="Удалить чат"><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
        </div>
        <div className="p-4 flex gap-2">
          <Button variant="outline" className="w-full" onClick={handleToggleTheme} title="Сменить тему">
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />} {theme === "dark" ? "Светлая" : "Тёмная"}
          </Button>
        </div>
      </aside>
      {/* Mobile sidebar toggle */}
      <button className="sm:hidden absolute left-2 top-2 z-30 bg-muted/80 rounded-full p-2 border border-border shadow" onClick={() => setSidebarOpen(o => !o)}><span className="sr-only">Открыть меню</span>☰</button>
      {/* Main chat area */}
      <div className="flex-1 flex flex-col h-full">
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
    </div>
  )
}