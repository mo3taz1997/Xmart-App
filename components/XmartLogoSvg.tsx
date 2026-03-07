import React from 'react';
import Svg, { Path, G, Text as SvgText, TSpan } from 'react-native-svg';

type Props = {
  width?: number;
  isDark?: boolean;
};

export default function XmartLogoSvg({ width = 280, isDark = false }: Props) {
  const ratio = 421 / 520;
  const height = width * ratio;

  const s1 = isDark ? '#ffffff' : '#153159';
  const s2 = isDark ? '#ffffff' : '#238ccb';
  const t0 = isDark ? '#ffffff' : '#122f59';

  return (
    <Svg width={width} height={height} viewBox="0 0 520 421">
      <G>
        <SvgText
          fill={t0}
          fontSize={32}
          fontWeight="400"
          fontFamily="Roboto, sans-serif"
        >
          <TSpan x={209.981} y={280.948} dx="0 6 6 6 6 6 6 6 6 6 6 6 6 6">
            More For Less
          </TSpan>
        </SvgText>

        <G>
          <Path d="m250.3 199.4l-18-36.1h-20.7v72.3h20.7v-33.6l18 33.6 18.1-33.6v33.6h20.6v-72.3h-20.6z" fill={s1} />
          <Path fillRule="evenodd" d="m341.4 163.3l25.8 72.3h-20.6l-1.3-3.8-2.4-6.6-3.6-10.2h-21.5l-3.6 10.2-1.3 3.4-2.4 7h-20.6l25.8-72.3zm-12.9 21.7l-5.7 15.9h11.4z" fill={s1} />
          <Path fillRule="evenodd" d="m413.4 213.9l21.7 21.7h-25.8l-20.7-20.7v20.7h-20.6v-72.3h36.1q25.8 0 25.8 25.8 0 20.7-16.5 24.8zm-4.1-24.8q0-5.1-5.2-5.1h-15.5v10.3h15.5q5.2 0 5.2-5.2z" fill={s1} />
          <Path d="m431.4 163.3v20.7h18v51.6h20.7v-51.6h18v-20.7z" fill={s1} />
        </G>

        <G>
          <Path d="m130.7 171.6l-14.6-34.7h-4.6-39.1-39.1v32h52.6l14.5 34.6z" fill={s1} />
          <Path d="m145.8 272.1c0 7.2 6 13.2 13.2 13.2 7.3 0 13.3-6 13.3-13.2 0-7.3-6-13.3-13.3-13.3-7.2 0-13.2 6-13.2 13.3z" fill={s1} />
          <Path d="m159 256.3c3.1 0 6 0.9 8.4 2.4l-20.3-48-30.2 31.9 12.4 29.5h14c0-8.7 7.1-15.8 15.7-15.8z" fill={s1} />
          <Path d="m59.4 272.1c0 7.2 5.9 13.2 13.2 13.2 7.3 0 13.2-6 13.2-13.2 0-7.3-5.9-13.3-13.2-13.3-7.3 0-13.2 6-13.2 13.3z" fill={s1} />
          <Path d="m72.6 256.3c8.1 0 14.7 6.1 15.6 14l128-135.2h-48.6l-131.4 138.7h20.8q-0.1-0.8-0.1-1.7c0-8.7 7-15.8 15.7-15.8z" fill={s2} />
        </G>
      </G>
    </Svg>
  );
}
