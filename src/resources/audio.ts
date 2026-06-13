import type { Job } from "../core/job";
import type {
  DialogueParams,
  DialogueResult,
  MusicParams,
  MusicResult,
  SoundEffectParams,
  SoundEffectResult,
  SpeechParams,
  STTResult,
  TranscribeParams,
  TTSResult,
} from "../types/media";
import type { PollOptions } from "../types/queue";
import { BaseResource } from "./base";

export class AudioResource extends BaseResource {
  /** Text-to-speech. */
  speech(params: SpeechParams, poll?: PollOptions): Promise<TTSResult> {
    return this.runQueued<TTSResult>(
      "/api/llm/generate-audio",
      params,
      "tts",
      poll,
    );
  }
  speechJob(params: SpeechParams, signal?: AbortSignal): Promise<Job<TTSResult>> {
    return this.submitQueued<TTSResult>(
      "/api/llm/generate-audio",
      params,
      "tts",
      signal,
    );
  }

  /** Speech-to-text. */
  transcribe(params: TranscribeParams, poll?: PollOptions): Promise<STTResult> {
    return this.runQueued<STTResult>(
      "/api/llm/transcribe",
      params,
      "stt",
      poll,
    );
  }
  transcribeJob(
    params: TranscribeParams,
    signal?: AbortSignal,
  ): Promise<Job<STTResult>> {
    return this.submitQueued<STTResult>(
      "/api/llm/transcribe",
      params,
      "stt",
      signal,
    );
  }

  soundEffect(
    params: SoundEffectParams,
    poll?: PollOptions,
  ): Promise<SoundEffectResult> {
    return this.runQueued<SoundEffectResult>(
      "/api/llm/generate-sound-effect",
      params,
      "sound-effect",
      poll,
    );
  }
  soundEffectJob(
    params: SoundEffectParams,
    signal?: AbortSignal,
  ): Promise<Job<SoundEffectResult>> {
    return this.submitQueued<SoundEffectResult>(
      "/api/llm/generate-sound-effect",
      params,
      "sound-effect",
      signal,
    );
  }

  music(params: MusicParams, poll?: PollOptions): Promise<MusicResult> {
    return this.runQueued<MusicResult>(
      "/api/llm/generate-music",
      params,
      "music",
      poll,
    );
  }
  musicJob(params: MusicParams, signal?: AbortSignal): Promise<Job<MusicResult>> {
    return this.submitQueued<MusicResult>(
      "/api/llm/generate-music",
      params,
      "music",
      signal,
    );
  }

  dialogue(params: DialogueParams, poll?: PollOptions): Promise<DialogueResult> {
    return this.runQueued<DialogueResult>(
      "/api/llm/generate-dialogue",
      params,
      "dialogue",
      poll,
    );
  }
  dialogueJob(
    params: DialogueParams,
    signal?: AbortSignal,
  ): Promise<Job<DialogueResult>> {
    return this.submitQueued<DialogueResult>(
      "/api/llm/generate-dialogue",
      params,
      "dialogue",
      signal,
    );
  }
}
