import JSZip from 'jszip';

export interface PptImage {
  name: string;
  blob: Blob;
  url: string;
}

export const extractImages = async (file: File): Promise<PptImage[]> => {
  const zip = new JSZip();
  await zip.loadAsync(file);

  const mediaFiles = Object.keys(zip.files).filter(name => /^ppt\/media\//.test(name));
  
  const images: PptImage[] = [];

  for (const mediaFile of mediaFiles) {
    if (mediaFile.endsWith('/')) continue; // Skip directory entries
    const blob = await zip.file(mediaFile)?.async('blob');
    if (blob) {
      const fileName = mediaFile.split('/').pop() || 'image';
      images.push({
        name: fileName,
        blob,
        url: URL.createObjectURL(blob)
      });
    }
  }

  return images;
};

export const downloadExtractedImages = async (images: PptImage[]) => {
  if (images.length === 0) return;
  
  if (images.length === 1) {
    const a = document.createElement('a');
    a.href = images[0].url;
    a.download = `ShreeDesk_Extracted_${images[0].name}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } else {
    const zip = new JSZip();
    images.forEach(img => zip.file(`ShreeDesk_Extracted_${img.name}`, img.blob));
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ShreeDesk_Extracted_Images.zip';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }
};