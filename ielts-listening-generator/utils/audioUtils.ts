// Helper function to decode base64 string to Uint8Array
function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Helper function to encode Uint8Array to base64 string
function encode(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Function to write a string to a DataView
function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

/**
 * Creates a WAV file header and combines it with raw PCM data.
 * @param pcmData The raw PCM audio data as a Uint8Array.
 * @param sampleRate The sample rate of the audio (e.g., 24000).
 * @param numChannels The number of audio channels (e.g., 1 for mono).
 * @param bitsPerSample The number of bits per sample (e.g., 16).
 * @returns A Uint8Array representing the complete WAV file.
 */
function createWavFile(
    pcmData: Uint8Array,
    sampleRate: number,
    numChannels: number,
    bitsPerSample: number
): Uint8Array {
    const headerLength = 44;
    const dataSize = pcmData.length;
    const fileSize = dataSize + headerLength;
    
    const buffer = new ArrayBuffer(fileSize);
    const view = new DataView(buffer);

    const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
    const blockAlign = numChannels * (bitsPerSample / 8);

    // RIFF header
    writeString(view, 0, 'RIFF');
    view.setUint32(4, fileSize - 8, true); // fileSize - 8
    writeString(view, 8, 'WAVE');

    // "fmt " sub-chunk
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // Sub-chunk size (16 for PCM)
    view.setUint16(20, 1, true); // Audio format (1 for PCM)
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);

    // "data" sub-chunk
    writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true);

    // Write PCM data
    const wavBytes = new Uint8Array(buffer);
    wavBytes.set(pcmData, headerLength);
    
    return wavBytes;
}

/**
 * Takes a base64 encoded string of raw PCM audio data,
 * converts it into a proper WAV file, and returns a data URL.
 * An optional amount of trailing silence can be added.
 * @param base64Pcm The base64 encoded PCM data.
 * @param trailingSilenceSeconds The duration of silence to add to the end, in seconds.
 * @returns A data URL string for the WAV file.
 */
export function createWavFileDataUrl(base64Pcm: string, trailingSilenceSeconds: number = 0): string {
    let pcmData = decode(base64Pcm);
    
    // Gemini TTS model specifics
    const sampleRate = 24000;
    const numChannels = 1; // Mono
    const bitsPerSample = 16; // 16-bit PCM

    if (trailingSilenceSeconds > 0) {
        const bytesPerSample = bitsPerSample / 8;
        const numSilenceSamples = Math.floor(trailingSilenceSeconds * sampleRate);
        const silenceBytesCount = numSilenceSamples * numChannels * bytesPerSample;
        
        if (silenceBytesCount > 0) {
            const silenceBuffer = new Uint8Array(silenceBytesCount); // Automatically filled with 0s
            const combinedData = new Uint8Array(pcmData.length + silenceBytesCount);
            combinedData.set(pcmData, 0);
            combinedData.set(silenceBuffer, pcmData.length);
            pcmData = combinedData;
        }
    }

    const wavFileBytes = createWavFile(pcmData, sampleRate, numChannels, bitsPerSample);
    
    const base64Wav = encode(wavFileBytes);
    
    return `data:audio/wav;base64,${base64Wav}`;
}
