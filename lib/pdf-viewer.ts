export function getViewerUrl(rawUrl: string) {
  const url = rawUrl.trim();
  if (!url) return url;

  if (url.includes("drive.google.com")) {
    const fileIdMatch = url.match(/\/file\/d\/([^/]+)/);
    if (fileIdMatch?.[1]) {
      return `https://drive.google.com/file/d/${fileIdMatch[1]}/preview`;
    }
    const idMatch = url.match(/[?&]id=([^&]+)/);
    if (idMatch?.[1]) {
      return `https://drive.google.com/file/d/${idMatch[1]}/preview`;
    }
  }

  return `https://docs.google.com/gview?embedded=1&url=${encodeURIComponent(url)}`;
}
