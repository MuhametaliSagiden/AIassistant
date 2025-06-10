import React, { useState } from 'react'
import { supabase } from '../lib/supabase'
import { knowledgeBase } from '../lib/knowledgeBase'
import { storageKnowledge } from '../lib/storageKnowledge'

const ChatBot = () => {
  const [userInput, setUserInput] = useState('')
  const [messages, setMessages] = useState([])
  const [isLoading, setIsLoading] = useState(false)

  const saveMessage = async (message, isUser) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert([
          {
            content: message,
            is_user: isUser,
            created_at: new Date()
          }
        ])
      
      if (error) console.error('Error saving message:', error)
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const handleSendMessage = async () => {
    if (!userInput.trim()) return

    const userMessage = userInput.trim()
    setMessages(prev => [...prev, { text: userMessage, isUser: true }])
    setUserInput('')
    setIsLoading(true)

    try {
      // Получить контекст из файлов в Storage
      const fileContext = await storageKnowledge.getContextFromFiles(userMessage)
      
      // Создать промпт с контекстом из файлов
      const enhancedPrompt = fileContext 
        ? `Контекст из загруженных файлов:\n${fileContext}\n\nВопрос пользователя: ${userMessage}`
        : userMessage

      // Здесь нужно добавить ваш API вызов к ИИ
      // const response = await fetch('YOUR_AI_API_ENDPOINT', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ message: enhancedPrompt })
      // })

      // Временная заглушка для тестирования
      const aiMessage = `Ответ ИИ на: ${userMessage}`
      setMessages(prev => [...prev, { text: aiMessage, isUser: false }])
      
      // Сохранить диалог для обучения
      await knowledgeBase.saveConversation(userMessage, aiMessage)

    } catch (error) {
      console.error('Error:', error)
      setMessages(prev => [...prev, { 
        text: 'Извините, произошла ошибка при поиске в файлах', 
        isUser: false 
      }])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div>
      {/* Ваш компонент чата */}
    </div>
  )
}

export default ChatBot