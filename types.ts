
export type StoryboardStyle = 'sketch' | 'colored-pencil' | '2d-animation' | '3d-render' | 'realistic' | 'noir';

export interface Scene {
  id: string;
  shotNumber: number;
  description: string;
  visualPrompt?: string;
  imageUrl?: string;
  isGenerating: boolean;
  error?: string;
  duration: number;
  shotType: string;
  style: StoryboardStyle;
  aspectRatio: "16:9" | "1:1" | "9:16" | "4:3";
}

export enum APIStatus {
  IDLE = 'IDLE',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  ERROR = 'ERROR'
}
