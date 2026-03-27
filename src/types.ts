export interface Shot {
  id: string;
  number: number;
  prompt: string;
  image?: string;
  style: string;
  status: 'idle' | 'generating' | 'completed' | 'error';
}

export const STORYBOARD_STYLES = [
  { id: 'sketch', name: 'Bút chì (Sketch)', prompt: 'pencil sketch, storyboard art, rough lines, grayscale' },
  { id: 'color-sketch', name: 'Bút chì màu', prompt: 'colored pencil sketch, storyboard art, soft colors' },
  { id: '2d-anim', name: 'Hoạt hình 2D', prompt: '2d animation style, clean lines, flat colors, anime aesthetic' },
  { id: '3d-render', name: 'Dựng hình 3D', prompt: '3d render, unreal engine 5, octane render, cinematic lighting' },
  { id: 'realistic', name: 'Tả thực', prompt: 'photorealistic, cinematic film still, 8k, highly detailed' },
  { id: 'film-noir', name: 'Film Noir', prompt: 'film noir style, high contrast, black and white, dramatic shadows' },
];
