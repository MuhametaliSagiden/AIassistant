'use client'; // <--- ADD THIS LINE AT THE VERY TOP

import Image from "next/image";
import { useState, useRef, useEffect, useCallback } from 'react';
import Chat from "@/components/ui/Chat"; // путь скорректируйте под вашу структуру


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
type Message = { role: "user" | "assistant"; content: string };
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

  const [theme] = useState<'light' | 'dark'>(() => {
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
  }, []);

  // Удалить чат
  const handleDeleteChat = useCallback((id: string) => {
    setChats(prev => {
      const filtered = prev.filter(c => c.id !== id);
      if (filtered.length === 0) {
        const newChat: Chat = {
          id: crypto.randomUUID(),
          title: "Новый чат",
          messages: []
        };
        setActiveId(newChat.id);
        return [newChat];
      }
      if (id === activeId) {
        setActiveId(filtered[0].id);
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
    } catch {
      // handle error
    }
  };

  return (
    <div className="flex min-h-screen font-[family-name:var(--font-geist-sans)] home-with-transparent-bg dark:bg-gray-500">
      {/* Левая панель: История чатов */}
      <aside className="fixed top-16 left-0 w-64 min-w-[200px] max-w-xs h-[calc(100vh-4rem)] bg-white shadow-md p-4 overflow-y-auto z-40 hidden sm:block">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold">История чатов</h2>
          <button
            className="ml-2 px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition"
            onClick={handleNewChat}
            title="Новый чат"
          >
            Новый чат
          </button>
        </div>
        <ul className="space-y-2">
          {chats.length === 0 && (
            <li className="text-gray-400 text-sm">Нет чатов</li>
          )}
          {chats.map((chat) => (
            <li
              key={chat.id}
              className={`rounded px-2 py-1 text-sm break-words cursor-pointer ${activeId === chat.id ? 'bg-blue-100 font-semibold' : 'bg-gray-100 hover:bg-gray-200'}`}
              onClick={() => setActiveId(chat.id)}
            >
              <div className="flex justify-between items-center">
                <span>{chat.title}</span>
                <span className="text-xs text-gray-500">{chat.messages.length}</span>
              </div>
              <div className="text-xs text-gray-400">
                {}
                {/* {chat.createdAt?.toLocaleString?.()} */}
              </div>
              <div className="flex gap-1 mt-1">
                <button
                  className="text-xs text-blue-600 hover:underline"
                  onClick={e => { e.stopPropagation(); handleClearChat(chat.id); }}
                >
                  Очистить
                </button>
                <button
                  className="text-xs text-red-600 hover:underline"
                  onClick={e => { e.stopPropagation(); handleDeleteChat(chat.id); }}
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
                      <Image
                        alt="profile"
                        src="https://avatars.mds.yandex.net/i?id=bac93d8d9b0affd8a068e0d0301e4431_l-12414924-images-thumbs&n=13"
                        width={40}
                        height={40}
                        className="size-8 rounded-full"
                      />
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
              <div className="absolute right-10 top-1/2 -translate-y-1/2 flex gap-2">
                {/* Языки */}
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
        </nav>

        {/* Основной контент и Aisha */}
        <main className="flex flex-row gap-[32px] flex-1 w-full max-w-6xl mx-auto pt-16 relative">
          <Image
            src="/AISHA.svg"
            alt="AISHA"
            width={300}
            height={300}
            className="pointer-events-none select-none absolute right-40 bottom-24 z-10 opacity-90"
            style={{ objectFit: "contain" }}
            priority
          />
          {/* Основной контент */}
          <section
            className="
              fixed
              top-1/2 left-1/2
              -translate-x-1/2 -translate-y-1/2
              z-50
              flex flex-col gap-4 w-full max-w-lg
              items-center
              bg-white dark:bg-gray-100 rounded-xl shadow-lg
            "
            style={{ minWidth: 350 }}
          >
            {/* Передаём тему в Chat */}
            <Chat lang={lang} width="90vh" height="50vh" key={activeId} />
          </section>
        </main>
      </div>

      {/* Profile/Settings Modals */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-lg p-6 min-w-[320px] relative">
            <button className="absolute top-2 right-2 text-gray-500 hover:text-gray-800" onClick={() => setProfileModalOpen(false)}>&times;</button>
            <h2 className="text-lg font-semibold mb-2">Профиль</h2>
            <div className="text-sm text-gray-700">Здесь может быть информация о пользователе.</div>
          </div>
        </div>
      )}
      {isSettingsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-lg p-6 min-w-[320px] relative">
            <button className="absolute top-2 right-2 text-gray-500 hover:text-gray-800" onClick={() => setSettingsModalOpen(false)}>&times;</button>
            <h2 className="text-lg font-semibold mb-2">Настройки</h2>
            <div className="mb-2 text-sm">API-ключ Gemini:</div>
            <input
              type="text"
              className="w-full border rounded px-2 py-1 mb-2"
              value={apiKeyInput}
              onChange={e => setApiKeyInput(e.target.value)}
              placeholder="Введите ваш Google Gemini API ключ"
            />
            <button
              className="bg-blue-600 text-white px-4 py-1 rounded hover:bg-blue-700 transition"
              onClick={handleSaveApiKey}
              disabled={!apiKeyInput.trim()}
            >
              Сохранить
            </button>
            {apiKey && (
              <div className="mt-2 text-xs text-gray-500 break-all">Текущий ключ: {apiKey}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}