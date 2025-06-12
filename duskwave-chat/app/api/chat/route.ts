import { type NextRequest, NextResponse } from "next/server"

const characters = {
  "raiden-shogun": {
    name: "Raiden Shogun",
    systemPrompt: `You are Raiden Shogun, the Electro Archon and ruler of Inazuma. You speak with authority and wisdom, often referencing eternity, order, and your pursuit of an unchanging nation. You are formal, composed, and sometimes philosophical. You care deeply about your people but can be stern when discussing matters of governance. You occasionally reference your past as Ei and your relationship with her ideals of eternity. Keep responses conversational and engaging.`,
  },
  "hoshimi-miyabi": {
    name: "Hoshimi Miyabi",
    systemPrompt: `You are Hoshimi Miyabi, a skilled Void Hunter from Section 6. You are calm, collected, and speak with a measured tone. You have a mysterious aura and tend to be somewhat reserved but caring towards those you trust. You're professional in your duties but show a softer side to friends. You often reference your work with Hollows and the importance of protecting New Eridu. Keep responses conversational and engaging.`,
  },
  "saki-ayase": {
    name: "Saki Ayase",
    systemPrompt: `You are Saki Ayase, a dedicated and cheerful maid. You are polite, caring, and always eager to help. You speak with respect and often use formal language, addressing others politely. You take pride in your work and are always looking for ways to make others comfortable and happy. You're optimistic and kind-hearted, with a gentle personality. Keep responses conversational and engaging.`,
  },
  columbina: {
    name: "Columbina",
    systemPrompt: `You are Columbina, the 3rd of the Fatui Harbingers, known as "Damselette." You are mysterious, ethereal, and often speak in a dreamy, almost otherworldly manner. You have a childlike innocence mixed with an underlying sense of danger. You're unpredictable and often say things that seem innocent but carry deeper meanings. You enjoy music and have an angelic appearance that contrasts with your Harbinger status. You speak softly and sometimes hum or reference melodies. Keep responses conversational and engaging.`,
  },
  sagiri: {
    name: "Sagiri",
    systemPrompt: `You are Sagiri, a member of the Yamada Asaemon clan and skilled executioner from Hell's Paradise. You are stoic, determined, and have a strong sense of justice. You speak with conviction and rarely show emotion, but you care deeply about doing what's right. You're skilled in swordsmanship and have a no-nonsense attitude. You value honor and duty above all else, and you're not afraid to make difficult decisions. You speak directly and with purpose. Keep responses conversational and engaging.`,
  },
  arlecchino: {
    name: "Arlecchino",
    systemPrompt: `You are Arlecchino, the 4th of the Fatui Harbingers, known as "The Knave." You are calculating, elegant, and speak with sophisticated authority. You run the House of the Hearth orphanage and care for children, showing a softer side beneath your cold exterior. You're intelligent, strategic, and always thinking several steps ahead. You have a refined manner of speaking and can be both nurturing and intimidating. You address others with respect but maintain your authority. Keep responses conversational and engaging.`,
  },
}

// List of models to try in order of preference
const GROQ_MODELS = [
  "llama3-70b-8192", // Primary choice
  "mixtral-8x7b-32768", // Backup option
  "gemma-7b-it", // Another backup
  "llama3-8b-8192", // Last resort (smaller model)
]

export async function POST(request: NextRequest) {
  // Ensure we always return JSON, even in case of errors
  try {
    console.log("=== Chat API Called ===")

    let body
    try {
      body = await request.json()
    } catch (parseError) {
      console.error("Failed to parse request body:", parseError)
      return NextResponse.json({ error: "Invalid request format" }, { status: 400 })
    }

    const { message, character, history } = body

    console.log("Request details:", {
      message: message?.substring(0, 50) + "...",
      character,
      historyLength: history?.length || 0,
    })

    // Validate required fields
    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json({ error: "Message is required and must be a non-empty string" }, { status: 400 })
    }

    // Check API key
    if (!process.env.GROQ_API_KEY) {
      console.error("GROQ_API_KEY environment variable is not set")
      return NextResponse.json({ error: "Server configuration error: API key not found" }, { status: 500 })
    }

    // Validate character
    const selectedCharacter = characters[character as keyof typeof characters]
    if (!selectedCharacter) {
      console.error("Invalid character:", character)
      console.error("Available characters:", Object.keys(characters))
      return NextResponse.json(
        {
          error: `Invalid character selected: ${character}. Available characters: ${Object.keys(characters).join(", ")}`,
        },
        { status: 400 },
      )
    }

    console.log("Using character:", selectedCharacter.name || character)

    // Build messages array
    const messages = [
      {
        role: "system",
        content: selectedCharacter.systemPrompt,
      },
      ...(Array.isArray(history) ? history.slice(-10) : []).map((msg: any) => ({
        role: msg.role === "user" ? "user" : "assistant",
        content: String(msg.content || ""),
      })),
      {
        role: "user",
        content: message.trim(),
      },
    ]

    // Try models in order until one works
    let lastError = null
    for (const model of GROQ_MODELS) {
      try {
        console.log(`Trying model: ${model}`)

        // Call Groq API
        const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: model,
            messages: messages,
            max_tokens: 1000,
            temperature: 0.7,
          }),
        })

        console.log(`Model ${model} response status:`, groqResponse.status)

        // Handle non-JSON responses
        const contentType = groqResponse.headers.get("content-type")
        if (!contentType || !contentType.includes("application/json")) {
          const textResponse = await groqResponse.text()
          console.error(`Non-JSON response from Groq API:`, textResponse.substring(0, 200))
          lastError = `Non-JSON response from AI service (${model})`
          continue // Try next model
        }

        if (!groqResponse.ok) {
          const errorData = await groqResponse.json()
          console.error(`Model ${model} error:`, errorData)

          // If model is decommissioned or not found, try the next one
          if (
            errorData.error?.code === "model_decommissioned" ||
            errorData.error?.code === "model_not_found" ||
            groqResponse.status === 404
          ) {
            lastError = errorData.error?.message || `Model ${model} not available`
            continue // Try next model
          }

          // For other errors, return immediately
          return NextResponse.json(
            {
              error: errorData.error?.message || `AI service error with model ${model}`,
            },
            { status: 502 },
          )
        }

        // Parse successful response
        const data = await groqResponse.json()
        const assistantMessage = data.choices?.[0]?.message?.content

        if (!assistantMessage) {
          console.error("No message in Groq response:", data)
          return NextResponse.json({ error: "AI service returned empty response" }, { status: 502 })
        }

        console.log(`Successfully generated response with model ${model}`)

        return NextResponse.json({
          message: assistantMessage,
          success: true,
          model: model, // Include which model was used
        })
      } catch (modelError) {
        console.error(`Error with model ${model}:`, modelError)
        lastError = modelError instanceof Error ? modelError.message : "Unknown error"
        // Continue to next model
      }
    }

    // If we get here, all models failed
    return NextResponse.json(
      {
        error: `All available models failed. Last error: ${lastError}`,
      },
      { status: 502 },
    )
  } catch (error) {
    console.error("Unexpected error in chat API:", error)

    // Ensure we return valid JSON even for unexpected errors
    return NextResponse.json(
      {
        error: error instanceof Error ? `Server error: ${error.message}` : "An unexpected server error occurred",
      },
      { status: 500 },
    )
  }
}
