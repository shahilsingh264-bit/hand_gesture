export const svgDataUrls = {
  flower1: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="15" fill="%23FFD700"/><path d="M50 15 Q65 35 50 45 Q35 35 50 15 Z" fill="%23FF69B4"/><path d="M50 85 Q65 65 50 55 Q35 65 50 85 Z" fill="%23FF69B4"/><path d="M15 50 Q35 65 45 50 Q35 35 15 50 Z" fill="%23FF69B4"/><path d="M85 50 Q65 65 55 50 Q65 35 85 50 Z" fill="%23FF69B4"/></svg>`,
  flower2: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="12" fill="%23FF8C00"/><circle cx="50" cy="25" r="18" fill="%238A2BE2"/><circle cx="50" cy="75" r="18" fill="%238A2BE2"/><circle cx="25" cy="50" r="18" fill="%238A2BE2"/><circle cx="75" cy="50" r="18" fill="%238A2BE2"/><circle cx="32" cy="32" r="18" fill="%238A2BE2"/><circle cx="68" cy="68" r="18" fill="%238A2BE2"/><circle cx="32" cy="68" r="18" fill="%238A2BE2"/><circle cx="68" cy="32" r="18" fill="%238A2BE2"/></svg>`,
  flower3: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="15" fill="%23FFFF00"/><path d="M50 20 L60 40 L80 50 L60 60 L50 80 L40 60 L20 50 L40 40 Z" fill="%2300BFFF"/></svg>`,
  leaf: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M20 80 Q50 30 80 20 Q50 70 20 80 Z" fill="%2332CD32"/></svg>`,
  sparkle: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M50 10 Q55 45 90 50 Q55 55 50 90 Q45 55 10 50 Q45 45 50 10 Z" fill="%23FFFFFF"/></svg>`
};

export const loadAssets = async (): Promise<HTMLImageElement[]> => {
  const promises = Object.values(svgDataUrls).map(url => {
    return new Promise<HTMLImageElement>((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.src = url;
    });
  });
  return Promise.all(promises);
};
