import { supabase } from './supabase'

export class StorageKnowledge {
  constructor() {
    // ВАЖНО: замените на реальное имя вашего bucket из Supabase Storage
    this.bucketName = 'ai-knowledge' // проверьте имя в Supabase Dashboard
    this.fileCache = new Map()
  }

  // Получить список всех файлов
  async getFilesList() {
    const { data, error } = await supabase.storage
      .from(this.bucketName)
      .list('', { limit: 100 })
    
    if (error) throw error
    return data || []
  }

  // Скачать и прочитать файл
  async readFile(fileName) {
    if (this.fileCache.has(fileName)) {
      return this.fileCache.get(fileName)
    }

    const { data, error } = await supabase.storage
      .from(this.bucketName)
      .download(fileName)
    
    if (error) throw error
    
    const text = await data.text()
    this.fileCache.set(fileName, text)
    return text
  }

  // Поиск по содержимому файлов
  async searchInFiles(query) {
    const files = await this.getFilesList()
    const results = []

    for (const file of files) {
      try {
        const content = await this.readFile(file.name)
        if (content.toLowerCase().includes(query.toLowerCase())) {
          results.push({
            fileName: file.name,
            content: this.extractRelevantPart(content, query),
            fullContent: content
          })
        }
      } catch (error) {
        console.error(`Error reading file ${file.name}:`, error)
      }
    }

    return results
  }

  // Извлечь релевантную часть текста
  extractRelevantPart(content, query, contextLength = 300) {
    const lowerContent = content.toLowerCase()
    const lowerQuery = query.toLowerCase()
    const index = lowerContent.indexOf(lowerQuery)
    
    if (index === -1) return content.substring(0, contextLength)
    
    const start = Math.max(0, index - contextLength / 2)
    const end = Math.min(content.length, index + contextLength / 2)
    
    return content.substring(start, end)
  }

  // Получить контекст для ИИ из файлов
  async getContextFromFiles(userMessage) {
    const searchResults = await this.searchInFiles(userMessage)
    
    if (searchResults.length === 0) return ''
    
    return searchResults
      .slice(0, 3) // максимум 3 файла
      .map(result => `Из файла "${result.fileName}":\n${result.content}`)
      .join('\n\n')
  }
}

export const storageKnowledge = new StorageKnowledge()
