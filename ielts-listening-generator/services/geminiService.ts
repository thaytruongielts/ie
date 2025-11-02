import { GoogleGenAI, Modality } from "@google/genai";

interface SpeechOptions {
  numVoices: number;
  voiceGenders: string;
  accent: string;
}

const MALE_VOICES = ['Puck', 'Charon', 'Fenrir'];
const FEMALE_VOICES = ['Kore', 'Zephyr'];

/**
 * Parses a user-provided gender string (e.g., "1 nam 2 nữ") into an array of genders.
 * Handles English and Vietnamese keywords.
 * @param genderString The string to parse.
 * @returns An array of strings, e.g., ["male", "female", "female"].
 */
const parseGenders = (genderString: string): string[] => {
    const genders: string[] = [];
    if (!genderString.trim()) {
        return [];
    }
    // Normalize to handle Vietnamese without accent marks, e.g., "nu" for "nữ"
    const normalizedString = genderString.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const parts = normalizedString.split(/[\s,]+/).filter(Boolean);
    
    let currentCount = 1;
    for (const part of parts) {
        const num = parseInt(part, 10);
        if (!isNaN(num) && num > 0) {
            currentCount = num;
        } else if (part.startsWith('nam') || part.startsWith('man') || part.startsWith('men')) {
            for (let i = 0; i < currentCount; i++) genders.push('male');
            currentCount = 1;
        } else if (part.startsWith('nu') || part.startsWith('woman') || part.startsWith('women')) {
            for (let i = 0; i < currentCount; i++) genders.push('female');
            currentCount = 1;
        }
    }
    return genders;
};


export const generateSpeech = async (script: string, options: SpeechOptions): Promise<string | null> => {
  // It's assumed that process.env.GEMINI_API_KEY is configured in the environment.
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("API key not found. Please set the GEMINI_API_KEY environment variable.");
  }
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const { numVoices, voiceGenders, accent } = options;

  const fullScript = accent ? `Please read the following with an ${accent} accent: \n\n${script}` : script;
  
  // Use 'any' for config to dynamically build it
  const config: any = {
    responseModalities: [Modality.AUDIO],
    speechConfig: {},
  };

  if (numVoices <= 1) {
    let voiceName = 'Kore'; // Default female voice
    const normalizedGenders = voiceGenders.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (normalizedGenders.includes('nam') || normalizedGenders.includes('man')) {
        voiceName = 'Puck'; // Default male voice
    }
    config.speechConfig.voiceConfig = {
        prebuiltVoiceConfig: { voiceName },
    };
  } else {
    // Multi-speaker logic
    // The Gemini API for multi-speaker TTS requires exactly 2 speakers.
    if (numVoices !== 2) {
        // This is a safeguard; the UI should already prevent this.
        throw new Error(`Chế độ nhiều giọng nói chỉ hỗ trợ chính xác 2 giọng. Bạn đã yêu cầu ${numVoices}.`);
    }

    const speakerRegex = /^([a-zA-Z0-9\s]+):/gm;
    const matches = script.match(speakerRegex);
    if (!matches) {
        throw new Error(`Với 2 giọng nói, văn bản phải có định dạng "Tên người nói 1: Lời thoại..." và "Tên người nói 2: Lời thoại...".`);
    }
    const speakers = [...new Set(matches.map(s => s.slice(0, -1).trim()))];
    
    if (speakers.length !== 2) {
      throw new Error(`Tìm thấy ${speakers.length} người nói khác nhau trong văn bản. Chế độ nhiều giọng nói yêu cầu chính xác 2 người nói.`);
    }

    const requestedGenders = parseGenders(voiceGenders);
    if (requestedGenders.length > 0 && requestedGenders.length !== 2) {
        throw new Error(`Bạn đã yêu cầu ${requestedGenders.length} giới tính, nhưng cần chính xác 2 giới tính cho chế độ này.`);
    }

    let maleVoiceIndex = 0;
    let femaleVoiceIndex = 0;

    const speakerVoiceConfigs = speakers.map((speaker, index) => {
        // Fallback gender assignment if not specified: speaker 1 male, speaker 2 female
        const gender = requestedGenders.length > 0 ? requestedGenders[index] : (index === 0 ? 'male' : 'female'); 
        let voiceName: string;

        if (gender === 'male') {
            voiceName = MALE_VOICES[maleVoiceIndex % MALE_VOICES.length];
            maleVoiceIndex++;
        } else {
            voiceName = FEMALE_VOICES[femaleVoiceIndex % FEMALE_VOICES.length];
            femaleVoiceIndex++;
        }
        return {
            speaker,
            voiceConfig: { prebuiltVoiceConfig: { voiceName } }
        };
    });

    config.speechConfig.multiSpeakerVoiceConfig = { speakerVoiceConfigs };
  }


  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: fullScript }] }],
      config: config,
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    
    if (typeof base64Audio === 'string') {
        return base64Audio;
    }
    return null;
  } catch (error) {
    console.error("Error generating speech with Gemini API:", error);
    throw error;
  }
};
