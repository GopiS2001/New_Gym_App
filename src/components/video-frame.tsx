import { useEffect, useState } from 'react';
import { Image } from 'expo-image';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { StyleSheet } from 'react-native';

import { mediaUrl } from '@/lib/media';

// One thumbnail per video URL for the whole app session.
const cache = new Map<string, Promise<string | null>>();

function frameAtStart(url: string) {
  let p = cache.get(url);
  if (!p) {
    p = VideoThumbnails.getThumbnailAsync(url, { time: 0, quality: 0.7 })
      .then((r) => r.uri)
      .catch(() => {
        cache.delete(url); // allow a retry later (e.g. API was offline)
        return null;
      });
    cache.set(url, p);
  }
  return p;
}

/** The first frame (0 s) of a video, filling its parent. Renders nothing until ready. */
export function VideoFrame({ uri }: { uri: string }) {
  const url = mediaUrl(uri) ?? uri;
  const [frame, setFrame] = useState<{ url: string; uri: string | null } | null>(null);

  useEffect(() => {
    let alive = true;
    frameAtStart(url).then((u) => alive && setFrame({ url, uri: u }));
    return () => {
      alive = false;
    };
  }, [url]);

  const thumb = frame?.url === url ? frame.uri : null;
  if (!thumb) return null;
  return <Image source={{ uri: thumb }} style={StyleSheet.absoluteFill} contentFit="cover" transition={250} accessibilityIgnoresInvertColors />;
}
