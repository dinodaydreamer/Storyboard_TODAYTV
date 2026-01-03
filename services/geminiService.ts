
import { GoogleGenAI } from "@google/genai";
import { StoryboardStyle } from "../types";

/**
 * Generates a storyboard sketch based on a scene description and chosen style.
 */
export const generateStoryboardSketch = async (description: string, style: StoryboardStyle = 'sketch'): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  let styleInstruction = "";
  
  switch (style) {
    case 'colored-pencil':
      styleInstruction = "Style: Professional colored pencil storyboard, soft wax texture, vibrant hand-drawn colors, fine pencil hatching, artistic sketch with a mix of colored pigments, white paper background.";
      break;
    case '2d-animation':
      styleInstruction = "Style: Professional 2D animation, clean lines, flat colors, anime aesthetic, clear character expressions.";
      break;
    case '3d-render':
      styleInstruction = "Style: High-quality 3D render, Octane render, Pixar-style lighting, soft shadows, detailed textures, cinematic depth.";
      break;
    case 'realistic':
      styleInstruction = "Style: Photorealistic cinematic photography, 35mm lens, natural lighting, highly detailed, professional film production look.";
      break;
    case 'noir':
      styleInstruction = "Style: Film Noir, high contrast black and white, dramatic lighting, moody shadows, classic 1940s cinema aesthetic.";
      break;
    case 'sketch':
    default:
      styleInstruction = "Style: Professional charcoal storyboard sketch, rough pencil strokes, hand-drawn texture, minimalist outlines, monochrome grey and black.";
      break;
  }

  const fullPrompt = `Create a cinematic storyboard image for the following scene: ${description}. 
  ${styleInstruction}
  CRITICAL INSTRUCTIONS: 
  - NO TEXT, NO LETTERS, NO WORDS, NO CAPTIONS in the image.
  - NO BORDERS, NO SQUARE FRAMES INSIDE THE IMAGE, NO PANELS.
  - FULL FRAME COMPOSITION ONLY.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: [{ text: fullPrompt }]
      },
      config: {
        imageConfig: {
          aspectRatio: "16:9",
          imageSize: "1K"
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image data found in response");
  } catch (error: any) {
    if (error.message?.includes("Requested entity was not found")) {
      throw new Error("API_KEY_RESET_REQUIRED");
    }
    throw error;
  }
};
