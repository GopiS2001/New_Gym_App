import { createElement } from 'react';

import { mediaUrl } from '@/lib/media';

/**
 * Web: let the browser show the video's first frame (0 s) directly.
 * Only metadata + the first frame are fetched; it never plays.
 */
export function VideoFrame({ uri }: { uri: string }) {
  const url = mediaUrl(uri) ?? uri;
  return createElement('video', {
    src: `${url}#t=0.001`,
    preload: 'metadata',
    muted: true,
    playsInline: true,
    'aria-hidden': true,
    tabIndex: -1,
    style: { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' },
  });
}
