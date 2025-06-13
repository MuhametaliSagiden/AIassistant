import { useState } from "react";

export type Message = { role: "user" | "assistant"; content: string };

// В production используем proxy через Next.js, в dev — прямой адрес
const API_URL =
  typeof window !== "undefined" && process.env.NODE_ENV === "production"
    ? "/api/ask"
    : "http://localhost:8000/api/ask";

export function useTouChat(initialMessages: Message[] = []) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    const userMessage: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: input }),
      });
      if (!res.ok) throw new Error("Ошибка сервера");
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.answer || "Нет ответа от ассистента." },
      ]);
      setInput("");
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message || "Ошибка отправки запроса");
      } else {
        setError("Ошибка отправки запроса");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
    setMessages,
    setInput,
  };
} 