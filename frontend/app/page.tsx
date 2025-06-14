'use client'; // <--- ADD THIS LINE AT THE VERY TOP

import Image from "next/image";
import { useState, useRef, useEffect, useCallback } from 'react';
import Chat from "@/components/ui/Chat"; // путь скорректируйте под вашу структуру
import Head from 'next/head';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useTouChat, Message } from "@/lib/useTouChat";


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

//  силуэт для профиля
const ProfilePlaceholder = () => (
  <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" width={32} height={32}>
    <circle cx="16" cy="16" r="16" fill="#E5E7EB" />
    <ellipse cx="16" cy="13" rx="6" ry="6" fill="#9CA3AF" />
    <ellipse cx="16" cy="24" rx="10" ry="6" fill="#D1D5DB" />
  </svg>
);

// 1. Словари переводов
const translations = {
  ru: {
    dot: 'ДОТ',
    eduPortal: 'Образовательный портал',
    cabinet: 'Личный кабинет',
    instructions: 'Инструкции',
    profile: 'Профиль',
    settings: 'Настройки',
    signout: 'Выйти',
    instruction1: 'Инструкция по работе с dot.psy.kz',
    instruction2: 'Инструкция для оценки знаний обучающихся DOT',
    viewNotifications: 'Просмотреть уведомления',
    openUserMenu: 'Открыть меню пользователя',
    openMainMenu: 'Открыть главное меню',
  },
  kk: {
    dot: 'ДОТ (Қаз)',
    eduPortal: 'Білім порталы',
    cabinet: 'Жеке кабинет',
    instructions: 'Нұсқаулар',
    profile: 'Профиль',
    settings: 'Баптаулар',
    signout: 'Шығу',
    instruction1: 'dot.psy.kz-пен жұмыс істеу нұсқаулығы',
    instruction2: 'DOT білімін бағалау нұсқаулығы',
    viewNotifications: 'Хабарландыруларды қарау',
    openUserMenu: 'Пайдаланушы мәзірін ашу',
    openMainMenu: 'Негізгі мәзірді ашу',
  },
  en: {
    dot: 'DOT',
    eduPortal: 'Education Portal',
    cabinet: 'Personal Cabinet',
    instructions: 'Instructions',
    profile: 'Your Profile',
    settings: 'Settings',
    signout: 'Sign out',
    instruction1: 'Guide for dot.psy.kz',
    instruction2: 'Guide for DOT knowledge assessment',
    viewNotifications: 'View notifications',
    openUserMenu: 'Open user menu',
    openMainMenu: 'Open main menu',
  }
};

// Типы для истории чатов
type Chat = { id: string; title: string; messages: Message[] };

type TranslationKey = keyof typeof translations['ru'];
function t(key: TranslationKey, lang: string) {
  return translations[lang as keyof typeof translations]?.[key] || key;
}

