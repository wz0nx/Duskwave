// Local storage functions for chat history (Firebase replacement)
export interface ChatHistory {
  id: string
  title: string
  character: string
  messages: any[]
  createdAt: Date
  updatedAt: Date
}

const STORAGE_KEY = "duskwave_chat_history"

export const saveChatHistory = (title: string, character: string, messages: any[]): string => {
  try {
    const existingHistory = getChatHistory()
    const newChat: ChatHistory = {
      id: Date.now().toString(),
      title,
      character,
      messages,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const updatedHistory = [newChat, ...existingHistory].slice(0, 50) // Keep only 50 most recent
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory))
    return newChat.id
  } catch (error) {
    console.error("Error saving chat history:", error)
    return ""
  }
}

export const getChatHistory = (): ChatHistory[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return []

    const parsed = JSON.parse(stored)
    return parsed.map((chat: any) => ({
      ...chat,
      createdAt: new Date(chat.createdAt),
      updatedAt: new Date(chat.updatedAt),
    }))
  } catch (error) {
    console.error("Error getting chat history:", error)
    return []
  }
}

export const deleteChatHistory = (chatId: string): boolean => {
  try {
    const existingHistory = getChatHistory()
    const updatedHistory = existingHistory.filter((chat) => chat.id !== chatId)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory))
    return true
  } catch (error) {
    console.error("Error deleting chat history:", error)
    return false
  }
}

export const updateChatHistory = (chatId: string, title: string, character: string, messages: any[]): boolean => {
  try {
    const existingHistory = getChatHistory()
    const chatIndex = existingHistory.findIndex((chat) => chat.id === chatId)

    if (chatIndex !== -1) {
      existingHistory[chatIndex] = {
        ...existingHistory[chatIndex],
        title,
        character,
        messages,
        updatedAt: new Date(),
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(existingHistory))
      return true
    }
    return false
  } catch (error) {
    console.error("Error updating chat history:", error)
    return false
  }
}
