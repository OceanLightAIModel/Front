import React, { useEffect } from 'react';
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
} from 'react-native';

interface ResetPasswordScreenProps {
  resetEmail: string;
  setResetEmail: (email: string) => void;
  resetVerificationCode: string;
  setResetVerificationCode: (code: string) => void;
  isResetCodeSent: boolean;
  setIsResetCodeSent: (sent: boolean) => void;
  resetVerificationTimer: number;
  setResetVerificationTimer: (timer: number) => void;
  resetTimerActive: boolean;
  setResetTimerActive: (active: boolean) => void;
  showPasswordReset: boolean;
  setShowPasswordReset: (show: boolean) => void;
  newPassword: string;
  setNewPassword: (password: string) => void;
  newPasswordConfirm: string;
  setNewPasswordConfirm: (password: string) => void;
  resetEmailError: string;
  setResetEmailError: (error: string) => void;
  fadeAnimation: Animated.Value;
  validateEmail: (email: string) => boolean;
  validatePassword: (password: string) => boolean; // 사용은 하지만 자체 규칙 검사도 수행
  onBackToLogin: () => void;
  onNavigateToFindAccount: () => void;
  showCustomAlert: (title: string, message: string, buttons?: Array<{text: string; onPress?: () => void}>) => void;
}

const ResetPasswordScreen: React.FC<ResetPasswordScreenProps> = ({
  resetEmail,
  setResetEmail,
  resetVerificationCode,
  setResetVerificationCode,
  isResetCodeSent,
  setIsResetCodeSent,
  resetVerificationTimer,
  setResetVerificationTimer,
  resetTimerActive,
  setResetTimerActive,
  showPasswordReset,
  setShowPasswordReset,
  newPassword,
  setNewPassword,
  newPasswordConfirm,
  setNewPasswordConfirm,
  resetEmailError,
  setResetEmailError,
  fadeAnimation,
  validateEmail,
  validatePassword,
  onBackToLogin,
  onNavigateToFindAccount,
  showCustomAlert,
}) => {
  // 하드웨어 뒤로가기 버튼 처리
  useEffect(() => {
    const backAction = () => {
      onBackToLogin();
      return true;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [onBackToLogin]);

  const handleVerifyCode = () => {
    if (!resetEmail) {
      setResetEmailError('이메일을 입력해 주세요.');
      return;
    }
    if (!validateEmail(resetEmail)) {
      setResetEmailError('올바른 이메일 형식이 아닙니다');
      return;
    }
    if (!isResetCodeSent) {
      showCustomAlert('입력 오류', '인증번호를 먼저 요청해 주세요.');
      return;
    }
    if (!resetVerificationCode) {
      showCustomAlert('입력 오류', '인증번호를 입력해 주세요.');
      return;
    }
    if (resetVerificationCode === '123456') {
      setShowPasswordReset(true);
    } else {
      showCustomAlert('인증 실패', '인증번호가 올바르지 않습니다.');
    }
  };

  // 회원가입과 동일한 규칙 적용: 대문자/숫자/특수문자 포함 8자 이상 + 일치 여부
  const handleResetPassword = () => {
    const pwd = newPassword ?? '';
    const confirm = newPasswordConfirm ?? '';

    if (!pwd || !confirm) {
      showCustomAlert('입력 오류', '모든 필드를 입력해 주세요.');
      return;
    }

    const hasUpper = /[A-Z]/.test(pwd);
    const hasNumber = /\d/.test(pwd);
    const hasSpecial = /[^A-Za-z0-9]/.test(pwd);
    const longEnough = pwd.length >= 8;

    if (!longEnough) {
      showCustomAlert('비밀번호 규칙', '비밀번호는 8자리 이상이어야 합니다.');
      return;
    }
    if (!hasUpper) {
      showCustomAlert('비밀번호 규칙', '영어 대문자를 최소 1자 포함해야 합니다.');
      return;
    }
    if (!hasNumber) {
      showCustomAlert('비밀번호 규칙', '숫자를 최소 1자 포함해야 합니다.');
      return;
    }
    if (!hasSpecial) {
      showCustomAlert('비밀번호 규칙', '특수문자를 최소 1자 포함해야 합니다.');
      return;
    }
    if (pwd !== confirm) {
      showCustomAlert('비밀번호 확인', '비밀번호가 일치하지 않습니다.');
      return;
    }

    // (선택) 기존 validatePassword까지 통과시키고 싶다면 유지
    if (!validatePassword(pwd)) {
      showCustomAlert('입력 오류', '비밀번호 형식이 올바르지 않습니다.');
      return;
    }

    showCustomAlert('비밀번호 변경 완료', '비밀번호가 성공적으로 변경되었습니다.', [
      { text: '확인', onPress: onBackToLogin }
    ]);
  };

  const handleSendCode = () => {
    if (resetEmail.length > 0 && validateEmail(resetEmail) && !resetTimerActive) {
      setIsResetCodeSent(true);
      setResetVerificationTimer(180); // 3분 = 180초
      setResetTimerActive(true);
      setResetEmailError('');
      // 실제 앱에서는 여기서 이메일 인증코드를 전송합니다
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
            {/* 상단 로고 영역 - 애니메이션 적용 */}
            <Animated.View style={[styles.logoContainer, { opacity: fadeAnimation }]}>
              <Text style={styles.appTitle}>AI Pet Care</Text>
              <Text style={styles.appSubtitle}>AI 펫 헬스케어 솔루션</Text>
            </Animated.View>

            {/* 중앙 폼 */}
            <View style={styles.formContainer}>
              <View style={styles.loginBox}>
                {/* X 버튼 */}
                <TouchableOpacity 
                  style={styles.closeButton}
                  onPress={onBackToLogin}
                >
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>

                <Text style={styles.loginTitle}>
                  {showPasswordReset ? '새 비밀번호 설정' : '비밀번호 찾기'}
                </Text>
                
                {!showPasswordReset ? (
                  <>
                    <View style={styles.tempInfoContainer}>
                      <Text style={styles.tempInfoText}>임시 이메일: 1234@1234.com</Text>
                    </View>
                    
                    <View style={styles.phoneInputWrapper}>
                      <TextInput
                        style={styles.phoneInput}
                        placeholder="이메일"
                        placeholderTextColor="#999"
                        value={resetEmail}
                        onChangeText={(text) => {
                          setResetEmail(text);
                          if (text.length > 0 && !validateEmail(text)) {
                            setResetEmailError('올바른 이메일 형식이 아닙니다');
                          } else {
                            setResetEmailError('');
                          }
                        }}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        blurOnSubmit={false}
                        returnKeyType="next"
                      />
                      
                      <TouchableOpacity 
                        style={[
                          styles.verificationButton,
                          (validateEmail(resetEmail) && resetEmail.length > 0 && !resetTimerActive) ? styles.verificationButtonActive : styles.verificationButtonInactive
                        ]}
                        onPress={handleSendCode}
                        disabled={isResetCodeSent || resetTimerActive || !validateEmail(resetEmail) || resetEmail.length === 0}
                      >
                        <Text style={[
                          styles.verificationButtonText,
                          (validateEmail(resetEmail) && resetEmail.length > 0 && !resetTimerActive) ? styles.verificationButtonTextActive : styles.verificationButtonTextInactive
                        ]}>
                          {resetTimerActive ? `${Math.floor(resetVerificationTimer / 60)}:${(resetVerificationTimer % 60).toString().padStart(2, '0')}` : 
                           isResetCodeSent ? '재전송' : '인증요청'}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {resetEmailError ? (
                      <Text style={styles.errorText}>{resetEmailError}</Text>
                    ) : null}

                    {isResetCodeSent && (
                      <View style={styles.verificationInfo}>
                        <Text style={styles.verificationSentText}>
                          ✓ 이메일로 인증번호가 발송되었습니다
                        </Text>
                        <Text style={styles.tempCodeText}>
                          임시 인증번호: 123456
                        </Text>
                      </View>
                    )}
                    
                    {isResetCodeSent && (
                      <View style={styles.phoneInputWrapper}>
                        <TextInput
                          style={styles.phoneInput}
                          placeholder="인증번호 6자리"
                          placeholderTextColor="#999"
                          value={resetVerificationCode}
                          onChangeText={setResetVerificationCode}
                          keyboardType="number-pad"
                          maxLength={6}
                          blurOnSubmit={false}
                          returnKeyType="done"
                        />
                        <TouchableOpacity 
                          style={[
                            styles.verifyButton,
                            resetVerificationCode.length >= 4 ? styles.verifyButtonActive : styles.verifyButtonInactive
                          ]}
                          onPress={handleVerifyCode}
                          disabled={resetVerificationCode.length < 4}
                        >
                          <Text style={[
                            styles.verifyButtonText,
                            resetVerificationCode.length >= 4 ? styles.verifyButtonTextActive : styles.verifyButtonTextInactive
                          ]}>
                            인증하기
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    <TouchableOpacity 
                      style={styles.signupButton} 
                      onPress={handleVerifyCode}
                    >
                      <Text style={styles.signupButtonText}>비밀번호 찾기</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <TextInput
                      style={styles.input}
                      placeholder="새 비밀번호"
                      placeholderTextColor="#999"
                      value={newPassword}
                      onChangeText={setNewPassword}
                      secureTextEntry
                      blurOnSubmit={false}
                      returnKeyType="next"
                    />
                    {/* 비밀번호 규칙 힌트(작게) */}
                    <Text style={styles.passwordHint}>
                      (대문자/숫자/특수문자 포함 8자 이상)
                    </Text>

                    <TextInput
                      style={styles.input}
                      placeholder="새 비밀번호 확인"
                      placeholderTextColor="#999"
                      value={newPasswordConfirm}
                      onChangeText={setNewPasswordConfirm}
                      secureTextEntry
                      blurOnSubmit={false}
                      returnKeyType="done"
                    />

                    <TouchableOpacity 
                      style={styles.signupButton} 
                      onPress={handleResetPassword}
                    >
                      <Text style={styles.signupButtonText}>비밀번호 변경</Text>
                    </TouchableOpacity>
                  </>
                )}

                <View style={styles.loginPromptContainer}>
                  <Text style={styles.loginPrompt}>계정을 기억하셨다면</Text>
                  <TouchableOpacity onPress={onBackToLogin}>
                    <Text style={styles.loginLinkText}>로그인하기</Text>
                  </TouchableOpacity>
                  <Text style={styles.loginPrompt}> | </Text>
                  <TouchableOpacity onPress={onNavigateToFindAccount}>
                    <Text style={styles.loginLinkText}>계정 찾기</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* 하단 여백 */}
            <View style={styles.bottomSpacer} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

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
  loginContainer: {
    flex: 1,
    paddingHorizontal: 30,
  },
  logoContainer: {
    flex: 0.5,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 10,
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
  formContainer: {
    flex: 1.8,
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
  bottomSpacer: {
    flex: 0.5,
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
  tempInfoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  tempInfoText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 3,
  },
  phoneVerificationContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 15,
  },
  phoneInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    gap: 10,
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
  phoneInput: {
    flex: 1,
    height: 50,
    borderWidth: 0,
    borderRadius: 10,
    paddingHorizontal: 15,
    backgroundColor: '#f8f9fa',
    fontSize: 16,
    color: '#333',
  },
  verificationButton: {
    height: 50,
    paddingHorizontal: 16,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 1,
  },
  verificationButtonActive: {
    backgroundColor: '#0080ff',
  },
  verificationButtonInactive: {
    backgroundColor: '#e9ecef',
  },
  verificationButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  verificationButtonTextActive: {
    color: '#fff',
  },
  verificationButtonTextInactive: {
    color: '#999',
  },
  verifyButton: {
    height: 50,
    paddingHorizontal: 16,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 80,
  },
  verifyButtonActive: {
    backgroundColor: '#28a745',
  },
  verifyButtonInactive: {
    backgroundColor: '#e9ecef',
  },
  verifyButtonTextActive: {
    color: '#fff',
  },
  verifyButtonTextInactive: {
    color: '#999',
  },
  verifyButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  verifyButtonDisabled: {
    backgroundColor: '#ccc',
  },
  errorText: {
    color: '#dc3545',
    fontSize: 12,
    marginTop: -10,
    marginBottom: 15,
    paddingHorizontal: 5,
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
  // 비밀번호 규칙 힌트 스타일
  passwordHint: {
    fontSize: 12,
    color: '#666',
    marginTop: -10,
    marginBottom: 10,
    paddingHorizontal: 5,
  },
});

export default ResetPasswordScreen;
