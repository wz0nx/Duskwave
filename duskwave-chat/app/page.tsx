"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Send, User, Plus, Trash2, Sun, Moon, Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTheme } from "next-themes"
import Image from "next/image"
import {
  saveChatHistory,
  getChatHistory,
  deleteChatHistory,
  updateChatHistory,
  type ChatHistory,
} from "@/lib/localStorage"

interface Message {
  id: string
  content: string
  role: "user" | "assistant"
  timestamp: Date
}

interface Character {
  id: string
  name: string
  image: string
  personality: string
  systemPrompt: string
}

const characters: Character[] = [
  {
    id: "raiden-shogun",
    name: "Raiden Shogun",
    image: "/characters/raiden-shogun.jpg",
    personality: "Electro Archon, Eternal and Unwavering",
    systemPrompt: `You are Raiden Shogun, the Electro Archon and ruler of Inazuma.`,
  },
  {
    id: "hoshimi-miyabi",
    name: "Hoshimi Miyabi",
    image: "/characters/hoshimi-miyabi.jpg",
    personality: "Void Hunter, Calm and Mysterious",
    systemPrompt: `You are Hoshimi Miyabi, a skilled Void Hunter from Section 6.`,
  },
  {
    id: "saki-ayase",
    name: "Saki Ayase",
    image: "/characters/saki-ayase.jpg",
    personality: "Cheerful and Devoted Maid",
    systemPrompt: `You are Saki Ayase, a dedicated and cheerful maid.`,
  },
  {
    id: "columbina",
    name: "Columbina",
    image: "/characters/columbina.jpg",
    personality: "Damselette, Mysterious and Ethereal",
    systemPrompt: `You are Columbina, the 3rd of the Fatui Harbingers, known as "Damselette."`,
  },
  {
    id: "sagiri",
    name: "Sagiri",
    image: "/characters/sagiri.jpg",
    personality: "Yamada Asaemon, Stoic and Determined",
    systemPrompt: `You are Sagiri, a member of the Yamada Asaemon clan and skilled executioner.`,
  },
  {
    id: "arlecchino",
    name: "Arlecchino",
    image: "/characters/arlecchino.jpg",
    personality: "The Knave, Calculating and Elegant",
    systemPrompt: `You are Arlecchino, the 4th of the Fatui Harbingers, known as "The Knave."`,
  },
]

