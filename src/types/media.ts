export interface ImageGenerateParams {
  provider: "openai" | "gemini" | "vertex" | "xai" | "ollama";
  prompt: string;
  model?: string;
  n?: number;
  size?: string;
  aspectRatio?: string;
  quality?: "standard" | "hd" | "ultra";
  tag?: string;
  service?: string;
}
export interface GeneratedImage {
  /** base64-encoded image bytes (when returned inline) */
  data?: string;
  url?: string;
  mimeType?: string;
  revisedPrompt?: string;
}
export interface ImageGenerationResult {
  images: GeneratedImage[];
  model: string;
  provider: string;
}

export interface VideoGenerateParams {
  provider: "gemini" | "vertex" | "xai";
  prompt: string;
  model?: string;
  aspectRatio?: string;
  resolution?: string;
  durationSeconds?: number;
  numberOfVideos?: number;
  /** public URL of a seed image */
  imageUrl?: string;
  /** id from `video.upload()` for image-to-video */
  fileId?: string;
  tag?: string;
  service?: string;
}
export interface GeneratedVideo {
  data?: string;
  url?: string;
  mimeType?: string;
}
export interface VideoGenerationResult {
  videos: GeneratedVideo[];
  model: string;
  provider: string;
}
export interface VideoUploadResult {
  fileId: string;
  mimeType: string;
}

export type AudioOutputFormat =
  | "mp3_44100_128"
  | "mp3_44100_192"
  | "pcm_16000"
  | "pcm_22050"
  | "pcm_24000"
  | "pcm_44100";

export interface VoiceSettings {
  stability?: number;
  similarityBoost?: number;
  style?: number;
  useSpeakerBoost?: boolean;
  speed?: number;
}

export interface SpeechParams {
  provider: "elevenlabs" | "mlxaudio";
  text: string;
  model?: string;
  voiceId?: string;
  outputFormat?: AudioOutputFormat;
  voiceSettings?: VoiceSettings;
  languageCode?: string;
  previousText?: string;
  nextText?: string;
  applyTextNormalization?: "auto" | "on" | "off";
  previousRequestIds?: string[];
  tag?: string;
  service?: string;
}
export interface TTSResult {
  /** base64-encoded audio bytes */
  audio: string;
  mimeType: string;
  model: string;
  provider: string;
  characterCount?: number;
}

export interface TranscribeParams {
  provider: "elevenlabs" | "mlxaudio";
  /** base64-encoded audio bytes or a public URL */
  audio: string;
  mimeType: string;
  model?: string;
  language?: string;
  diarize?: boolean;
  numSpeakers?: number;
  timestampsGranularity?: "word" | "character";
  tagAudioEvents?: boolean;
  tag?: string;
  service?: string;
}
export interface TranscriptWord {
  text: string;
  start?: number;
  end?: number;
  speaker?: string;
  type?: string;
}
export interface STTResult {
  text: string;
  language?: string;
  words?: TranscriptWord[];
  model: string;
  provider: string;
}

export interface SoundEffectParams {
  text: string;
  model?: string;
  durationSeconds?: number;
  promptInfluence?: number;
  loop?: boolean;
  tag?: string;
  service?: string;
}
export interface SoundEffectResult {
  audio: string;
  mimeType: string;
  model: string;
  provider: string;
}

export interface MusicParams {
  prompt: string;
  model?: string;
  durationMs?: number;
  forceInstrumental?: boolean;
  tag?: string;
  service?: string;
}
export interface MusicResult {
  audio: string;
  mimeType: string;
  model: string;
  provider: string;
}

export interface DialogueInput {
  text: string;
  voiceId: string;
}
export interface DialogueParams {
  inputs: DialogueInput[];
  model?: string;
  outputFormat?: AudioOutputFormat;
  voiceSettings?: VoiceSettings;
  languageCode?: string;
  seed?: number;
  applyTextNormalization?: "auto" | "on" | "off";
  tag?: string;
  service?: string;
}
export interface DialogueResult {
  audio: string;
  mimeType: string;
  model: string;
  provider: string;
}
