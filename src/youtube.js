const youtubeHosts = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com']);
const videoIdPattern = /^[A-Za-z0-9_-]{11}$/;

export function getVideoId(input) {
  const text = input.trim();
  if (!/^https?:\/\/[^/]/i.test(text) || /[\s\\]/.test(text)) return null;

  let url;
  try {
    url = new URL(text);
  } catch {
    return null;
  }

  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.port) {
    return null;
  }

  let videoId;
  if (url.hostname === 'youtu.be') {
    videoId = url.pathname.match(/^\/([^/]+)\/?$/)?.[1];
  } else if (youtubeHosts.has(url.hostname)) {
    videoId = url.pathname === '/watch'
      ? url.searchParams.get('v')
      : url.pathname.match(/^\/shorts\/([^/]+)\/?$/)?.[1];
  }

  return videoId && videoIdPattern.test(videoId) ? videoId : null;
}