const navigation = [
  { nameKey: 'dot', href: 'https://dot.tou.edu.kz/auth/login', current: true },
  { nameKey: 'eduPortal', href: 'https://tou.edu.kz/ru/?option=com_hello&view=hello&id=2&Itemid=441&lang=rus', current: true },
  { nameKey: 'cabinet', href: 'https://tou.edu.kz/student_cabinet/?auth=0&lang=rus', current: false },
  { nameKey: 'instructions', href: '#', current: false },
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
  const [instructionsOpen, setInstructionsOpen] = useState(false);
  const [chats, setChats] = useState<Chat[]>(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem("tou-chats") : null;
      if (raw) {
        const arr = JSON.parse(raw);
        return Array.isArray(arr) && arr.length > 0 ? arr : [{
          id: crypto.randomUUID(),
          title: "Новый чат",
          messages: []
        }];
      }
    } catch {}
    return [{
      id: crypto.randomUUID(),
      title: "Новый чат",
      messages: []
    }];
  });
  const [activeId, setActiveId] = useState(() => chats[0]?.id || "");

  const profileMenuRef = useRef<HTMLButtonElement>(null);
  const profileMenuItemsRef = useRef<HTMLDivElement>(null);
  const instructionsRef = useRef<HTMLDivElement>(null);

  const [isProfileModalOpen, setProfileModalOpen] = useState(false);
  const [isSettingsModalOpen, setSettingsModalOpen] = useState(false);
  const [apiKey, setApiKey] = useState(() =>
    (typeof window !== 'undefined' && localStorage.getItem('gemini-api-key')) || ''
  );
  const [apiKeyInput, setApiKeyInput] = useState(apiKey);
  const [showApiKey, setShowApiKey] = useState(false);

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
    }
    return 'light';
  });

  // Применяем тему к <html>
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      localStorage.setItem('theme', theme);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

      if (
        instructionsOpen &&
        instructionsRef.current &&
        !instructionsRef.current.contains(event.target as Node)
      ) {
        setInstructionsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [instructionsOpen]);

  // Сохраняем историю чатов в localStorage
  useEffect(() => {
    try {
      localStorage.setItem("tou-chats", JSON.stringify(chats));
    } catch {
      // ignore
    }
  }, [chats]);

  // Проверка на существование активного чата
  useEffect(() => {
    if (!chats.find(c => c.id === activeId) && chats.length > 0) {
      setActiveId(chats[0].id);
    }
  }, [chats, activeId]);

  // Создать новый чат
  const handleNewChat = useCallback(() => {
    const newChat: Chat = {
      id: crypto.randomUUID(),
      title: "Новый чат",
      messages: []
    };
    setChats(prev => [newChat, ...prev]);
    setActiveId(newChat.id);
    setInputs(prev => ({ ...prev, [newChat.id]: "" }));
    setErrors(prev => ({ ...prev, [newChat.id]: null }));
  }, []);

  // Очистить чат
  const handleClearChat = useCallback((id: string) => {
    setChats(prev =>
      prev.map(chat =>
        chat.id === id
          ? { ...chat, messages: [], title: "Новый чат" }
          : chat
      )
    );
    setInputs(prev => ({ ...prev, [id]: "" }));
    setErrors(prev => ({ ...prev, [id]: null }));
  }, []);

  // Удалить чат
  const handleDeleteChat = useCallback((id: string) => {
    setChats(prev => {
      const filtered = prev.filter(c => c.id !== id);
      if (filtered.length === 0) {
        setActiveId("");
        return [];
      }
      if (id === activeId) {
        setActiveId(filtered[0].id);
        setInputs(prev => ({ ...prev, [filtered[0].id]: "" }));
        setErrors(prev => ({ ...prev, [filtered[0].id]: null }));
      }
      return filtered;
    });
  }, [activeId]);

  // Сохраняем API-ключ в localStorage
  const handleSaveApiKey = () => {
    try {
      localStorage.setItem('gemini-api-key', apiKeyInput);
      setApiKey(apiKeyInput);
      setSettingsModalOpen(false);
      toast.success('API-ключ сохранён!');
    } catch {
      toast.error('Ошибка при сохранении API-ключа');
    }
  };

  // --- НАЧАЛО: новые состояния для Chat ---
  const [inputs, setInputs] = useState<{[id: string]: string}>({});
  const [errors, setErrors] = useState<{[id: string]: string | null}>({});
  const { sendMessage, isLoading, error } = useTouChat({ getApiKey: () => apiKey });
  // --- КОНЕЦ: новые состояния для Chat ---

  // --- НАЧАЛО: новые функции для Chat ---
  const setChatMessages = (id: string, msgs: Message[]) => {
    setChats(prev => prev.map(chat => chat.id === id ? { ...chat, messages: msgs } : chat));
  };
  const setChatInput = (id: string, value: string) => {
    setInputs(prev => ({ ...prev, [id]: value }));
  };
  const handleSend = async (msg: string) => {
    await sendMessage(msg, chats.find(c => c.id === activeId)?.messages || [],
      (msgs: Message[]) => setChatMessages(activeId, msgs),
      (v: string) => setChatInput(activeId, v)
    );
  };
  // --- КОНЕЦ: новые функции для Chat ---

  // --- ДОБАВИТЬ в handleClearChat ---
  useEffect(() => {
    setInputs(prev => ({ ...prev, [activeId]: "" }));
    setErrors(prev => ({ ...prev, [activeId]: null }));
  }, [activeId]);

  return (
    <>
      <Head>
        <title>TouGPT</title>
      </Head>
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar newestOnTop closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover />
      <div className="flex min-h-screen font-[family-name:var(--font-geist-sans)] home-with-transparent-bg dark:bg-gray-500">
        {/* Offcanvas меню для мобильных */}
        <aside className={`fixed top-16 left-0 w-64 min-w-[200px] max-w-xs h-[calc(100vh-4rem)] bg-white dark:bg-gray-900 shadow-md p-4 overflow-y-auto z-40 transition-transform duration-300 border-r border-gray-300 dark:border-gray-700 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} sm:translate-x-0 sm:block`} aria-label="История чатов">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">История чатов</h2>
            <button
              className="ml-2 px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 dark:bg-blue-800 dark:hover:bg-blue-700 transition"
              onClick={handleNewChat}
              title="Новый чат"
            >
              Новый чат
            </button>
          </div>
          <ul className="space-y-2">
            {chats.length === 0 && (
              <li className="text-gray-400 dark:text-gray-500 text-sm">Нет чатов</li>
            )}
            {chats.map((chat) => (
              <li
                key={chat.id}
                className={`rounded px-2 py-1 text-sm break-words cursor-pointer ${activeId === chat.id ? 'bg-blue-100 dark:bg-blue-950 font-semibold' : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'} text-gray-900 dark:text-gray-100`}
                onClick={() => { if (activeId !== chat.id) setActiveId(chat.id); }}
              >
                {activeId === chat.id && (
                  <div className="text-xs text-blue-700 dark:text-blue-300 font-bold mb-1">Текущий чат</div>
                )}
                <div className="flex justify-between items-center">
                  <span>{chat.title}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{chat.messages.length}</span>
                </div>
                <div className="text-xs text-gray-400 dark:text-gray-500">
                  {/* {chat.createdAt?.toLocaleString?.()} */}
                </div>
                <div className="flex gap-1 mt-1">
                  <button
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    onClick={e => { e.stopPropagation(); if (confirm('Очистить этот чат?')) handleClearChat(chat.id); }}
                  >
                    Очистить
                  </button>
                  <button
                    className="text-xs text-red-600 dark:text-red-400 hover:underline"
                    onClick={e => { e.stopPropagation(); if (confirm('Удалить этот чат?')) handleDeleteChat(chat.id); }}
                  >
                    Удалить
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </aside>

        {/* Контент справа от истории чатов */}
        <div className="flex flex-col flex-1 ml-0 sm:ml-64 min-h-screen">
          {/* Навигация */}
          <nav className="bg-gray-800 dark:bg-gray-700 w-full fixed top-0 left-0 z-50 items-center">
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
                    aria-label="Открыть главное меню"
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
                    <Image
                      alt="TOU Logo"
                      src="/tou_logo_white.png"
                      width={100}
                      height={40}
                      className="h-14 w-auto py-1"
                      priority
                    />
                  </div>
                  <div className="hidden sm:ml-6 sm:block h-full">
                    <div className="flex h-full items-center space-x-4">
                      {navigation.map((item) =>
                        item.nameKey === 'instructions' ? (
                          <div key={item.nameKey} className="relative">
                            <button
                              type="button"
                              className={classNames(
                                'bg-red-600 text-white', 
                                'hover:bg-red-700',
                                'rounded-md px-3 py-2 text-sm font-medium'
                              )}
                              onClick={() => setInstructionsOpen((open) => !open)}
                            >
                              {t(item.nameKey as TranslationKey, lang)}
                            </button>
                            {instructionsOpen && (
                              <div
                                ref={instructionsRef}
                                className="absolute right-0 mt-2 w-64 bg-white rounded-md shadow-lg z-50"
                              >
                                <a
                                  href="https://disk.yandex.kz/d/cYRW8hSGBFGOAQ"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                >
                                  {t('instruction1' as TranslationKey, lang)}
                                </a>
                                <a
                                  href="https://dot.tou.edu.kz/storage/2020_%D0%98%D0%BD%D1%81%D1%82%D1%80%D1%83%D0%BA%D1%86%D0%B8%D1%8F_%D0%9A%D0%BE%D0%BD%D1%82%D1%80%D0%BE%D0%BB%D1%8C_%D0%B7%D0%BD%D0%B0%D0%BD%D0%B8%D1%85_%D0%BE%D0%B1%D1%83%D1%87%D0%B0%D1%8E%D1%89%D0%B8%D1%85%D1%81%D1%8F_%D0%94%D0%9E%D0%A2_2020_2021.pdf"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                >
                                  {t('instruction2' as TranslationKey, lang)}
                                </a>
                              </div>
                            )}
                          </div>
                        ) : (
                          <a
                            key={item.nameKey}
                            href={item.href}
                            aria-current={item.current ? 'page' : undefined}
                            className={classNames(
                              item.current ? 'bg-gray-900 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white',
                              'rounded-md px-3 py-2 text-sm font-medium',
                            )}
                          >
                            {t(item.nameKey as TranslationKey, lang)}
                          </a>
                        )
                      )}
                    </div>
                  </div>
                </div>
                <div className="absolute inset-y-0 right-0 flex items-center pr-2 sm:static sm:inset-auto sm:ml-6 sm:pr-0">
                  

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
                        <span className="sr-only">{t('openUserMenu' as TranslationKey, lang)}</span>
                        <ProfilePlaceholder />
                      </button>
                    </div>
                    {isProfileMenuOpen && (
                      <div
                        className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black/5 focus:outline-none"
                        ref={profileMenuItemsRef}
                        role="menu"
                        aria-orientation="vertical"
                        tabIndex={-1}
                      >
                        <button
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                          role="menuitem"
                          onClick={() => { setProfileMenuOpen(false); setProfileModalOpen(true); }}
                        >
                          {t('profile' as TranslationKey, lang)}
                        </button>
                        <button
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                          role="menuitem"
                          onClick={() => { setProfileMenuOpen(false); setSettingsModalOpen(true); }}
                        >
                          {t('settings' as TranslationKey, lang)}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                {/* Кнопка выбора языка и темы */}
                <div className="absolute right-10 top-1/2 -translate-y-1/2 flex gap-2 items-center">
                  {/* Theme toggle button */}
                  <button
                    onClick={() => {
                      setTheme(theme === 'dark' ? 'light' : 'dark');
                      if (typeof window !== 'undefined') {
                        if (theme === 'dark') {
                          document.documentElement.classList.remove('dark');
                          localStorage.setItem('theme', 'light');
                        } else {
                          document.documentElement.classList.add('dark');
                          localStorage.setItem('theme', 'dark');
                        }
                      }
                    }}
                    className="px-2 py-1 rounded bg-gray-700 text-white text-xs flex items-center gap-1 hover:bg-gray-600 transition-colors"
                    aria-label={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
                    title={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
                  >
                    {theme === 'dark' ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="5" stroke="currentColor" />
                        <path strokeLinecap="round" d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3a7 7 0 109.79 9.79z" />
                      </svg>
                    )}
                  </button>
                  {/* Языки */}
                  <div className="relative">
                    <button
                      onClick={() => setLangDropdownOpen((open) => !open)}
                      className="px-3 py-1 rounded bg-gray-700 text-white text-xs flex items-center gap-1 border border-gray-400 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
                    >
                      {languages.find(l => l.code === lang)?.label}
                      <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {langDropdownOpen && (
                      <ul className="absolute right-0 mt-1 w-24 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded shadow-lg z-50">
                        {languages.map((lng) => (
                          <li key={lng.code}>
                            <button
                              onClick={() => {
                                setLang(lng.code);
                                setLangDropdownOpen(false);
                              }}
                              className={`w-full text-left px-3 py-1 text-xs ${
                                lang === lng.code ? 'bg-gray-200 dark:bg-gray-700 font-bold text-gray-900 dark:text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700'
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
          </nav>

          {isMobileMenuOpen && (
            <div className="sm:hidden" id="mobile-menu">
              <div className="space-y-1 px-2 pt-2 pb-3">
                {navigation.map((item) =>
                  item.nameKey === 'instructions' ? (
                    <div key={item.nameKey} className="relative">
                      <button
                        type="button"
                        className={classNames(
                          'bg-red-600 text-white', // красная кнопка с белым текстом
                          'hover:bg-red-700',
                          'block rounded-md px-3 py-2 text-base font-medium'
                        )}
                        onClick={() => setInstructionsOpen((open) => !open)}
                      >
                        {t(item.nameKey as TranslationKey, lang)}
                      </button>
                      {instructionsOpen && (
                        <div
                          ref={instructionsRef}
                          className="mt-1 w-full bg-white rounded-md shadow-lg z-50"
                        >
                          <a
                            href="https://disk.yandex.kz/d/cYRW8hSGBFGOAQ"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            {t('instruction1' as TranslationKey, lang)}
                          </a>
                          <a
                            href="https://dot.tou.edu.kz/storage/2020_%D0%98%D0%BD%D1%81%D1%82%D1%80%D1%83%D0%BA%D1%86%D0%B8%D1%8F_%D0%9A%D0%BE%D0%BD%D1%82%D1%80%D0%BE%D0%BB%D1%8C_%D0%B7%D0%BD%D0%B0%D0%BD%D0%B8%D1%85_%D0%BE%D0%B1%D1%83%D1%87%D0%B0%D1%8E%D1%89%D0%B8%D1%85%D1%81%D1%8F_%D0%94%D0%9E%D0%A2_2020_2021.pdf"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            {t('instruction2' as TranslationKey, lang)}
                          </a>
                        </div>
                      )}
                    </div>
                  ) : (
                    <a
                      key={item.nameKey}
                      href={item.href}
                      aria-current={item.current ? 'page' : undefined}
                      className={classNames(
                        item.current ? 'bg-gray-900 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white',
                        'block rounded-md px-3 py-2 text-base font-medium',
                      )}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {t(item.nameKey as TranslationKey, lang)}
                    </a>
                  )
                )}
              </div>
            </div>
          )}
        </div>

        {/* Основной контент и Aisha */}
        <main className="flex flex-row gap-[32px] flex-1 w-full max-w-6xl mx-auto pt-16 relative">
          <Image
            src="/AISHA.svg"
            alt="AISHA"
            width={300}
            height={300}
            className="pointer-events-none select-none fixed right-10 bottom-24 z-10 opacity-90"
            style={{ objectFit: "contain" }}
            priority
          />
          {/* Основной контент */}
          <section className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 w-full max-w-3xl min-h-[600px] p-8 bg-white dark:bg-gray-900 rounded-xl shadow-lg sm:w-full sm:min-h-[60vh]">
            {chats.length === 0 || !activeId ? (
              <div className="flex flex-col items-center justify-center w-full h-full">
                <p className="text-gray-500 dark:text-gray-400 mb-4">Нет активного чата</p>
                <button
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 dark:bg-blue-800 dark:hover:bg-blue-700 transition"
                  onClick={handleNewChat}
                >
                  Создать чат
                </button>
              </div>
            ) : (
              <div className="flex flex-col w-full h-full">
                <Chat
                  lang={lang}
                  messages={chats.find(c => c.id === activeId)?.messages || []}
                  input={inputs[activeId] || ""}
                  setInput={v => setChatInput(activeId, v)}
                  handleSend={handleSend}
                  isLoading={isLoading}
                  error={error || errors[activeId] || null}
                />
              </div>
            )}
          </section>
        </main>
      </div>

      {/* Profile/Settings Modals */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 min-w-[320px] relative max-w-[95vw] w-full sm:w-[400px]">
            <button className="absolute top-2 right-2 text-gray-500 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white" onClick={() => setProfileModalOpen(false)}>&times;</button>
            <h2 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100 flex items-center gap-2">Профиль</h2>
            <div className="text-sm text-gray-700 dark:text-gray-300">Здесь может быть информация о пользователе.</div>
          </div>
        </div>
      )}
      {isSettingsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 min-w-[320px] relative max-w-[95vw] w-full sm:w-[400px]">
            <button className="absolute top-2 right-2 text-gray-500 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white" onClick={() => setSettingsModalOpen(false)}>&times;</button>
            <h2 className="text-lg font-semibold mb-2 flex items-center gap-2 text-gray-900 dark:text-gray-100">
              <span role="img" aria-label="key">🔑</span> API-ключ Gemini
            </h2>
            <div className="mb-2 text-sm text-gray-700 dark:text-gray-300">Ключ для доступа к AI</div>
            <input
              className="w-full border rounded px-2 py-1 mb-2 pr-10 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700 placeholder-gray-400 dark:placeholder-gray-500"
              value={apiKeyInput}
              onChange={e => setApiKeyInput(e.target.value)}
              placeholder="Введите ключ Gemini API..."
              type={showApiKey ? "text" : "password"}
              autoComplete="off"
            />
            <button
              type="button"
              className="absolute right-4 top-[70px] text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200"
              onClick={() => setShowApiKey(v => !v)}
              tabIndex={-1}
              aria-label={showApiKey ? "Скрыть ключ" : "Показать ключ"}
            >
              {showApiKey ? (
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path stroke="#6B7280" strokeWidth="2" d="M3 12s3.5-7 9-7 9 7 9 7-3.5 7-9 7-9-7-9-7Z"/><circle cx="12" cy="12" r="3" stroke="#6B7280" strokeWidth="2"/></svg>
              ) : (
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path stroke="#6B7280" strokeWidth="2" d="M17.94 17.94A9.956 9.956 0 0 1 12 19c-5.5 0-9-7-9-7a17.978 17.978 0 0 1 4.06-5.94M21 21 3 3"/><path stroke="#6B7280" strokeWidth="2" d="M9.53 9.53A3 3 0 0 0 12 15a3 3 0 0 0 2.47-5.47"/></svg>
              )}
            </button>
            <button
              className="bg-blue-600 dark:bg-blue-700 text-white px-4 py-1 rounded hover:bg-blue-700 dark:hover:bg-blue-800 transition w-full mt-2"
              onClick={handleSaveApiKey}
              disabled={!apiKeyInput.trim()}
            >
              💾 Сохранить ключ
            </button>
            <div className="mt-4 text-xs text-gray-600 dark:text-gray-400 space-y-2">
              <div className="font-semibold mb-1">Как получить API-ключ:</div>
              <ol className="list-decimal list-inside space-y-1">
                <li>Перейдите на <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 underline">Google AI Studio</a></li>
                <li>Войдите в аккаунт Google</li>
                <li>Нажмите <b>&quot;Create API key&quot;</b></li>
                <li>Скопируйте ключ и вставьте сюда</li>
              </ol>
              <div className="mt-2 text-gray-500 dark:text-gray-400">Ключ сохраняется <b>только в вашем браузере</b> и используется для запросов к AI.</div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}