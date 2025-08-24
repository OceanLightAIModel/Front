// SignupScreen.tsx
import React, { useEffect, useState } from 'react';
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
  Alert,
} from 'react-native';
import axios from 'axios';
import { API_BASE_URL } from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CustomAlert from './CustomAlert'; // 커스텀 알림 컴포넌트 import

interface SignupScreenProps {
  signupName: string;
  setSignupName: (name: string) => void;
  signupEmail: string;
  setSignupEmail: (email: string) => void;
  signupPassword: string;
  setSignupPassword: (password: string) => void;
  signupPasswordConfirm: string;
  setSignupPasswordConfirm: (password: string) => void;
  onSignup: () => void; // 사용되지 않지만 props 구조 유지
  onBackToLogin: () => void;
}

const SignupScreen: React.FC<SignupScreenProps> = ({
  signupName,
  setSignupName,
  signupEmail,
  setSignupEmail,
  signupPassword,
  setSignupPassword,
  signupPasswordConfirm,
  setSignupPasswordConfirm,
  onSignup,
  onBackToLogin,
}) => {
  // 커스텀 알림 상태
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertButtons, setAlertButtons] = useState<
    Array<{ text: string; onPress?: () => void; style?: 'default' | 'cancel' | 'destructive' }>
  >([{ text: '확인' }]);

  useEffect(() => {
    const backAction = () => {
      onBackToLogin();
      return true;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [onBackToLogin]);

  // 회원가입 버튼 클릭 처리
  const handleSignupPress = async () => {
    const pwd = signupPassword ?? '';
    const confirm = signupPasswordConfirm ?? '';

    const hasUpper = /[A-Z]/.test(pwd);
    const hasNumber = /\d/.test(pwd);
    const hasSpecial = /[^A-Za-z0-9]/.test(pwd);
    const longEnough = pwd.length >= 8;

    if (!longEnough) {
      Alert.alert('비밀번호 규칙', '비밀번호는 8자리 이상이어야 합니다.');
      return;
    }
    if (!hasUpper) {
      Alert.alert('비밀번호 규칙', '영어 대문자를 최소 1자 포함해야 합니다.');
      return;
    }
    if (!hasNumber) {
      Alert.alert('비밀번호 규칙', '숫자를 최소 1자 포함해야 합니다.');
      return;
    }
    if (!hasSpecial) {
      Alert.alert('비밀번호 규칙', '특수문자를 최소 1자 포함해야 합니다.');
      return;
    }
    if (pwd !== confirm) {
      Alert.alert('비밀번호 확인', '비밀번호가 일치하지 않습니다.');
      return;
    }

    try {
      const response = await axios.post(
        `${API_BASE_URL}/auth/signup`,
        {
          username: signupName,
          email: signupEmail,
          password: signupPassword,
          chat_theme: false,
          dark_mode: false,
          created_at: new Date().toISOString(),
        },
        {
          validateStatus: (status) => status < 400,
        }
      );

      // 회원가입 성공 시 커스텀 알림 표시
      if (response.status === 201) {
        await AsyncStorage.setItem('username', signupName);
        setAlertTitle('회원가입을 축하드립니다!');
        setAlertMessage('로그인 화면으로 이동합니다.');
        setAlertButtons([
          {
            text: '확인',
            onPress: () => {
              setAlertVisible(false);
              onBackToLogin();
            },
          },
        ]);
        setAlertVisible(true);
      }
    } catch (error: any) {
      // 실패 시 커스텀 알림 표시
      if (axios.isAxiosError(error) && error.response) {
        const detailMsg =
          (error.response.data &&
            (error.response.data.detail || error.response.data.message)) ||
          '알 수 없는 오류가 발생했습니다.';
        setAlertTitle('회원가입 실패');
        setAlertMessage(detailMsg);
      } else {
        setAlertTitle('회원가입 실패');
        setAlertMessage('서버에 연결할 수 없습니다. 네트워크를 확인해주세요.');
      }
      setAlertButtons([
        {
          text: '확인',
          onPress: () => {
            setAlertVisible(false);
          },
        },
      ]);
      setAlertVisible(true);
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
          <View style={styles.signupInnerContainer}>
            {/* 상단 헤더 */}
            <View style={styles.headerContainer}>
              <Text style={styles.appTitle}>AI Pet Care</Text>
              <Text style={styles.appSubtitle}>AI 펫 케어 솔루션</Text>
            </View>

            <View style={styles.signupFormBox}>
              <View style={styles.loginBox}>
                <TouchableOpacity style={styles.closeButton} onPress={onBackToLogin}>
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
                <Text style={styles.loginTitle}>회원가입</Text>
                <TextInput
                  style={styles.input}
                  placeholder="이름"
                  placeholderTextColor="#999"
                  value={signupName}
                  onChangeText={setSignupName}
                  autoCapitalize="words"
                  blurOnSubmit={false}
                  returnKeyType="next"
                />
                <TextInput
                  style={styles.input}
                  placeholder="이메일"
                  placeholderTextColor="#999"
                  value={signupEmail}
                  onChangeText={setSignupEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  blurOnSubmit={false}
                  returnKeyType="next"
                />
                <TextInput
                  style={styles.input}
                  placeholder="비밀번호"
                  placeholderTextColor="#999"
                  value={signupPassword}
                  onChangeText={setSignupPassword}
                  secureTextEntry
                  blurOnSubmit={false}
                  returnKeyType="next"
                />
                <Text style={styles.passwordHint}>
                  (대문자/숫자/특수문자 포함 8자 이상)
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="비밀번호 확인"
                  placeholderTextColor="#999"
                  value={signupPasswordConfirm}
                  onChangeText={setSignupPasswordConfirm}
                  secureTextEntry
                  blurOnSubmit={false}
                  returnKeyType="next"
                />
                <View style={styles.loginPromptContainer}>
                  <Text style={styles.loginPrompt}>이미 계정이 있다면</Text>
                  <TouchableOpacity onPress={onBackToLogin}>
                    <Text style={styles.loginLinkText}>로그인하기</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity style={styles.signupButton} onPress={handleSignupPress}>
                  <Text style={styles.signupButtonText}>회원가입</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* 커스텀 알림 컴포넌트 */}
      <CustomAlert
        visible={alertVisible}
        title={alertTitle}
        message={alertMessage}
        buttons={alertButtons}
        onClose={() => setAlertVisible(false)}
      />
    </SafeAreaView>
  );
};

// 스타일 정의
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  keyboardContainer: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  signupInnerContainer: {
    flex: 1,
    paddingHorizontal: 30,
    justifyContent: 'center',
    minHeight: 600,
    paddingTop: 20,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  appTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0080ff',
    marginBottom: 5,
    textAlign: 'center',
  },
  appSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  signupFormBox: {
    justifyContent: 'center',
    alignItems: 'center',
  },
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
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  closeButtonText: {
    fontSize: 20,
    color: '#999',
    fontWeight: 'bold',
  },
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
  passwordHint: {
    fontSize: 12,
    color: '#666',
    marginTop: -10,
    marginBottom: 10,
    paddingHorizontal: 5,
  },
  loginPromptContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 25,
  },
  loginPrompt: {
    fontSize: 14,
    color: '#666',
    marginRight: 5,
  },
  loginLinkText: {
    fontSize: 14,
    color: '#0080ff',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  signupButton: {
    height: 50,
    backgroundColor: '#0080ff',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0,
  },
  signupButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default SignupScreen;