export default function DuskwaveChat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [selectedCharacter, setSelectedCharacter] = useState<string>(characters[0].id)
  const [isLoading, setIsLoading] = useState(false)
  const [chatHistory, setChatHistory] = useState<ChatHistory[]>([])
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { theme, setTheme } = useTheme()

  const currentCharacter = characters.find((c) => c.id === selectedCharacter) || characters[0]

  // Handle hydration
  useEffect(() => {
    setMounted(true)
  }, [])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (mounted) {
      loadChatHistory()
    }
  }, [mounted])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  const loadChatHistory = () => {
    try {
      const history = getChatHistory()
      setChatHistory(history)
      console.log("Loaded chat history:", history.length, "items")
    } catch (error) {
      console.error("Failed to load chat history:", error)
    }
  }

  const startNewChat = () => {
    // Save current chat before starting new one
    if (messages.length > 0 && currentChatId) {
      saveCurrentChat()
    }

    setMessages([])
    setCurrentChatId(null)
    setSidebarOpen(false)
  }

  const loadChat = (chat: ChatHistory) => {
    // Save current chat before loading another
    if (messages.length > 0 && currentChatId && currentChatId !== chat.id) {
      saveCurrentChat()
    }

    setMessages(chat.messages)
    setSelectedCharacter(chat.character)
    setCurrentChatId(chat.id)
    setSidebarOpen(false)
  }

  const saveCurrentChat = () => {
    if (messages.length === 0) {
      console.log("No messages to save")
      return
    }

    try {
      const title = messages[0]?.content.substring(0, 50) + "..." || "New Chat"

      if (currentChatId) {
        // Update existing chat
        console.log("Updating existing chat:", currentChatId)
        const success = updateChatHistory(currentChatId, title, selectedCharacter, messages)
        if (success) {
          console.log("Chat updated successfully")
        }
      } else {
        // Create new chat
        console.log("Creating new chat")
        const chatId = saveChatHistory(title, selectedCharacter, messages)
        if (chatId) {
          setCurrentChatId(chatId)
          console.log("New chat created with ID:", chatId)
        }
      }

      // Reload chat history to update the sidebar
      loadChatHistory()
    } catch (error) {
      console.error("Failed to save chat:", error)
    }
  }

  const deleteChat = (chatId: string) => {
    try {
      const success = deleteChatHistory(chatId)
      if (success) {
        loadChatHistory()
        if (currentChatId === chatId) {
          startNewChat()
        }
      }
    } catch (error) {
      console.error("Failed to delete chat:", error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input.trim(),
      role: "user",
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    const currentInput = input.trim()
    setInput("")
    setIsLoading(true)

    try {
      console.log("Sending message:", currentInput)

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          message: currentInput,
          character: selectedCharacter,
          history: messages.slice(-10),
        }),
      })

      console.log("Response status:", response.status)

      let data
      const contentType = response.headers.get("content-type")

      if (contentType && contentType.includes("application/json")) {
        try {
          data = await response.json()
        } catch (jsonError) {
          console.error("JSON parse error:", jsonError)
          throw new Error("Server returned invalid JSON response")
        }
      } else {
        const textResponse = await response.text()
        console.error("Non-JSON response:", textResponse.substring(0, 200))
        throw new Error("Server returned non-JSON response. This might be a server-side error.")
      }

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`)
      }

      if (!data.message) {
        throw new Error("No message received from server")
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: data.message,
        role: "assistant",
        timestamp: new Date(),
      }

      setMessages((prev) => {
        const newMessages = [...prev, assistantMessage]
        // Save chat immediately after adding the assistant message
        setTimeout(() => {
          const title = newMessages[0]?.content.substring(0, 50) + "..." || "New Chat"

          if (currentChatId) {
            updateChatHistory(currentChatId, title, selectedCharacter, newMessages)
          } else {
            const chatId = saveChatHistory(title, selectedCharacter, newMessages)
            if (chatId) {
              setCurrentChatId(chatId)
            }
          }
          loadChatHistory()
        }, 100)

        return newMessages
      })

      console.log("Message added successfully")
    } catch (error) {
      console.error("Chat error:", error)

      let errorMessage = "Sorry, I encountered an error. Please try again."

      if (error instanceof Error) {
        if (error.message.includes("API key")) {
          errorMessage = "⚠️ API key issue. Please check your Groq API key configuration."
        } else if (error.message.includes("Rate limit")) {
          errorMessage = "⏳ Rate limit reached. Please wait a moment before trying again."
        } else if (error.message.includes("Network")) {
          errorMessage = "🌐 Network error. Please check your internet connection."
        } else {
          errorMessage = `❌ ${error.message}`
        }
      }

      const errorMessage_obj: Message = {
        id: (Date.now() + 1).toString(),
        content: errorMessage,
        role: "assistant",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage_obj])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const handleCharacterChange = (characterId: string) => {
    // Save current conversation before switching characters
    if (messages.length > 0) {
      console.log("Saving current chat before character switch")
      saveCurrentChat()
    }

    // Clear current conversation and start fresh with new character
    setMessages([])
    setCurrentChatId(null)
    setSelectedCharacter(characterId)
    setDropdownOpen(false)

    console.log("Switched to character:", characterId)
  }

  // Don't render until mounted to avoid hydration issues
  if (!mounted) {
    return null
  }

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Sidebar */}
      <div
        className={`${sidebarOpen ? "translate-x-0" : "-translate-x-full"} fixed inset-y-0 left-0 z-50 w-80 bg-card border-r border-border transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}
      >
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-3">
              <Image src="/logo.png" alt="Duskwave" width={24} height={24} className="w-6 h-6" />
              <h1 className="text-lg font-bold font-poppins">Duskwave</h1>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(false)} className="lg:hidden">
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* New Chat Button */}
          <div className="p-4">
            <Button onClick={startNewChat} className="w-full justify-start gap-2" variant="outline">
              <Plus className="w-4 h-4" />
              New Chat
            </Button>
          </div>

          {/* Chat History */}
          <div className="flex-1 overflow-y-auto custom-scrollbar px-4">
            <div className="space-y-2">
              {chatHistory.map((chat) => (
                <div
                  key={chat.id}
                  className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer hover:bg-accent transition-colors ${
                    currentChatId === chat.id ? "bg-accent" : ""
                  }`}
                  onClick={() => loadChat(chat)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{chat.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {characters.find((c) => c.id === chat.character)?.name}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteChat(chat.id)
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))}
              {chatHistory.length === 0 && (
                <div className="text-center text-muted-foreground text-sm py-8">No chat history yet</div>
              )}
            </div>
          </div>

          {/* Theme Toggle & Credits */}
          <div className="p-4 border-t border-border">
            <div className="flex items-center justify-between mb-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="gap-2"
              >
                {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                {theme === "dark" ? "Light" : "Dark"}
              </Button>
            </div>
            <div className="text-xs text-muted-foreground text-center">
              Made by{" "}
              <a
                href="https://linktr.ee/r4qc0"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Ayushman
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:ml-0">
        {/* Mobile Header */}
        <div className="lg:hidden flex items-center justify-between p-4 border-b border-border">
          <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2">
            <Image
              src={currentCharacter.image || "/placeholder.svg"}
              alt={currentCharacter.name}
              width={24}
              height={24}
              className="w-6 h-6 rounded-full object-cover"
            />
            <span className="text-sm font-medium">{currentCharacter.name}</span>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="max-w-4xl mx-auto p-4 space-y-6">
            {messages.length === 0 && (
              <div className="text-center py-12">
                <div className="mb-6">
                  <Image
                    src={currentCharacter.image || "/placeholder.svg"}
                    alt={currentCharacter.name}
                    width={80}
                    height={80}
                    className="w-20 h-20 rounded-full object-cover mx-auto border-4 border-border"
                  />
                </div>
                <h3 className="text-2xl font-bold font-poppins mb-2">{currentCharacter.name}</h3>
                <p className="text-muted-foreground mb-4">{currentCharacter.personality}</p>
                <p className="text-sm text-muted-foreground">Start a conversation!</p>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-4 ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {message.role === "assistant" && (
                  <Image
                    src={currentCharacter.image || "/placeholder.svg"}
                    alt={currentCharacter.name}
                    width={32}
                    height={32}
                    className="w-8 h-8 rounded-full object-cover border border-border flex-shrink-0"
                  />
                )}
                <div
                  className={`max-w-xs lg:max-w-2xl px-4 py-3 rounded-2xl ${
                    message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                  }`}
                >
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
                </div>
                {message.role === "user" && (
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-primary-foreground" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-4 justify-start">
                <Image
                  src={currentCharacter.image || "/placeholder.svg"}
                  alt={currentCharacter.name}
                  width={32}
                  height={32}
                  className="w-8 h-8 rounded-full object-cover border border-border flex-shrink-0"
                />
                <div className="bg-muted px-4 py-3 rounded-2xl">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                    <div
                      className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                      style={{ animationDelay: "0.1s" }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    ></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="border-t border-border p-4">
          <div className="max-w-4xl mx-auto">
            <form onSubmit={handleSubmit} className="flex gap-3">
              {/* Custom Character Dropdown (opens upward, theme-aware) */}
              <div className="relative" ref={dropdownRef}>
                {/* Dropdown Menu (positioned above the button) */}
                {dropdownOpen && (
                  <div
                    className={`absolute bottom-full left-0 mb-1 w-48 border rounded-md shadow-lg z-10 max-h-64 overflow-y-auto custom-scrollbar ${
                      theme === "dark" ? "bg-black border-gray-700" : "bg-white border-gray-300"
                    }`}
                  >
                    {characters.map((character) => (
                      <button
                        key={character.id}
                        type="button"
                        className={`flex items-center gap-2 w-full px-3 py-2 text-sm text-left transition-colors ${
                          theme === "dark" ? "text-white hover:bg-gray-800" : "text-gray-900 hover:bg-gray-100"
                        } ${character.id === selectedCharacter ? (theme === "dark" ? "bg-gray-800" : "bg-gray-100") : ""}`}
                        onClick={() => handleCharacterChange(character.id)}
                      >
                        <Image
                          src={character.image || "/placeholder.svg"}
                          alt={character.name}
                          width={20}
                          height={20}
                          className="w-5 h-5 rounded-full object-cover"
                        />
                        {character.name}
                      </button>
                    ))}
                  </div>
                )}

                {/* Dropdown Button */}
                <button
                  type="button"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className={`flex items-center justify-between gap-2 px-3 py-2 h-[52px] rounded-md border text-sm font-medium w-48 transition-colors ${
                    theme === "dark" ? "bg-black border-gray-700 text-white" : "bg-white border-gray-300 text-gray-900"
                  }`}
                >
                  <span>{currentCharacter.name}</span>
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className={`transition-transform ${dropdownOpen ? "rotate-0" : "rotate-180"}`}
                  >
                    <path d="M6 4L2 8H10L6 4Z" fill="currentColor" />
                  </svg>
                </button>
              </div>

              {/* Message Input */}
              <div className="flex-1 relative">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`Message ${currentCharacter.name}...`}
                  className="w-full px-4 py-3 bg-background border border-border rounded-2xl resize-none min-h-[52px] max-h-32 focus:outline-none focus:ring-2 focus:ring-ring"
                  rows={1}
                  disabled={isLoading}
                />
              </div>

              {/* Send Button */}
              <Button type="submit" disabled={!input.trim() || isLoading} className="rounded-2xl px-4 py-3 h-[52px]">
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </div>
      </div>

      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}
    </div>
  )
}
