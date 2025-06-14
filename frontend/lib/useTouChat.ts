import { useState } from "react";

export type Message = { role: "user" | "assistant"; content: string };

interface UseTouChatOptions {
  initialMessages?: Message[];
  getApiKey?: () => string | null | undefined;
}

// В production используем proxy через Next.js, в dev — прямой адрес
const API_URL =
  typeof window !== "undefined" && process.env.NODE_ENV === "production"
    ? "https://aiassistant-d9df.onrender.com/api/ask"
    : "http://localhost:8000/api/ask";

export function useTouChat(options: UseTouChatOptions = {}) {
  const { getApiKey } = options;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = async (input: string, messages: Message[], setMessages: (msgs: Message[]) => void, setInput: (v: string) => void) => {
    if (!input.trim()) return;
    const userMessage: Message = { role: "user", content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setIsLoading(true);
    setError(null);
    try {
      const apiKey = getApiKey?.();
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: input, ...(apiKey ? { api_key: apiKey } : {}) }),
      });
      if (!res.ok) throw new Error("Ошибка сервера");
      const data = await res.json();
      setMessages([...newMessages, { role: "assistant", content: data.answer || "Нет ответа от ассистента." }]);
      setInput("");
    } catch (err) {
      if (err instanceof Error) setError(err.message || "Ошибка отправки запроса");
      else setError("Ошибка отправки запроса");
    } finally {
      setIsLoading(false);
    }
  };
  const handleClear = (setMessages: (msgs: Message[]) => void) => setMessages([]);
  const handleError = () => setError(null);
  return { sendMessage, handleClear, handleError, isLoading, error };
} 