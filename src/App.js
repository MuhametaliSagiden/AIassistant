import React, { useState } from 'react'
import ChatBot from './components/ChatBot'
import FileManager from './components/FileManager'
// ...existing imports...

function App() {
  const [activeTab, setActiveTab] = useState('chat')

  return (
    <div className="App">
      <nav className="app-nav">
        <button 
          onClick={() => setActiveTab('chat')}
          className={activeTab === 'chat' ? 'active' : ''}
        >
          Чат с ИИ
        </button>
        <button 
          onClick={() => setActiveTab('files')}
          className={activeTab === 'files' ? 'active' : ''}
        >
          Управление файлами
        </button>
      </nav>

      <main className="app-main">
        {activeTab === 'chat' && <ChatBot />}
        {activeTab === 'files' && <FileManager />}
      </main>
    </div>
  )
}

// ...existing code...