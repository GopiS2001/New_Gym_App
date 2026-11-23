import type { StyleProp, ViewStyle } from 'react-native';

import { useState } from 'react';
import { useEvent } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { mediaUrl } from '@/lib/media';
import { colors } from '@/theme/tokens';

import { Cover } from './content';
import { Icon, Text } from './ui';

/**
 * Exercise video with the cover image as a poster.
 * - `mode="tap"`: shows the poster with a play button; tapping starts playback with controls.
 * - `mode="loop"`: plays muted on a loop (form demo during a workout).
 * Falls back to the image with a message if the video can't load.
 */
export function ExerciseVideo({
  uri,
  posterUri,
  mode = 'tap',
  style,
  rounded = 0,
}: {
  uri: string;
  posterUri?: string | null;
  mode?: 'tap' | 'loop';
  style?: StyleProp<ViewStyle>;
  rounded?: number;
}) {
  const [started, setStarted] = useState(mode === 'loop');
  const source = mediaUrl(uri);

  if (!started) {
    return (
      <Cover uri={posterUri} style={style} rounded={rounded} icon="videocam">
        <Pressable
          onPress={() => setStarted(true)}
          accessibilityRole="button"
          accessibilityLabel="Play exercise video"
          style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}
        >
          <View style={styles.play}>
            <Icon name="play" size={30} color={colors.accentText} />
          </View>
        </Pressable>
      </Cover>
    );
  }

  return <Player source={source ?? uri} posterUri={posterUri} loop={mode === 'loop'} style={style} rounded={rounded} />;
}

function Player({ source, posterUri, loop, style, rounded }: { source: string; posterUri?: string | null; loop: boolean; style?: StyleProp<ViewStyle>; rounded: number }) {
  const player = useVideoPlayer(source, (p) => {
    // Always repeat: when the video ends it starts again automatically.
    p.loop = true;
    // The silent workout demo stays muted; the tap-to-play version keeps sound.
    p.muted = loop;
    p.play();
  });
  const { status, error } = useEvent(player, 'statusChange', { status: player.status });

  if (status === 'error') {
    return (
      <Cover uri={posterUri} style={style} rounded={rounded} icon="videocam-off">
        <View style={styles.errorBox}>
          <Text variant="caption" color={colors.text}>
            Video unavailable{error?.message ? ` · ${error.message.slice(0, 60)}` : ''}
          </Text>
        </View>
      </Cover>
    );
  }

  return (
    <View style={[{ overflow: 'hidden', borderRadius: rounded, backgroundColor: '#000' }, style]}>
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit={loop ? 'cover' : 'contain'}
        nativeControls={!loop}
        fullscreenOptions={{ enable: !loop }}
        surfaceType="textureView"
      />
      {status !== 'readyToPlay' && (
        <View style={[StyleSheet.absoluteFill, styles.loading]} pointerEvents="none">
          <ActivityIndicator color={colors.accent} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  play: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 4,
    shadowColor: colors.accent,
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },
  errorBox: {
    position: 'absolute',
    left: 12,
    bottom: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(7,14,22,0.8)',
  },
  loading: { alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.25)' },
});
