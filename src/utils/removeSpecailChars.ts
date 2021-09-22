export const removeSpecialChars = (text: string) => {
  return text.replace(/['";\-\(\)\{\}]/gi, '');
};
