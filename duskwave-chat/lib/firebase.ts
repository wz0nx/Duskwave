// Firebase configuration and functions
import { initializeApp, getApps } from "firebase/app"
import { getFirestore, collection, addDoc, getDocs, query, orderBy, limit, deleteDoc, doc } from "firebase/firestore"
import { getAuth } from "firebase/auth"

// Firebase config - you'll need to replace these with your actual values
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

// Check if Firebase is properly configured
const isFirebaseConfigured = () => {
  return !!(
    firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.storageBucket &&
    firebaseConfig.messagingSenderId &&
    firebaseConfig.appId
  )
}

// Initialize Firebase only if configured
let app
let db
let auth

if (isFirebaseConfigured()) {
  try {
    // Initialize Firebase only if it hasn't been initialized already
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
    db = getFirestore(app)
    auth = getAuth(app)
    console.log("Firebase initialized successfully")
  } catch (error) {
    console.error("Firebase initialization error:", error)
  }
} else {
  console.warn("Firebase not configured - chat history will not be saved")
}

export { db, auth }

// Types
export interface ChatHistory {
  id: string
  title: string
  character: string
  messages: any[]
  createdAt: Date
  updatedAt: Date
}

// Firebase functions with error handling
export const saveChatHistory = async (title: string, character: string, messages: any[]): Promise<string | null> => {
  if (!db || !isFirebaseConfigured()) {
    console.warn("Firebase not configured - cannot save chat history")
    return null
  }

  try {
    const docRef = await addDoc(collection(db, "chatHistory"), {
      title,
      character,
      messages,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    console.log("Chat history saved successfully")
    return docRef.id
  } catch (error) {
    console.error("Error saving chat history:", error)
    return null
  }
}

export const getChatHistory = async (): Promise<ChatHistory[]> => {
  if (!db || !isFirebaseConfigured()) {
    console.warn("Firebase not configured - returning empty chat history")
    return []
  }

  try {
    const q = query(collection(db, "chatHistory"), orderBy("updatedAt", "desc"), limit(50))
    const querySnapshot = await getDocs(q)
    const history = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
    })) as ChatHistory[]

    console.log(`Loaded ${history.length} chat history items`)
    return history
  } catch (error) {
    console.error("Error getting chat history:", error)
    return []
  }
}

export const deleteChatHistory = async (chatId: string): Promise<boolean> => {
  if (!db || !isFirebaseConfigured()) {
    console.warn("Firebase not configured - cannot delete chat history")
    return false
  }

  try {
    await deleteDoc(doc(db, "chatHistory", chatId))
    console.log("Chat history deleted successfully")
    return true
  } catch (error) {
    console.error("Error deleting chat history:", error)
    return false
  }
}

// Utility function to check if Firebase is available
export const isFirebaseAvailable = (): boolean => {
  return !!(db && isFirebaseConfigured())
}
