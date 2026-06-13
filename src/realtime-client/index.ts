import type { BrokeredCredential } from "../types/realtime";

export interface RealtimeConnectOptions {
  /** credential minted server-side via `client.realtime.sessions.create()` */
  credential: BrokeredCredential;
  /** capture the microphone and stream it to the model (default true) */
  microphone?: boolean;
  /** play the model's audio output (default true) */
  audioOutput?: boolean;
  onEvent?: (event: unknown) => void;
  onError?: (error: Error) => void;
  onOpen?: () => void;
  onClose?: () => void;
}

export interface RealtimeConnection {
  pc: RTCPeerConnection;
  dataChannel: RTCDataChannel;
  /** send a JSON event over the data channel */
  send(event: unknown): void;
  /** tear down the data channel and peer connection */
  close(): void;
}

/**
 * Open a WebRTC session to OpenAI's realtime endpoint using a credential
 * brokered by the server. Browser-only. For ElevenLabs conversational agents,
 * feed `credential.url` (the signed URL) to the ElevenLabs client instead.
 */
export async function connectRealtime(
  options: RealtimeConnectOptions,
): Promise<RealtimeConnection> {
  const { credential } = options;
  if (credential.kind !== "openai-realtime") {
    throw new Error(
      `connectRealtime handles "openai-realtime" credentials; got "${credential.kind}". For ElevenLabs convai, use the ElevenLabs client with credential.url.`,
    );
  }

  const pc = new RTCPeerConnection();
  const wantMic = options.microphone ?? true;
  const wantAudio = options.audioOutput ?? true;

  if (wantAudio) {
    const audioEl = new Audio();
    audioEl.autoplay = true;
    pc.addEventListener("track", (event) => {
      const stream = (event as RTCTrackEvent).streams[0];
      if (stream) audioEl.srcObject = stream;
    });
  }

  if (wantMic) {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    for (const track of stream.getTracks()) pc.addTrack(track, stream);
  }

  const dc = pc.createDataChannel("oai-events");
  dc.addEventListener("open", () => options.onOpen?.());
  dc.addEventListener("close", () => options.onClose?.());
  dc.addEventListener("message", (event) => {
    const data = (event as MessageEvent).data;
    try {
      options.onEvent?.(typeof data === "string" ? JSON.parse(data) : data);
    } catch {
      options.onEvent?.(data);
    }
  });

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  let answerSdp: string;
  try {
    const res = await fetch(credential.url, {
      method: "POST",
      body: offer.sdp ?? "",
      headers: {
        Authorization: `Bearer ${credential.token ?? ""}`,
        "Content-Type": "application/sdp",
      },
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`Realtime SDP exchange failed (${res.status}): ${detail}`);
    }
    answerSdp = await res.text();
  } catch (err) {
    pc.close();
    const error = err instanceof Error ? err : new Error(String(err));
    options.onError?.(error);
    throw error;
  }

  await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });

  return {
    pc,
    dataChannel: dc,
    send(event: unknown) {
      if (dc.readyState === "open") dc.send(JSON.stringify(event));
    },
    close() {
      try {
        dc.close();
      } catch {
        /* noop */
      }
      try {
        pc.close();
      } catch {
        /* noop */
      }
    },
  };
}
