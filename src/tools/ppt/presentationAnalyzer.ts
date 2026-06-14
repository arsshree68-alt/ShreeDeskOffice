import JSZip from 'jszip';

export interface PptAnalysis {
  slideCount: number;
  textBySlide: string[];
  summary: string;
}

export const analyzePresentation = async (file: File): Promise<PptAnalysis> => {
  const zip = new JSZip();
  await zip.loadAsync(file);

  const slideFiles = Object.keys(zip.files).filter(name => /^ppt\/slides\/slide\d+\.xml$/.test(name));
  
  // Sort slides properly by number
  slideFiles.sort((a, b) => {
    const numA = parseInt(a.match(/slide(\d+)\.xml/)?.[1] || '0', 10);
    const numB = parseInt(b.match(/slide(\d+)\.xml/)?.[1] || '0', 10);
    return numA - numB;
  });

  const textBySlide: string[] = [];

  for (const slideFile of slideFiles) {
    const xmlText = await zip.file(slideFile)?.async('text') || '';
    // Extract text from <a:t> elements
    const matches = xmlText.match(/<a:t>([^<]*)<\/a:t>/g) || [];
    const slideText = matches.map(m => m.replace(/<\/?a:t>/g, '')).join(' ');
    textBySlide.push(slideText);
  }

  // Generate a very basic summary
  const summary = textBySlide.slice(0, 3).map(t => t.slice(0, 100) + '...').join(' | ');

  return {
    slideCount: slideFiles.length,
    textBySlide,
    summary: summary || 'No text found.'
  };
};