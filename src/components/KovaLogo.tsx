import Svg, { Rect, G } from 'react-native-svg';
import { dark, light } from '../constants/theme';

type Props = { size?: number; mode?: 'dark' | 'light' };

export function KovaLogo({ size = 48, mode = 'dark' }: Props) {
  const c = mode === 'dark' ? dark : light;
  const stripe = mode === 'dark' ? c.bg : '#FFFFFF';
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Rect x={7} y={21} width={30} height={19} rx={4}
        fill={c.surf3} stroke={c.border2} strokeWidth={1.5} />
      <Rect x={11} y={16} width={30} height={19} rx={4}
        fill={c.surf2} stroke={c.border2} strokeWidth={1.5} />
      <G transform="rotate(-8 30 15)">
        <Rect x={15} y={6} width={30} height={19} rx={4} fill={c.accent} />
        {size >= 24 && (
          <Rect x={19} y={11} width={12} height={3} rx={1.5}
            fill={stripe} opacity={0.85} />
        )}
      </G>
    </Svg>
  );
}
