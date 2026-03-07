import React, { useMemo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width: SW, height: SH } = Dimensions.get('window');

const ICONS: (keyof typeof Ionicons.glyphMap)[] = [
  'phone-portrait-outline', 'laptop-outline', 'headset-outline', 'tv-outline',
  'game-controller-outline', 'watch-outline', 'tablet-portrait-outline', 'camera-outline',
  'bluetooth-outline', 'wifi-outline', 'flash-outline', 'battery-charging-outline',
  'desktop-outline', 'musical-notes-outline', 'print-outline', 'mic-outline',
  'videocam-outline', 'radio-outline', 'power-outline', 'bulb-outline',
  'calculator-outline', 'barcode-outline', 'qr-code-outline', 'keypad-outline',
  'volume-high-outline', 'disc-outline', 'cube-outline', 'gift-outline',
  'cart-outline', 'bag-handle-outline', 'sparkles-outline', 'star-outline',
  'heart-outline', 'chatbubble-outline', 'notifications-outline', 'settings-outline'
];

const COLS = 10;
const ROWS = 25;
const CELL_W = SW / COLS;
const CELL_H = SH / ROWS;

function seed(n: number) {
  return ((Math.sin(n * 127.1 + 311.7) * 43758.5453) % 1 + 1) % 1;
}

export default React.memo(function PageBackground({ isDark }: { isDark: boolean }) {
  const iconColor = isDark ? '#248CCC' : '#163259';
  const opacity = isDark ? 0.08 : 0.055;

  const pattern = useMemo(() => {
    const items = [];
    let iconIdx = 0;
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const s = seed(row * COLS + col);
        const s2 = seed(row * COLS + col + 500);
        const s3 = seed(row * COLS + col + 1000);
        
        // Use fixed grid with very minimal jitter to prevent overlap
        const offsetX = (row % 2 === 0) ? 0 : CELL_W * 0.5;
        const jitterX = (s - 0.5) * CELL_W * 0.2; // Reduced jitter
        const jitterY = (s2 - 0.5) * CELL_H * 0.2; // Reduced jitter

        items.push(
          <View
            key={`${row}-${col}`}
            style={{
              position: 'absolute',
              left: col * CELL_W + offsetX + jitterX,
              top: row * CELL_H + jitterY,
              opacity: opacity,
              transform: [{ rotate: `${(s * 60) - 30}deg` }],
              width: CELL_W,
              height: CELL_H,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons 
              name={ICONS[iconIdx % ICONS.length]} 
              size={14 + s3 * 6} 
              color={iconColor} 
            />
          </View>
        );
        iconIdx++;
      }
    }
    return items;
  }, [iconColor, opacity]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient
        colors={isDark
          ? ['#0B1A2E', '#0E2138', '#0B1A2E']
          : ['#F5F7FA', '#EAF2FB', '#F5F7FA']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {pattern}
    </View>
  );
});
