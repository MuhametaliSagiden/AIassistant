import React, { useState, useEffect } from 'react'
import { storageKnowledge } from '../lib/storageKnowledge'

const FileManager = () => {
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])

  useEffect(() => {
    loadFiles()
  }, [])

  const loadFiles = async () => {
    setLoading(true)
    try {
      const filesList = await storageKnowledge.getFilesList()
      setFiles(filesList)
    } catch (error) {
      console.error('Error loading files:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    
    setLoading(true)
    try {
      const results = await storageKnowledge.searchInFiles(searchQuery)
      setSearchResults(results)
    } catch (error) {
      console.error('Error searching files:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="file-manager">
      <h3>Управление файлами знаний</h3>
      
      <div className="search-section">
        <input
          type="text"
          placeholder="Поиск в файлах..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <button onClick={handleSearch} disabled={loading}>
          Найти
        </button>
      </div>

      <div className="files-list">
        <h4>Загруженные файлы ({files.length})</h4>
        {loading ? (
          <div>Загрузка...</div>
        ) : (
          <ul>
            {files.map((file, index) => (
              <li key={index}>
                {file.name} ({new Date(file.created_at).toLocaleDateString()})
              </li>
            ))}
          </ul>
        )}
      </div>

      {searchResults.length > 0 && (
        <div className="search-results">
          <h4>Результаты поиска</h4>
          {searchResults.map((result, index) => (
            <div key={index} className="search-result">
              <strong>{result.fileName}</strong>
              <p>{result.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default FileManager
