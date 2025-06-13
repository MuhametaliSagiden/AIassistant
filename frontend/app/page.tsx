'use client'; // <--- ADD THIS LINE AT THE VERY TOP

import React from "react";
import { useState, useRef, useEffect } from 'react';
import ChatComponent from "@/components/ui/Chat";
import type { Chat } from "@/lib/types";

// Manual implementation of classNames utility
function classNames(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

// SVG for Bars (hamburger) icon
const Bars3Icon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
  </svg>
);

// SVG for X (close) icon
const XMarkIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

// SVG for Bell icon
const BellIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a2.323 2.323 0 0 0 1.277-1.465c.447-.834.052-1.895-.826-2.396l-.799-.451m0 0A2.191 2.191 0 0 0 16 9.75c0-.776-.566-1.41-1.31-1.611a1.472 1.472 0 0 0-1.429-.115L12 9h-1.259L10.313 7.828c-.469-.375-.802-.93-1-1.579C8.347 5.617 7.7 5.25 7 5.25c-.754 0-1.408.367-1.748.979a1.996 1.996 0 0 0-.256 1.026c-.053.864-.447 1.636-1.109 2.091L4.5 11.25a2.191 2.191 0 0 0-1.277 1.465A2.323 2.323 0 0 0 2.25 12c0-.776-.566-1.41-1.31-1.611a1.472 1.472 0 0 0-1.429-.115L0 9h-1.259L-2.687 7.828c-.469-.375-.802-.93-1-1.579C-4.347 5.617-4.7 5.25-5.451 5.25c-.754 0-1.408.367-1.748.979a1.996 1.996 0 0 0-.256 1.026c-.053.864-.447 1.636-1.109 2.091L-7.5 11.25" />
  </svg>
);

const navigation = [
  { name: 'ДОТ', href: '#', current: true },
  { name: 'TOU.EDU', href: '#', current: false },
  { name: 'Личный кабинет', href: '#', current: false },
  { name: 'Инструкции', href: '#', current: false },
];

const languages = [
  { code: 'en', label: 'Eng' },
  { code: 'kk', label: 'Қаз' },
  { code: 'ru', label: 'Рус' },
];

