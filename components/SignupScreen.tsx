import React, { useEffect } from 'react';
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

// 인터페이스 정의는 기존 코드와 동일하게 유지합니다.
interface SignupScreenProps {
  signupName: string;
  setSignupName: (name: string) => void;
  signupEmail: string;
  setSignupEmail: (email: string) => void;
  signupPassword: string;
  setSignupPassword: (password: string) => void;
  signupPasswordConfirm: string;
  setSignupPasswordConfirm: (password: string) => void;
  signupPhone: string;
  setSignupPhone: (phone: string) => void;
  verificationCode: string;
  setVerificationCode: (code: string) => void;
  isCodeSent: boolean;
  setIsCodeSent: (sent: boolean) => void;
  verificationTimer: number;
  setVerificationTimer: (timer: number) => void;
  timerActive: boolean;
  setTimerActive: (active: boolean) => void;
  formatPhoneNumber: (text: string) => string;
  onSignup: () => void;
  onBackToLogin: () => void;
}

/**
 * 회원가입 화면 컴포넌트
 *
 * 백엔드의 `/auth/signup` 엔드포인트로 POST 요청을 보내 사용자 계정을 생성합니다.
 * 비밀번호 규칙 검사와 입력값 검증을 수행한 뒤 서버와 통신합니다.
 */
const SignupScreen: React.FC<SignupScreenProps> = ({
  signupName,
  setSignupName,
  signupEmail,
  setSignupEmail,
  signupPassword,
  setSignupPassword,
  signupPasswordConfirm,
  setSignupPasswordConfirm,
  signupPhone,
  setSignupPhone,
  verificationCode,
  setVerificationCode,
  isCodeSent,
  setIsCodeSent,
  verificationTimer,
  setVerificationTimer,
  timerActive,
  setTimerActive,
  formatPhoneNumber,
  onSignup, // 사용되지 않지만 props 구조 유지
  onBackToLogin,
}) => {
  // 뒤로가기 버튼 처리: 회원가입 화면에서 뒤로가면 로그인 화면으로 이동합니다.
  useEffect(() => {
    const backAction = () => {
      onBackToLogin();
      return true;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [onBackToLogin]);

  /**
   * 회원가입 버튼 클릭 시 실행되는 함수
   *
   * - 비밀번호 규칙 검사: 8자 이상, 대문자/숫자/특수문자 포함 여부 확인
   * - 비밀번호 확인 일치 여부 검사
   * - 백엔드에 POST 요청으로 사용자 정보 전송
   */
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
      // 백엔드의 회원가입 엔드포인트로 요청을 보냅니다.
      const response = await axios.post(`http://15.164.104.195:8000/auth/signup`, {
        username: signupName,
        email: signupEmail,
        password: signupPassword,
        phone_number: signupPhone,
      });

      // 회원가입 성공: 상태 코드 201
      if (response.status === 201) {
        Alert.alert('회원가입 성공!', '로그인 화면으로 이동합니다.');
        onBackToLogin();
      }
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response) {
        console.error('Signup error:', error.response.data);
        Alert.alert('회원가입 실패', error.response.data.detail || '알 수 없는 오류가 발생했습니다.');
      } else {
        console.error('An unexpected error occurred:', error);
        Alert.alert('회원가입 실패', '서버에 연결할 수 없습니다. 네트워크를 확인해주세요.');
      }
    }
  };

  // 전화번호에서 숫자만 추출하여 11자리인지 확인합니다.
  const digitsOnly = signupPhone.replace(/\D/g, '');
  const isPhoneValid = digitsOnly.length === 11;

  // 인증코드 요청 버튼 클릭 시 실행
  const handleRequestCode = () => {
    if (!isPhoneValid || timerActive) return;
    setIsCodeSent(true);
    setVerificationTimer(180); // 3분 타이머 시작
    setTimerActive(true);
    // 실제 앱에서는 여기서 SMS API를 호출해 인증번호를 전송합니다.
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
                <View style={styles.phoneVerificationContainer}>
                  <TextInput
                    style={[styles.input, styles.phoneInput]}
                    placeholder="전화번호"
                    placeholderTextColor="#999"
                    value={signupPhone}
                    onChangeText={(text) => setSignupPhone(formatPhoneNumber(text))}
                    keyboardType="number-pad"
                    maxLength={13}
                    blurOnSubmit={false}
                    returnKeyType="next"
                  />
                    <TouchableOpacity
                      style={[styles.verifyButton, (!isPhoneValid || timerActive) && styles.verifyButtonDisabled]}
                      onPress={handleRequestCode}
                      disabled={!isPhoneValid || timerActive}
                      accessibilityState={{ disabled: !isPhoneValid || timerActive }}
                    >
                      <Text style={styles.verifyButtonText}>
                        {timerActive
                          ? `${Math.floor(verificationTimer / 60)}:${(verificationTimer % 60).toString().padStart(2, '0')}`
                          : isCodeSent
                          ? '재전송'
                          : '인증요청'}
                      </Text>
                    </TouchableOpacity>
                </View>
                {isCodeSent && (
                  <View style={styles.verificationInfo}>
                    <Text style={styles.verificationSentText}>✓ 인증번호가 발송되었습니다</Text>
                    <Text style={styles.tempCodeText}>임시 인증번호: 1234</Text>
                  </View>
                )}
                <TextInput
                  style={[styles.input, !isCodeSent && styles.hiddenInput]}
                  placeholder="인증번호 입력"
                  placeholderTextColor="#999"
                  value={verificationCode}
                  onChangeText={setVerificationCode}
                  keyboardType="number-pad"
                  blurOnSubmit={false}
                  returnKeyType="done"
                  editable={isCodeSent}
                  pointerEvents={isCodeSent ? 'auto' : 'none'}
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
    </SafeAreaView>
  );
};

// 스타일 정의는 기존 코드와 동일하게 유지합니다.
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  signupInnerContainer: {
    flex: 1,
    paddingHorizontal: 30,
    justifyContent: 'center',
    minHeight: 600,
    paddingTop: 20,
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
    shadowOffset: {
      width: 0,
      height: 0,
    },
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
  phoneVerificationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  phoneInput: {
    flex: 1,
    height: 50,
    marginTop: 13,
    marginRight: 10,
  },
  verifyButton: {
    height: 50,
    backgroundColor: '#0080ff',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
    minWidth: 70,
  },
  verifyButtonDisabled: {
    backgroundColor: '#ccc',
  },
  verifyButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 14,
  },
  verificationInfo: {
    marginBottom: 15,
    paddingHorizontal: 5,
  },
  verificationSentText: {
    fontSize: 14,
    color: '#28a745',
    marginBottom: 5,
    fontWeight: '500',
  },
  tempCodeText: {
    fontSize: 14,
    color: '#0080ff',
    fontWeight: '600',
  },
  hiddenInput: {
    height: 0,
    marginBottom: 0,
    opacity: 0,
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