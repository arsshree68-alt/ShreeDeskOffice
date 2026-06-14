export interface ReportData {
  title: string;
  author: string;
  date: string;
  sections: Array<{
    heading: string;
    content: string;
  }>;
}

export const generateWordReport = async (data: ReportData): Promise<Blob> => {
  // We use the HTML trick to generate a basic Word document that opens in MS Word.
  // Real DOCX requires complex ZIP/XML which is heavy to write from scratch without a lib.
  const htmlContent = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head><title>${data.title}</title>
    <!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom><w:DoNotOptimizeForBrowser/></w:WordDocument></xml><![endif]-->
    <style>
      body { font-family: 'Calibri', sans-serif; font-size: 11pt; }
      h1 { color: #2e74b5; font-size: 24pt; border-bottom: 1px solid #2e74b5; padding-bottom: 5px; }
      h2 { color: #2e74b5; font-size: 16pt; margin-top: 20px; }
      p { margin-bottom: 10px; line-height: 1.5; }
      .meta { color: #595959; font-size: 10pt; font-style: italic; margin-bottom: 30px; }
    </style>
    </head>
    <body>
      <h1>${data.title}</h1>
      <div class="meta">Prepared by: ${data.author} | Date: ${data.date}</div>
      ${data.sections.map(s => `
        <h2>${s.heading}</h2>
        <p>${s.content.replace(/\n/g, '<br/>')}</p>
      `).join('')}
    </body>
    </html>
  `;
  
  return new Blob(['\ufeff', htmlContent], { type: 'application/msword' });
};
