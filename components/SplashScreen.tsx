import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  SafeAreaView,
  StatusBar,
  Animated,
  Easing,
} from 'react-native';

interface SplashScreenProps {
  onFinish?: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  // 중앙 로고 애니메이션들
  const spin = useRef(new Animated.Value(0)).current;        // 0~1
  const pulse = useRef(new Animated.Value(1)).current;       // scale
  const fade = useRef(new Animated.Value(1)).current;        // 전체 페이드

  // 하단 도트
  const dots = Array.from({ length: 5 }, () => new Animated.Value(0.3));

  useEffect(() => {
    const spinAnim = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 1200,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    const pulseAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.06, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1.00, duration: 700, useNativeDriver: true }),
      ])
    );

    const dotSeq = Animated.stagger(
      150,
      dots.map(v =>
        Animated.loop(
          Animated.sequence([
            Animated.timing(v, { toValue: 1, duration: 500, useNativeDriver: true }),
            Animated.timing(v, { toValue: 0.3, duration: 500, useNativeDriver: true }),
          ])
        )
      )
    );

    spinAnim.start();
    pulseAnim.start();
    dotSeq.start();

    const timeout = setTimeout(() => {
      Animated.timing(fade, { toValue: 0, duration: 300, useNativeDriver: true })
        .start(() => onFinish?.());
    }, 2400);

    return () => {
      spin.stopAnimation();
      pulse.stopAnimation();
      dots.forEach(v => v.stopAnimation());
      clearTimeout(timeout);
    };
  }, [onFinish]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <Animated.View style={[styles.container, { opacity: fade }]}>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor="#10a37f" />

        <View style={styles.center}>
          {/* 회전 링 + 로고 */}
          <Animated.View style={[styles.logoWrapper, { transform: [{ scale: pulse }] }]}>
            {/* 회전 링 */}
            <Animated.View style={[styles.ring, { transform: [{ rotate: rotate }] }]} />
            {/* 로고 이미지 (원하는 경로로 교체) */}
            <Image
              source={require('../logo/logo2.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </Animated.View>

          <Text style={styles.title}>AI Pet Care</Text>
          <Text style={styles.subtitle}>AI 펫 헬스케어 솔루션</Text>

          {/* 도트 로딩 */}
          <View style={styles.dotsRow}>
            {dots.map((v, i) => (
              <Animated.View key={i} style={[styles.dot, { opacity: v }]} />
            ))}
          </View>
          <Text style={styles.loading}>로딩 중...</Text>
        </View>
      </SafeAreaView>
    </Animated.View>
  );
};

const SIZE = 140; // 정사각형 래퍼 크기 (센터 보장)
const RING = SIZE + 18;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#10a37f' },
  safeArea: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },

  logoWrapper: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  ring: {
    position: 'absolute',
    width: RING,
    height: RING,
    borderRadius: RING / 2,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.18)',
    borderTopColor: '#fff',
  },
  logo: { width: SIZE * 0.55, height: SIZE * 0.55 },

  title: { marginTop: 20, fontSize: 28, fontWeight: '800', color: '#fff', textAlign: 'center' },
  subtitle: { marginTop: 6, fontSize: 14, color: '#e6fff4', textAlign: 'center' },

  dotsRow: { flexDirection: 'row', marginTop: 28 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#fff', marginHorizontal: 5 },
  loading: { marginTop: 8, fontSize: 13, color: '#e6fff4' },
});

export default SplashScreen;
