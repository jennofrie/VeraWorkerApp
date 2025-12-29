/**
 * Gemini AI Utility for Shift Notes Enhancement
 *
 * Uses Google's Gemini Flash Lite model to transform raw shift notes
 * into professional NDIS-compliant documentation.
 */

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-2.0-flash-lite';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// Validation constants
export const MIN_NOTES_LENGTH = 20;
export const MAX_NOTES_LENGTH = 2000;

export interface EnhanceNotesResult {
  success: boolean;
  enhancedNotes?: string;
  error?: string;
  isInvalidContent?: boolean;
}

/**
 * NDIS-compliant shift notes prompt template
 */
const SYSTEM_PROMPT = `You are an expert NDIS (National Disability Insurance Scheme) documentation specialist. Your role is to transform raw support worker shift notes into professional, NDIS-compliant documentation.

CRITICAL RULES:
1. ONLY process content related to disability support, healthcare, aged care, or NDIS services
2. If the input is unrelated (e.g., random text, jokes, non-work content), respond EXACTLY with: "INVALID_CONTENT"
3. Keep the human voice - professional but warm and person-centered
4. Use person-first language (e.g., "person with disability" not "disabled person")
5. Be factual and objective - document what was observed and done
6. Include specific times, activities, and outcomes where mentioned

OUTPUT FORMAT:
Structure the notes as follows:

**Shift Summary**
[Brief overview of the shift and key activities]

**Activities & Support Provided**
- [Activity 1 with relevant details]
- [Activity 2 with relevant details]
- [Continue for all activities mentioned]

**Client Observations**
[Any observations about the client's mood, health, behavior, or wellbeing]

**Goals Progress** (if applicable)
[Any progress toward NDIS goals if mentioned]

**Incident Report** (only if incident detected)
[If ANY incident, injury, near-miss, behavioral concern, or safety issue is mentioned, document it here with:
- What happened
- When it occurred
- Actions taken
- Follow-up required]

**Handover Notes** (if applicable)
[Important information for the next support worker]

IMPORTANT:
- If no incidents occurred, do NOT include the Incident Report section
- Keep the documentation concise but thorough
- Maintain confidentiality - use "the client" or "the participant" if no name provided
- Output ONLY the formatted notes, no additional commentary`;

/**
 * Validates that the input notes meet length requirements
 */
export function validateNotesLength(notes: string): { valid: boolean; error?: string } {
  const trimmed = notes.trim();

  if (trimmed.length < MIN_NOTES_LENGTH) {
    return {
      valid: false,
      error: `Please enter at least ${MIN_NOTES_LENGTH} characters to enhance your notes.`,
    };
  }

  if (trimmed.length > MAX_NOTES_LENGTH) {
    return {
      valid: false,
      error: `Notes cannot exceed ${MAX_NOTES_LENGTH} characters. Current: ${trimmed.length}`,
    };
  }

  return { valid: true };
}

/**
 * Enhances raw shift notes using Gemini AI
 */
export async function enhanceShiftNotes(rawNotes: string): Promise<EnhanceNotesResult> {
  // Check API key
  if (!GEMINI_API_KEY) {
    return {
      success: false,
      error: 'AI service is not configured. Please contact support.',
    };
  }

  // Validate length
  const validation = validateNotesLength(rawNotes);
  if (!validation.valid) {
    return {
      success: false,
      error: validation.error,
    };
  }

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `${SYSTEM_PROMPT}\n\n---\n\nRAW SHIFT NOTES TO ENHANCE:\n${rawNotes.trim()}`,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.3, // Lower temperature for more consistent, professional output
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        },
        safetySettings: [
          {
            category: 'HARM_CATEGORY_HARASSMENT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE',
          },
          {
            category: 'HARM_CATEGORY_HATE_SPEECH',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE',
          },
          {
            category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE',
          },
          {
            category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE',
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (__DEV__) {
        console.error('Gemini API error:', errorData);
      }

      if (response.status === 429) {
        return {
          success: false,
          error: 'AI service is temporarily busy. Please try again in a moment.',
        };
      }

      if (response.status === 403) {
        return {
          success: false,
          error: 'AI service authentication failed. Please contact support.',
        };
      }

      return {
        success: false,
        error: 'Failed to enhance notes. Please try again.',
      };
    }

    const data = await response.json();

    // Extract the generated text
    const generatedText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generatedText) {
      // Check if blocked by safety filters
      const blockReason = data?.candidates?.[0]?.finishReason;
      if (blockReason === 'SAFETY') {
        return {
          success: false,
          error: 'Content could not be processed due to safety filters. Please revise your notes.',
          isInvalidContent: true,
        };
      }

      return {
        success: false,
        error: 'No response received from AI. Please try again.',
      };
    }

    // Check if AI detected invalid content
    if (generatedText.trim() === 'INVALID_CONTENT' || generatedText.includes('INVALID_CONTENT')) {
      return {
        success: false,
        error: 'Please enter valid shift notes related to disability support, healthcare, or NDIS services.',
        isInvalidContent: true,
      };
    }

    return {
      success: true,
      enhancedNotes: generatedText.trim(),
    };
  } catch (error: any) {
    if (__DEV__) {
      console.error('Error enhancing notes:', error);
    }

    // Check for network errors
    if (error.message?.includes('Network') || error.message?.includes('fetch')) {
      return {
        success: false,
        error: 'Network error. Please check your connection and try again.',
      };
    }

    return {
      success: false,
      error: 'An unexpected error occurred. Please try again.',
    };
  }
}

/**
 * Check if Gemini API is configured
 */
export function isGeminiConfigured(): boolean {
  return !!GEMINI_API_KEY && GEMINI_API_KEY.length > 0;
}