export default function Home() {
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isProfileMenuOpen, setProfileMenuOpen] = useState(false);
  const [lang, setLang] = useState('ru');
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);

  const profileMenuRef = useRef<HTMLButtonElement>(null);
  const profileMenuItemsRef = useRef<HTMLDivElement>(null);

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
  const [theme, setTheme] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("tou-theme") || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
    }
    return "light"
  })
  const [showChatDropdown, setShowChatDropdown] = useState(false)

  useEffect(() => { localStorage.setItem("tou-chats", JSON.stringify(chats)) }, [chats])
  useEffect(() => { localStorage.setItem("tou-theme", theme); document.documentElement.classList.toggle("dark", theme === "dark") }, [theme])

  function handleNewChat() {
    const newChat: Chat = { id: crypto.randomUUID(), title: "Новый чат", messages: [] }
    setChats(prev => [newChat, ...prev])
    setActiveId(newChat.id)
    setShowChatDropdown(false)
  }
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
  function handleToggleTheme() { setTheme(t => t === "dark" ? "light" : "dark") }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target as Node) &&
        profileMenuItemsRef.current &&
        !profileMenuItemsRef.current.contains(event.target as Node)
      ) {
        setProfileMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-cover bg-center" style={{ backgroundImage: 'url("/AISHA.PNG")' }}>
      {/* Overlay затемнение */}
      <div className="absolute inset-0 bg-black/40 z-0" />

      <nav className="bg-gray-800/90 w-full fixed top-0 left-0 z-10 items-center shadow-md backdrop-blur-md">
        <div className="mx-auto px-2 sm:px-6 lg:px-8 items-center">
          <div className="relative flex h-16 justify-center items-center">
            <div className="absolute inset-y-0 left-0 flex sm:hidden items-center">
              {/* Mobile menu button */}
              <button
                type="button"
                className="relative inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:bg-gray-700 hover:text-white focus:ring-2 focus:ring-white focus:outline-none focus:ring-inset"
                onClick={() => setMobileMenuOpen(!isMobileMenuOpen)}
                aria-controls="mobile-menu"
                aria-expanded={isMobileMenuOpen}
              >
                <span className="absolute -inset-0.5" />
                <span className="sr-only">Open main menu</span>
                {isMobileMenuOpen ? (
                  <XMarkIcon aria-hidden="true" className="block size-6" />
                ) : (
                  <Bars3Icon aria-hidden="true" className="block size-6" />
                )}
              </button>
            </div>
            <div className="flex flex-1 items-center h-full justify-center sm:items-stretch sm:justify-start">
              <div className="flex py-2 shrink-0 items-center">
                <img
                  alt="TOU Logo"
                  src="/AISHA.svg"
                  width={48}
                  height={48}
                  className="h-12 w-auto py-1 drop-shadow"
                />
              </div>
              <div className="hidden sm:ml-6 sm:block h-full">
                <div className="flex h-full items-center space-x-4">
                  {navigation.map((item) => (
                    <a
                      key={item.name}
                      href={item.href}
                      aria-current={item.current ? 'page' : undefined}
                      className={classNames(
                        item.current ? 'bg-gray-900 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white',
                        'rounded-md px-3 py-2 text-sm font-medium',
                      )}
                    >
                      {item.name}
                    </a>
                  ))}
                </div>
              </div>
            </div>
            <div className="absolute inset-y-0 right-0 flex items-center pr-2 sm:static sm:inset-auto sm:ml-6 sm:pr-0">
              <button
                type="button"
                className="relative rounded-full bg-gray-800 p-1 text-gray-400 hover:text-white focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-800 focus:outline-none"
              >
                <span className="absolute -inset-1.5" />
                <span className="sr-only">View notifications</span>
                <BellIcon aria-hidden="true" className="size-6" />
              </button>

              {/* Profile dropdown */}
              <div className="relative ml-3">
                <div>
                  <button
                    type="button"
                    className="relative flex rounded-full bg-gray-800 text-sm focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-800 focus:outline-none"
                    onClick={() => setProfileMenuOpen(!isProfileMenuOpen)}
                    ref={profileMenuRef}
                    aria-haspopup="true"
                    aria-expanded={isProfileMenuOpen}
                  >
                    <span className="absolute -inset-1.5" />
                    <span className="sr-only">Open user menu</span>
                    <img
                      alt="profile"
                      src="https://avatars.mds.yandex.net/i?id=bac93d8d9b0affd8a068e0d0301e4431_l-12414924-images-thumbs&n=13"
                      width={32}
                      height={32}
                      className="size-8 rounded-full"
                    />
                  </button>
                </div>
                {/* История чатов */}
                <button
                  className="ml-2 p-2 rounded-full bg-gray-700 text-white hover:bg-gray-600 flex items-center justify-center"
                  onClick={() => setShowChatDropdown(v => !v)}
                  title="История чатов"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25v-1.5A2.25 2.25 0 0 1 9.75 4.5h4.5a2.25 2.25 0 0 1 2.25 2.25v1.5m-9 0h9m-9 0A2.25 2.25 0 0 0 3 10.5v6.75A2.25 2.25 0 0 0 5.25 19.5h13.5A2.25 2.25 0 0 0 21 17.25V10.5a2.25 2.25 0 0 0-2.25-2.25m-9 0v1.5m0 0a2.25 2.25 0 0 0 2.25 2.25h1.5a2.25 2.25 0 0 0 2.25-2.25v-1.5" />
                  </svg>
                </button>
                {showChatDropdown && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded shadow-lg z-50 p-2">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-sm">История чатов</span>
                      <button className="text-xs px-2 py-1 bg-primary text-white rounded" onClick={handleNewChat}>+ Новый</button>
                    </div>
                    <div className="max-h-60 overflow-y-auto divide-y">
                      {chats.map(chat => (
                        <div key={chat.id} className={`flex items-center gap-2 px-2 py-1 cursor-pointer ${chat.id === activeId ? 'bg-primary/10' : 'hover:bg-muted/60'}`}
                          onClick={() => { setActiveId(chat.id); setShowChatDropdown(false) }}>
                          <span className="truncate text-xs flex-1">{chat.title}</span>
                          <button className="text-destructive text-xs" onClick={e => { e.stopPropagation(); handleDeleteChat(chat.id) }}>✕</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {/* Кнопка смены темы */}
              <button className="ml-2 p-2 rounded-full bg-gray-700 text-white hover:bg-gray-600 flex items-center justify-center" onClick={handleToggleTheme} title="Сменить тему">
                {theme === "dark" ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1.5m0 15V21m8.485-8.485h-1.5m-15 0H3m15.364-6.364l-1.06 1.06m-12.728 0l-1.06-1.06m12.728 12.728l-1.06-1.06m-12.728 0l-1.06 1.06M16.24 7.76A6 6 0 1 1 7.76 16.24 6 6 0 0 1 16.24 7.76z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z" />
                  </svg>
                )}
              </button>
            </div>
            {/* Кнопка выбора языка */}
            <div className="absolute right-32 top-1/2 -translate-y-1/2">
              <div className="relative">
                <button
                  onClick={() => setLangDropdownOpen((open) => !open)}
                  className="px-3 py-1 rounded bg-gray-700 text-white text-xs flex items-center gap-1"
                >
                  {languages.find(l => l.code === lang)?.label}
                  <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {langDropdownOpen && (
                  <ul className="absolute right-0 mt-1 w-24 bg-white rounded shadow z-50">
                    {languages.map((lng) => (
                      <li key={lng.code}>
                        <button
                          onClick={() => {
                            setLang(lng.code);
                            setLangDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-1 text-xs ${
                            lang === lng.code ? 'bg-gray-200 font-bold text-gray-900' : 'hover:bg-gray-100'
                          }`}
                        >
                          {lng.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>

        {isMobileMenuOpen && (
          <div className="sm:hidden" id="mobile-menu">
            <div className="space-y-1 px-2 pt-2 pb-3">
              {navigation.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  aria-current={item.current ? 'page' : undefined}
                  className={classNames(
                    item.current ? 'bg-gray-900 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white',
                    'block rounded-md px-3 py-2 text-base font-medium',
                  )}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.name}
                </a>
              ))}
            </div>
          </div>
        )}
      </nav>

      <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start mt-16">
        <ChatComponent key={activeId} chatId={activeId} chats={chats} setChats={setChats} />
      </main>
    </div>
  );
}