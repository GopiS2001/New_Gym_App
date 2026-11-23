import { useMemo, useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';

import { colors } from '@/theme/tokens';

import { Text } from './ui';

// ----------------------------------------------------------------------

/** Circular progress ring (design: "85% Completed"). */
export function ProgressRing({
  value,
  size = 84,
  stroke = 8,
  label,
  sublabel,
}: {
  value: number;
  size?: number;
  stroke?: number;
  label?: string;
  sublabel?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }} accessibilityLabel={`${Math.round(pct)} percent ${sublabel ?? ''}`}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.surface3} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={colors.accent}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${(c * pct) / 100} ${c}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <Text variant="bodyStrong" style={{ fontSize: size > 70 ? 17 : 13 }}>
        {label ?? `${Math.round(pct)}%`}
      </Text>
      {sublabel && (
        <Text variant="caption" color={colors.muted} style={{ fontSize: 9 }}>
          {sublabel}
        </Text>
      )}
    </View>
  );
}

// ----------------------------------------------------------------------

function smoothPath(points: { x: number; y: number }[]) {
  if (points.length < 2) return '';
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

/**
 * Single-series area chart (design: Progress screen). Tap a point to read its
 * exact value; labels sit under the axis.
 */
export function AreaChart({
  data,
  height = 180,
  formatValue = (v) => String(v),
  unit,
}: {
  data: { label: string; value: number }[];
  height?: number;
  formatValue?: (v: number) => string;
  unit?: string;
}) {
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<number | null>(null);
  const padX = 8;
  const padTop = 16;
  const chartH = height - 30;

  const { pts, area, line } = useMemo(() => {
    if (!width || !data.length) return { pts: [], area: '', line: '' };
    const max = Math.max(1, ...data.map((d) => d.value));
    const step = data.length > 1 ? (width - padX * 2) / (data.length - 1) : 0;
    const p = data.map((d, i) => ({ x: padX + i * step, y: padTop + (chartH - padTop) * (1 - d.value / max) }));
    const l = smoothPath(p);
    return { pts: p, line: l, area: `${l} L ${p[p.length - 1].x} ${chartH} L ${p[0].x} ${chartH} Z` };
  }, [width, data, chartH]);

  const labelEvery = Math.max(1, Math.ceil(data.length / 7));
  const sel = active ?? data.length - 1;

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {data.length > 0 && (
        <Text variant="smallStrong" color={colors.textSecondary} style={{ marginBottom: 6 }}>
          {data[sel]?.label}:{' '}
          <Text variant="smallStrong" color={colors.accent}>
            {formatValue(data[sel]?.value ?? 0)}
            {unit ? ` ${unit}` : ''}
          </Text>
        </Text>
      )}
      <View style={{ height }}>
        {width > 0 && (
          <Svg width={width} height={height}>
            <Defs>
              <LinearGradient id="area" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={colors.accent} stopOpacity={0.45} />
                <Stop offset="1" stopColor={colors.accent} stopOpacity={0.02} />
              </LinearGradient>
            </Defs>
            {[0.25, 0.5, 0.75].map((f) => (
              <Line key={f} x1={0} x2={width} y1={padTop + (chartH - padTop) * f} y2={padTop + (chartH - padTop) * f} stroke={colors.border} strokeDasharray="4 6" />
            ))}
            {!!area && <Path d={area} fill="url(#area)" />}
            {!!line && <Path d={line} stroke={colors.accent} strokeWidth={2} fill="none" />}
            {pts[sel] && (
              <>
                <Line x1={pts[sel].x} x2={pts[sel].x} y1={padTop} y2={chartH} stroke={colors.borderStrong} />
                <Circle cx={pts[sel].x} cy={pts[sel].y} r={6} fill={colors.bg} stroke={colors.accent} strokeWidth={2} />
              </>
            )}
          </Svg>
        )}
        {/* Touch targets larger than the marks */}
        <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 24, flexDirection: 'row' }}>
          {data.map((d, i) => (
            <View
              key={i}
              style={{ flex: 1 }}
              onStartShouldSetResponder={() => true}
              onResponderGrant={() => setActive(i)}
              accessibilityLabel={`${d.label}: ${formatValue(d.value)}`}
            />
          ))}
        </View>
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 20 }}>
          {pts.map((p, i) =>
            i % labelEvery === 0 || i === pts.length - 1 ? (
              <Text key={i} variant="caption" color={colors.muted} style={{ position: 'absolute', left: Math.max(0, Math.min(width - 32, p.x - 16)), width: 32, textAlign: 'center', fontSize: 10 }}>
                {data[i].label.split(' ')[0]}
              </Text>
            ) : null
          )}
        </View>
      </View>
    </View>
  );
}

/** Thin single-hue bars for per-day counts. */
export function BarStrip({ data, height = 120 }: { data: { label: string; value: number }[]; height?: number }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', height, gap: 6 }}>
      {data.map((d, i) => (
        <View key={i} style={{ flex: 1, alignItems: 'center', gap: 6 }} accessibilityLabel={`${d.label}: ${d.value}`}>
          <View
            style={{
              width: '70%',
              maxWidth: 18,
              height: Math.max(4, ((height - 24) * d.value) / max),
              borderTopLeftRadius: 6,
              borderTopRightRadius: 6,
              backgroundColor: d.value ? colors.accent : colors.surface3,
            }}
          />
          <Text variant="caption" color={colors.muted} style={{ fontSize: 10 }}>
            {d.label}
          </Text>
        </View>
      ))}
    </View>
  );
}
