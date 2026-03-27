export interface Shot {
  id: string;
  number: number;
  prompt: string;
  image?: string;
  style: string;
  status: 'idle' | 'generating' | 'completed' | 'error';
}

export const STORYBOARD_STYLES = [
  { id: 'sketch', name: 'Bút chì (Sketch)', prompt: 'black and white pencil sketch, strictly grayscale, no colors, rough graphite lines, storyboard sketch art' },
  { id: 'color-sketch', name: 'Bút chì màu', prompt: 'colored pencil drawing, soft colored shading, storyboard concept art, hand-drawn colors, artistic texture' },
  { id: '2d-anim', name: 'Hoạt hình 2D', prompt: '2D animation style, clean ink outlines, vibrant flat colors, modern anime aesthetic, professional cartoon look' },
  { id: '3d-render', name: 'Dựng hình 3D', prompt: '3D CGI render, high-quality 3D modeling, cinematic lighting, Pixar or Dreamworks style, depth and volume' },
  { id: 'realistic', name: 'Tả thực', prompt: 'photorealistic cinematic shot, real-life photography style, high detail, natural lighting, 8k resolution, movie still' },
  { id: 'film-noir', name: 'Film Noir', prompt: 'classic film noir aesthetic, high contrast black and white, dramatic chiaroscuro lighting, moody shadows, 1940s detective movie style, no colors' },
];
