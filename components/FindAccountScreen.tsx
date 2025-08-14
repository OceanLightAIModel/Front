import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  BackHandler,
  Animated,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

interface FindAccountScreenProps {
  findAccountPhone: string;
  setFindAccountPhone: (phone: string) => void;
  foundAccount: boolean;
  setFoundAccount: (found: boolean) => void;
  accountNotFound: boolean;
  setAccountNotFound: (notFound: boolean) => void;
  fadeAnimation: Animated.Value;
  formatPhoneNumber: (text: string) => string;
  onBackToLogin: () => void;
  onNavigateToResetPassword: () => void;
  showCustomAlert: (title: string, message: string, buttons?: Array<{text: string; onPress?: () => void}>) => void;
}

const FindAccountScreen: React.FC<FindAccountScreenProps> = ({
  findAccountPhone,
  setFindAccountPhone,
  foundAccount,
  setFoundAccount,
  accountNotFound,
  setAccountNotFound,
  fadeAnimation,
  formatPhoneNumber,
  onBackToLogin,
  onNavigateToResetPassword,
  showCustomAlert,
}) => {
  const [verificationCode, setVerificationCode] = useState('');
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [currentStep, setCurrentStep] = useState<'phone' | 'verification' | 'result'>('phone');
  const [foundEmail, setFoundEmail] = useState('');

  // 하드웨어 뒤로가기 버튼 처리
  useEffect(() => {
    const backAction = () => {
      if (currentStep === 'phone') {
        onBackToLogin();
      } else {
        setCurrentStep('phone');
        setIsCodeSent(false);
        setIsVerified(false);
        setVerificationCode('');
        setTimeLeft(0);
        setFoundEmail('');
        setFoundAccount(false);
        setAccountNotFound(false);
      }
      return true;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [currentStep, onBackToLogin]);

  // 타이머 관리
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timeLeft]);

  const handleSendVerificationCode = () => {
    if (!findAccountPhone.trim()) {
      showCustomAlert('입력 오류', '전화번호를 입력해 주세요.');
      return;
    }

    if (findAccountPhone.length < 13) {
      showCustomAlert('입력 오류', '올바른 전화번호를 입력해 주세요.');
      return;
    }

    setIsCodeSent(true);
    setTimeLeft(180); // 3분 = 180초
    setCurrentStep('verification');
    showCustomAlert('인증번호 전송', '인증번호가 전송되었습니다.');
  };

  const handleVerifyCode = () => {
    if (!verificationCode.trim()) {
      showCustomAlert('입력 오류', '인증번호를 입력해 주세요.');
      return;
    }

    if (verificationCode === '123456') {
      setIsVerified(true);
      setTimeLeft(0);
      setCurrentStep('result');
      
      // 전화번호에 따라 결과 설정
      if (findAccountPhone === '010-1234-1234') {
        setFoundAccount(true);
        setAccountNotFound(false);
        setFoundEmail('1234@1234.com');
      } else {
        setFoundAccount(false);
        setAccountNotFound(true);
      }
    } else {
      showCustomAlert('인증 실패', '인증번호가 올바르지 않습니다.');
    }
  };

  const handleFindAccount = () => {
    if (findAccountPhone) {
      if (findAccountPhone === '010-1234-1234') {
        setFoundAccount(true);
        setAccountNotFound(false);
        setFoundEmail('1234@1234.com');
        setCurrentStep('result');
      } else {
        setFoundAccount(false);
        setAccountNotFound(true);
        setCurrentStep('result');
      }
    } else {
      showCustomAlert('입력 오류', '전화번호를 입력해 주세요.');
    }
  };

  // 시간 포맷팅 (분:초)
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const resetToStart = () => {
    setCurrentStep('phone');
    setIsCodeSent(false);
    setIsVerified(false);
    setVerificationCode('');
    setTimeLeft(0);
    setFoundEmail('');
    setFoundAccount(false);
    setAccountNotFound(false);
    setFindAccountPhone('');
  };

  const renderPhoneStep = () => (
    <View style={styles.loginBox}>
      <TouchableOpacity 
        style={styles.closeButton}
        onPress={onBackToLogin}
      >
        <Text style={styles.closeButtonText}>✕</Text>
      </TouchableOpacity>

      <Text style={styles.loginTitle}>계정 찾기</Text>
      
      <View style={styles.tempInfoContainer}>
        <Text style={styles.tempInfoText}>임시 전화번호: 010-1234-1234</Text>
      </View>
      
      <View style={styles.phoneInputWrapper}>
        <TextInput
          style={styles.phoneInput}
          placeholder="전화번호"
          placeholderTextColor="#999"
          value={findAccountPhone}
          onChangeText={(text) => setFindAccountPhone(formatPhoneNumber(text))}
          keyboardType="number-pad"
          maxLength={13}
          blurOnSubmit={false}
          returnKeyType="done"
        />
        <TouchableOpacity 
          style={[
            styles.verificationButton,
            findAccountPhone.length >= 13 ? styles.verificationButtonActive : styles.verificationButtonInactive
          ]}
          onPress={handleSendVerificationCode}
          disabled={findAccountPhone.length < 13}
        >
          <Text style={[
            styles.verificationButtonText,
            findAccountPhone.length >= 13 ? styles.verificationButtonTextActive : styles.verificationButtonTextInactive
          ]}>
            인증요청
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.loginPromptContainer}>
        <Text style={styles.loginPrompt}>계정을 기억하셨다면</Text>
        <TouchableOpacity onPress={onBackToLogin}>
          <Text style={styles.loginLinkText}>로그인하기</Text>
        </TouchableOpacity>
        <Text style={styles.loginPrompt}> | </Text>
        <TouchableOpacity onPress={onNavigateToResetPassword}>
          <Text style={styles.loginLinkText}>비밀번호 찾기</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.signupButton} onPress={handleFindAccount}>
        <Text style={styles.signupButtonText}>계정 찾기</Text>
      </TouchableOpacity>
    </View>
  );

  const renderVerificationStep = () => (
    <View style={styles.loginBox}>
      <TouchableOpacity 
        style={styles.closeButton}
        onPress={() => setCurrentStep('phone')}
      >
        <Text style={styles.closeButtonText}>←</Text>
      </TouchableOpacity>

      <Text style={styles.loginTitle}>인증번호 입력</Text>
      
      <Text style={styles.subtitle}>
        {findAccountPhone}로{'\n'}
        인증번호를 전송했습니다.
      </Text>

      <View style={styles.tempInfoContainer}>
        <Text style={styles.tempInfoText}>임시 인증번호: 123456</Text>
      </View>

      <View style={styles.phoneInputWrapper}>
        <TextInput
          style={styles.phoneInput}
          placeholder="인증번호 6자리"
          placeholderTextColor="#999"
          value={verificationCode}
          onChangeText={setVerificationCode}
          keyboardType="number-pad"
          maxLength={6}
          blurOnSubmit={false}
          returnKeyType="done"
        />
        <TouchableOpacity 
          style={[
            styles.verifyButton,
            verificationCode.length >= 6 ? styles.verifyButtonActive : styles.verifyButtonInactive
          ]}
          onPress={handleVerifyCode}
          disabled={verificationCode.length < 6 || isVerified || timeLeft === 0}
        >
          <Text style={[
            styles.verifyButtonText,
            verificationCode.length >= 6 ? styles.verifyButtonTextActive : styles.verifyButtonTextInactive
          ]}>
            {isVerified ? '인증완료' : '인증하기'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 타이머 */}
      {timeLeft > 0 && !isVerified && (
        <Text style={styles.timerText}>
          남은 시간: {formatTime(timeLeft)}
        </Text>
      )}
      
      {timeLeft === 0 && !isVerified && (
        <Text style={styles.expiredText}>
          인증 시간이 만료되었습니다. 다시 요청해주세요.
        </Text>
      )}

      <TouchableOpacity style={styles.backButton} onPress={() => setCurrentStep('phone')}>
        <Text style={styles.backButtonText}>다시 입력하기</Text>
      </TouchableOpacity>
    </View>
  );

  const renderResultStep = () => (
    <View style={styles.loginBox}>
      <TouchableOpacity 
        style={styles.closeButton}
        onPress={onBackToLogin}
      >
        <Text style={styles.closeButtonText}>✕</Text>
      </TouchableOpacity>

      <Text style={styles.loginTitle}>계정 찾기 결과</Text>

      {foundAccount && (
        <View style={styles.foundAccountContainer}>
          <Text style={styles.foundAccountTitle}>✓ 계정을 찾았습니다!</Text>
          <Text style={styles.foundAccountEmail}>이메일: {foundEmail}</Text>
        </View>
      )}

      {accountNotFound && (
        <View style={styles.notFoundAccountContainer}>
          <Text style={styles.notFoundAccountTitle}>✗ 등록되지 않은 전화번호입니다</Text>
        </View>
      )}

      <View style={styles.resultButtonContainer}>
        <TouchableOpacity style={styles.signupButton} onPress={onBackToLogin}>
          <Text style={styles.signupButtonText}>로그인하기</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.secondaryButton} onPress={onNavigateToResetPassword}>
          <Text style={styles.secondaryButtonText}>비밀번호 찾기</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

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
            {/* 상단 로고 영역 */}
            <Animated.View style={[styles.logoContainer, { opacity: fadeAnimation }]}>
              <Text style={styles.appTitle}>AI Pet Care</Text>
              <Text style={styles.appSubtitle}>AI 펫 헬스케어 솔루션</Text>
            </Animated.View>

            {/* 중앙 폼 */}
            <View style={styles.formContainer}>
              {currentStep === 'phone' && renderPhoneStep()}
              {currentStep === 'verification' && renderVerificationStep()}
              {currentStep === 'result' && renderResultStep()}
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
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
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
  phoneInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    gap: 10,
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
    backgroundColor: '#0080ff',
  },
  verifyButtonInactive: {
    backgroundColor: '#e9ecef',
  },
  verifyButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  verifyButtonTextActive: {
    color: '#fff',
  },
  verifyButtonTextInactive: {
    color: '#999',
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
    marginBottom: 10,
  },
  signupButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  backButton: {
    height: 45,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    marginTop: 10,
  },
  backButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  timerText: {
    fontSize: 14,
    color: '#ff6b35',
    marginTop: 8,
    fontWeight: '600',
    textAlign: 'center',
  },
  expiredText: {
    fontSize: 14,
    color: '#dc3545',
    marginTop: 8,
    fontWeight: '500',
    textAlign: 'center',
  },
  foundAccountContainer: {
    backgroundColor: '#e8f5e8',
    borderRadius: 10,
    padding: 15,
    marginVertical: 15,
    borderWidth: 1,
    borderColor: '#28a745',
  },
  foundAccountTitle: {
    fontSize: 16,
    color: '#28a745',
    fontWeight: 'bold',
    marginBottom: 5,
    textAlign: 'center',
  },
  foundAccountEmail: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
    fontWeight: '600',
  },
  notFoundAccountContainer: {
    backgroundColor: '#ffe8e8',
    borderRadius: 10,
    padding: 15,
    marginVertical: 15,
    borderWidth: 1,
    borderColor: '#dc3545',
  },
  notFoundAccountTitle: {
    fontSize: 16,
    color: '#dc3545',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  resultButtonContainer: {
    marginTop: 20,
  },
  secondaryButton: {
    height: 45,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    marginTop: 10,
  },
  secondaryButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default FindAccountScreen;
