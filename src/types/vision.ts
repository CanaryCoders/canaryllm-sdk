export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface Detection {
  label: string;
  confidence: number;
  box: BoundingBox;
  classId?: number;
}

export interface DetectParams {
  /** base64-encoded image bytes (max ~50MB) */
  image: string;
  model?: string;
  confidence?: number;
  /** restrict to these YOLO class ids */
  classes?: number[];
  tag?: string;
  service?: string;
}
export interface ZeroShotDetectParams {
  image: string;
  prompt: string;
  confidence?: number;
  tag?: string;
  service?: string;
}
export interface FaceDetectParams {
  image: string;
  model?: "haarcascade" | "mediapipe" | "yolo-face";
  blur?: boolean;
  blurStrength?: number;
  confidence?: number;
  minSize?: number;
  scaleFactor?: number;
  minNeighbors?: number;
  tag?: string;
  service?: string;
}
export interface WebDetectParams {
  image: string;
  maxResults?: number;
  tag?: string;
}

export interface ImageRecognitionResult {
  detections: Detection[];
  model: string;
  width?: number;
  height?: number;
}
export interface FaceDetectionResult {
  faces: Detection[];
  /** base64-encoded image with faces blurred (when `blur: true`) */
  blurredImage?: string;
  model: string;
}
export interface WebEntity {
  description?: string;
  score?: number;
}
export interface WebDetectionResult {
  entities: WebEntity[];
  pages?: unknown[];
  matchingImages?: unknown[];
}

export interface AutoLabelParams {
  images: string[];
  classes: string[];
  confidence?: number;
  outputFormat?: string;
  valSplit?: number;
  tag?: string;
}
export interface AutoLabelResult {
  labeled: number;
  datasetId?: string;
  [k: string]: unknown;
}
export interface AutoTrainParams {
  images: string[];
  classes: string[];
  baseModel?: string;
  confidence?: number;
  imageSize?: number;
  epochs?: number;
  tag?: string;
}

/** Dataset-based fine-tuning. Field shape depends on the server build. */
export type TrainParams = Record<string, unknown>;

export interface TrainingJob {
  jobId: string;
  status: string;
  progress?: number;
  modelId?: string;
  createdAt?: string;
  completedAt?: string;
  error?: string;
}
export interface VisionModel {
  modelId: string;
  name?: string;
  classes?: string[];
  createdAt?: string;
}
