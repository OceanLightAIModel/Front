// LoginScreen.tsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_BASE_URL, setTokens } from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  BackHandler,
  ActivityIndicator,
} from 'react-native';
import SignupScreen from './SignupScreen';
import FindAccountScreen from './FindAccountScreen';
import ResetPasswordScreen from './ResetPasswordScreen';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

interface LoginScreenProps {
  email: string;
  setEmail: (email: string) => void;
  password: string;
  setPassword: (password: string) => void;
  loginEmailError: string;
  setLoginEmailError: (error: string) => void;
  loginPasswordError: string;
  setLoginPasswordError: (error: string) => void;
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
  onLogin,
  onNavigateToSignup,
  onNavigateToFindAccount,
  onNavigateToResetPassword,
  showCustomAlert,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // 백 버튼으로 앱 종료 확인
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

  // 앱 시작 시 저장된 토큰이 있으면 자동 로그인
  useEffect(() => {
    const checkLoggedIn = async () => {
      const token = await AsyncStorage.getItem('accessToken');
      if (token) {
        onLogin(); // 토큰이 있으면 로그인 화면을 거치지 않고 바로 이동
      } else {
        setCheckingAuth(false); // 토큰이 없으면 로그인 화면을 표시
      }
    };
    checkLoggedIn();
  }, []);

  // 토큰 확인이 끝나기 전엔 아무것도 렌더링하지 않음
  if (checkingAuth) {
    return null;
  }

  // 로그인 버튼 클릭 처리
  const handleLoginPress = async () => {
    if (!email.trim() || !password) {
      showCustomAlert('로그인 실패', '이메일과 비밀번호를 모두 입력해주세요.');
      return;
    }
    setIsLoading(true);
    try {
      const formData = new URLSearchParams();
      formData.append('username', email.trim());
      formData.append('password', password);

      const response = await axios.post(
        `${API_BASE_URL}/auth/login`,
        formData.toString(),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          validateStatus: (status) => status < 400,
        }
      );

      const { access_token, refresh_token } = response.data;

      // 로그인 성공 시 토큰 저장
      await setTokens(access_token, refresh_token);
      onLogin();
    } catch (error: any) {
      if (axios.isAxiosError(error) && error.response) {
        const msg =
          error.response.data?.detail || error.response.data?.message || '이메일 또는 비밀번호가 올바르지 않습니다.';
        showCustomAlert('로그인 실패', msg);
      } else {
        showCustomAlert('로그인 실패', '서버에 연결할 수 없습니다.');
      }
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
            {/* 상단 로고/타이틀 영역 */}
            <View style={styles.logoContainer}>
              <Text style={styles.appTitle}>AI Pet Care</Text>
              <Text style={styles.appSubtitle}>AI 펫 케어 솔루션</Text>
            </View>

            {/* 로그인 폼 영역 */}
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

                <View style={{ position: 'relative', marginBottom: 15 }}>
                  <TextInput
                    style={[styles.input, { paddingRight: 40, marginBottom: 0 }]}
                    placeholder="비밀번호"
                    placeholderTextColor="#999"
                    value={password}
                    onChangeText={(text) => {
                      setPassword(text);
                      if (loginPasswordError) setLoginPasswordError('');
                    }}
                    secureTextEntry={!showPassword}
                    blurOnSubmit={false}
                    returnKeyType="done"
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword((prev) => !prev)}
                    style={{
                      position: 'absolute',
                      right: 15,
                      top: 12,
                      width: 24,
                      height: 24,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <MaterialIcons
                      name={showPassword ? 'visibility-off' : 'visibility'}
                      size={22}
                      color="#9c9c9c"
                    />
                  </TouchableOpacity>
                </View>
                {loginPasswordError ? <Text style={styles.errorText}>{loginPasswordError}</Text> : null}

                {/* 로그인 유지하기 체크 */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                  <TouchableOpacity
                    onPress={() => setRememberMe((prev) => !prev)}
                    style={{ flexDirection: 'row', alignItems: 'center' }}
                  >
                    <MaterialIcons
                      name={rememberMe ? 'check-box' : 'check-box-outline-blank'}
                      size={20}
                      color="#9c9c9cd8"
                    />
                    <Text style={{ marginLeft: 6, color: '#333', fontSize: 14 }}>로그인 유지하기</Text>
                  </TouchableOpacity>
                </View>

                {/* 로그인 버튼 */}
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

                {/* 회원가입 / 기타 링크 */}
                <View style={styles.linkContainer}>
                  <TouchableOpacity onPress={onNavigateToSignup}>
                    <Text style={styles.linkText}>회원가입</Text>
                  </TouchableOpacity>
                  {/* 다른 링크를 추가하려면 아래처럼 컴포넌트를 추가하세요 */}
                  {/* <Text style={styles.linkDivider}>|</Text>
                  <TouchableOpacity onPress={onNavigateToFindAccount}>
                    <Text style={styles.linkText}>계정 찾기</Text>
                  </TouchableOpacity> */}
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  keyboardContainer: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  loginContainer: { flex: 1, paddingHorizontal: 30 },
  logoContainer: { flex: 0.5, justifyContent: 'center', alignItems: 'center', paddingTop: 10 },
  appTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0080ff',
    marginBottom: 5,
    textAlign: 'center',
  },
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
  loginTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 15,
  },
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
  errorText: {
    color: '#dc3545',
    fontSize: 12,
    marginTop: -10,
    marginBottom: 15,
    paddingHorizontal: 5,
  },
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
