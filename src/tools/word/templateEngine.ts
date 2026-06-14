export const extractVariables = (templateText: string): string[] => {
  const matches = templateText.match(/\{\{([^}]+)\}\}/g);
  if (!matches) return [];
  // Remove {{ and }} and duplicates
  return Array.from(new Set(matches.map(m => m.slice(2, -2).trim())));
};

export const fillTemplate = (templateText: string, data: Record<string, string>): string => {
  let result = templateText;
  for (const [key, value] of Object.entries(data)) {
    const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
    result = result.replace(regex, value);
  }
  return result;
};

export const downloadFilledTemplate = (content: string, fileName: string) => {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};