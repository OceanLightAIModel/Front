import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Animated,
  Easing,
} from 'react-native';

interface SplashScreenProps {
  onFinish?: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const fadeAI = useRef(new Animated.Value(0)).current;
  const bouncePetCareX = useRef(new Animated.Value(200)).current; // 오른쪽 화면 밖에서 시작
  const bouncePetCareY = useRef(new Animated.Value(0)).current; // 통통 튀는 효과
  const bouncePetCareOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // AI 페이드 인
    Animated.timing(fadeAI, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    // Pet Care 튀면서 등장
    Animated.sequence([
      Animated.delay(300),
      Animated.parallel([
        Animated.timing(bouncePetCareX, {
          toValue: 0,
          duration: 800,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(bouncePetCareOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
      // 통통 튀기
      Animated.sequence([
        Animated.timing(bouncePetCareY, {
          toValue: -15,
          duration: 150,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(bouncePetCareY, {
          toValue: 0,
          duration: 150,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(bouncePetCareY, {
          toValue: -8,
          duration: 120,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(bouncePetCareY, {
          toValue: 0,
          duration: 120,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    const timeout = setTimeout(() => {
      onFinish?.();
    }, 2200);

    return () => clearTimeout(timeout);
  }, [fadeAI, bouncePetCareX, bouncePetCareY, bouncePetCareOpacity, onFinish]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0080ff" />
      <View style={styles.center}>
        <Animated.Text style={[styles.aiText, { opacity: fadeAI }]}>
          AI
        </Animated.Text>
        <Animated.Text
          style={[
            styles.petCareText,
            {
              opacity: bouncePetCareOpacity,
              transform: [
                { translateX: bouncePetCareX },
                { translateY: bouncePetCareY },
              ],
            },
          ]}
        >
          Pet Care
        </Animated.Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0080ff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  aiText: { fontSize: 48, fontWeight: '900', color: '#fff' },
  petCareText: { fontSize: 28, fontWeight: '700', color: '#fff', marginTop: 8 },
});

export default SplashScreen;
