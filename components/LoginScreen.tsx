import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Animated,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  BackHandler,
  ActivityIndicator,
} from 'react-native';
import axios from 'axios';
  import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from './api';

interface LoginScreenProps {
  email: string;
  setEmail: (email: string) => void;
  password: string;
  setPassword: (password: string) => void;
  loginEmailError: string;
  setLoginEmailError: (error: string) => void;
  loginPasswordError: string;
  setLoginPasswordError: (error: string) => void;
  fadeAnimation: Animated.Value;
  onLogin: () => void;
  onNavigateToSignup: () => void;
  onNavigateToFindAccount: () => void;
  onNavigateToResetPassword: () => void;
  showCustomAlert: (
    title: string,
    message: string,
    buttons?: Array<{ text: string; onPress?: () => void; style?: 'default' | 'cancel' | 'destructive' }>
  ) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({
  email,
  setEmail,
  password,
  setPassword,
  loginEmailError,
  setLoginEmailError,
  loginPasswordError,
  setLoginPasswordError,
  fadeAnimation,
  onLogin,
  onNavigateToSignup,
  onNavigateToFindAccount,
  onNavigateToResetPassword,
  showCustomAlert,
}) => {
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const backAction = () => {
      showCustomAlert('앱 종료', '정말로 앱을 종료하시겠습니까?', [
        { text: '취소', style: 'cancel' },
        { text: '종료', style: 'destructive', onPress: () => BackHandler.exitApp() },
      ]);
      return true;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [showCustomAlert]);

const handleLoginPress = async () => {
  // 입력값 검증...
  setIsLoading(true);
  try {
    // username과 password를 URL 인코딩된 문자열로 만듭니다.
    const payload =
      `username=${encodeURIComponent(email.trim())}` +
      `&password=${encodeURIComponent(password)}`;

    const response = await axios.post(
      `${API_BASE_URL}/auth/login`,
      payload,
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    if (response.status === 200 && response.data.access_token) {
      await AsyncStorage.setItem('accessToken', response.data.access_token);
      await AsyncStorage.setItem('refreshToken', response.data.refresh_token);
      showCustomAlert('로그인 성공', '환영합니다!');
      onLogin(); // 로그인 성공 시 챗봇 화면으로 이동
    }
  } catch (error: any) {
    let message = '로그인에 실패했습니다. 다시 시도해주세요.';
    if (axios.isAxiosError(error) && error.response?.data?.detail) {
      const detail = error.response.data.detail;
      if (Array.isArray(detail)) message = detail.map((d: any) => d.msg).join('\n');
      else if (typeof detail === 'string') message = detail;
    }
    showCustomAlert('로그인 실패', message);
  } finally {
    setIsLoading(false);
  }
};


  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0080ff" />
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.loginContainer}>
            <Animated.View style={[styles.logoContainer, { opacity: fadeAnimation }]}>
              <Text style={styles.appTitle}>AI Pet Care</Text>
              <Text style={styles.appSubtitle}>AI 펫 케어 솔루션</Text>
            </Animated.View>

            <View style={styles.formContainer}>
              <View style={styles.loginBox}>
                <Text style={styles.loginTitle}>로그인</Text>

                <TextInput
                  style={styles.input}
                  placeholder="이메일"
                  placeholderTextColor="#999"
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    if (loginEmailError) setLoginEmailError('');
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  blurOnSubmit={false}
                  returnKeyType="next"
                />
                  {loginEmailError ? <Text style={styles.errorText}>{loginEmailError}</Text> : null}
                <TextInput
                  style={styles.input}
                  placeholder="비밀번호"
                  placeholderTextColor="#999"
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (loginPasswordError) setLoginPasswordError('');
                  }}
                  secureTextEntry
                  blurOnSubmit={false}
                  returnKeyType="done"
                />
                  {loginPasswordError ? <Text style={styles.errorText}>{loginPasswordError}</Text> : null}        
                <TouchableOpacity
                  style={styles.loginButton}
                  onPress={handleLoginPress}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.loginButtonText}>로그인</Text>
                  )}
                </TouchableOpacity>

                <View style={styles.linkContainer}>
                  <TouchableOpacity onPress={onNavigateToSignup}>
                    <Text style={styles.linkText}>회원가입</Text>
                  </TouchableOpacity>
                    <Text style={styles.linkDivider}>|</Text>
                  <TouchableOpacity onPress={onNavigateToFindAccount}>
                    <Text style={styles.linkText}>계정 찾기</Text>
                  </TouchableOpacity>
                  <Text style={styles.linkDivider}>|</Text>
                  <TouchableOpacity onPress={onNavigateToResetPassword}>
                    <Text style={styles.linkText}>비밀번호 찾기</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <View style={styles.bottomSpacer} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// 스타일 정의
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  keyboardContainer: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  loginContainer: { flex: 1, paddingHorizontal: 30 },
  logoContainer: { flex: 0.5, justifyContent: 'center', alignItems: 'center', paddingTop: 10 },
  appTitle: { fontSize: 24, fontWeight: 'bold', color: '#0080ff', marginBottom: 5, textAlign: 'center' },
  appSubtitle: { fontSize: 14, color: '#666', textAlign: 'center' },
  formContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loginBox: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 30,
    borderWidth: 0,
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  bottomSpacer: { flex: 0.5 },
  loginTitle: { fontSize: 22, fontWeight: 'bold', color: '#333', textAlign: 'center', marginBottom: 15 },
  input: {
    height: 50,
    borderWidth: 0,
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 15,
    backgroundColor: '#f8f9fa',
    fontSize: 16,
    color: '#333',
  },
  errorText: { color: '#dc3545', fontSize: 12, marginTop: -10, marginBottom: 15, paddingHorizontal: 5 },
  loginButton: {
    height: 50,
    backgroundColor: '#0080ff',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
    borderWidth: 0,
  },
  loginButtonText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  linkContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  linkText: { color: '#0080ff', fontSize: 14, marginHorizontal: 5 },
  linkDivider: { color: '#ccc', marginHorizontal: 5 },
});

export default LoginScreen;
