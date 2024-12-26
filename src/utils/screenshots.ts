import { storage } from './supabase';
import type { Screenshot } from './storage';

export interface ScreenshotInput {
  pdfName: string;
  pageNumber: number;
  yPosition: number;
  imageBlob: Blob;
}

export const uploadScreenshot = async (screenshot: ScreenshotInput): Promise<string> => {
  const { imageBlob, ...rest } = screenshot;
  
  // Convert blob to data URL
  const imageUrl = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(imageBlob);
  });

  // Save screenshot data using storage provider
  const savedScreenshot = storage.saveScreenshot({
    ...rest,
    imageUrl
  });

  return savedScreenshot.imageUrl;
};

export const getScreenshots = (pdfName: string): Screenshot[] => {
  return storage.getScreenshots(pdfName);
};