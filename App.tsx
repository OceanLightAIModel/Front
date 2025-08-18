// App.tsx
import React, { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_BASE_URL } from './components/api';
import {
  View,
  StatusBar,
  Animated,
  BackHandler,
  Modal,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// 컴포넌트 imports
import PrivacyPolicyScreen from './components/PrivacyPolicyScreen';
import SplashScreen from './components/SplashScreen';
import LoginScreen from './components/LoginScreen';
import SignupScreen from './components/SignupScreen';
import FindAccountScreen from './components/FindAccountScreen';
import ResetPasswordScreen from './components/ResetPasswordScreen';
import ChatBotScreen from './components/ChatBotScreen';
import SettingsScreen from './components/SettingsScreen';
import CustomAlert from './components/CustomAlert';
import PhotoGalleryScreen from './components/PhotoGalleryScreen';

// 앱 전역 상태 관리용 Context
interface AppContextType {
  showCustomAlert: (
    title: string,
    message: string,
    buttons?: Array<{ text: string; onPress?: () => void; style?: 'default' | 'cancel' | 'destructive' }>
  ) => void;
  navigateToScreen: (screen: string) => void;
  goBackToLogin: () => void;
}
const AppContext = React.createContext<AppContextType | null>(null);
export const useAppContext = () => {
  const context = React.useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within AppProvider');
  return context;
};

const App = () => {
  // refresh 토큰을 이용한 자동 로그인 상태
  const [isLoading, setLoading] = useState(true);    // 초기 로딩 여부
  const [isLoggedIn, setLoggedIn] = useState(false); // 로그인 여부

  // 전역 상태
  const [currentScreen, setCurrentScreen] = React.useState('splash');
  const [showExitModal, setShowExitModal] = React.useState(false);
  const [chatTheme, setChatTheme] = React.useState(false);
  const [darkMode, setDarkMode] = React.useState(false);

  // 애니메이션
  const fadeAnimation = React.useRef(new Animated.Value(1)).current;
  const [isAnimating, setIsAnimating] = React.useState(false);

  // 로그인 관련 상태
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loginEmailError, setLoginEmailError] = React.useState('');
  const [loginPasswordError, setLoginPasswordError] = React.useState('');

  // 회원가입 관련 상태
  const [signupName, setSignupName] = React.useState('');
  const [signupEmail, setSignupEmail] = React.useState('');
  const [signupPassword, setSignupPassword] = React.useState('');
  const [signupPasswordConfirm, setSignupPasswordConfirm] = React.useState('');
  const [signupPhone, setSignupPhone] = React.useState('');
  const [verificationCode, setVerificationCode] = React.useState('');
  const [isCodeSent, setIsCodeSent] = React.useState(false);
  const [verificationTimer, setVerificationTimer] = React.useState(0);
  const [timerActive, setTimerActive] = React.useState(false);

  // 계정 찾기 관련 상태
  const [findAccountPhone, setFindAccountPhone] = React.useState('');
  const [foundAccount, setFoundAccount] = React.useState(false);
  const [accountNotFound, setAccountNotFound] = React.useState(false);

  // 비밀번호 찾기 관련 상태
  const [resetEmail, setResetEmail] = React.useState('');
  const [resetVerificationCode, setResetVerificationCode] = React.useState('');
  const [isResetCodeSent, setIsResetCodeSent] = React.useState(false);
  const [resetVerificationTimer, setResetVerificationTimer] = React.useState(0);
  const [resetTimerActive, setResetTimerActive] = React.useState(false);
  const [showPasswordReset, setShowPasswordReset] = React.useState(false);
  const [newPassword, setNewPassword] = React.useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = React.useState('');
  const [resetEmailError, setResetEmailError] = React.useState('');

  // 전역 Custom Alert
  const [customAlert, setCustomAlert] = React.useState({
    visible: false,
    title: '',
    message: '',
    buttons: [{ text: '확인' }] as Array<{ text: string; onPress?: () => void; style?: 'default' | 'cancel' | 'destructive' }>,
  });

  // 이메일/비밀번호 등 검증 함수
  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const validatePassword = (password: string) => /[!@#$%^&*(),.?":{}|<>]/.test(password);
  const validateName = (name: string) => !/[!@#$%^&*(),.?":{}|<>]/.test(name);

  const formatPhoneNumber = (phoneNumber: string) => {
    const cleaned = phoneNumber.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{3})(\d{4})(\d{3})$/);
    if (match) return `${match[1]}-${match[2]}-${match[3]}`;
    return phoneNumber;
  };

  // 전역 Alert 표시 함수
  const showCustomAlert = (
    title: string,
    message: string,
    buttons: Array<{ text: string; onPress?: () => void; style?: 'default' | 'cancel' | 'destructive' }> = [{ text: '확인' }]
  ) => setCustomAlert({ visible: true, title, message, buttons });

  // 화면 전환(페이드)
  const navigateToScreen = (screen: string) => {
    if (isAnimating) return;
    setIsAnimating(true);
    Animated.timing(fadeAnimation, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
      setCurrentScreen(screen);
      Animated.timing(fadeAnimation, { toValue: 1, duration: 200, useNativeDriver: true }).start(() => {
        setIsAnimating(false);
      });
    });
  };

  // 로그인으로 돌아가기(상태 초기화)
  const goBackToLogin = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    Animated.timing(fadeAnimation, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
      setCurrentScreen('login');
      // 상태 초기화
      setLoginEmailError('');
      setLoginPasswordError('');
      setSignupName('');
      setSignupEmail('');
      setSignupPassword('');
      setSignupPasswordConfirm('');
      setSignupPhone('');
      setVerificationCode('');
      setIsCodeSent(false);
      setVerificationTimer(0);
      setTimerActive(false);
      setFindAccountPhone('');
      setFoundAccount(false);
      setAccountNotFound(false);
      setResetEmail('');
      setResetVerificationCode('');
      setIsResetCodeSent(false);
      setResetVerificationTimer(0);
      setResetTimerActive(false);
      setShowPasswordReset(false);
      setNewPassword('');
      setNewPasswordConfirm('');
      setResetEmailError('');
      Animated.timing(fadeAnimation, { toValue: 1, duration: 200, useNativeDriver: true }).start(() => {
        setIsAnimating(false);
      });
    });
  };

  // 스플래시 완료
  const handleSplashFinish = () => navigateToScreen('login');

  // 인증 타이머
  React.useEffect(() => {
    let t: NodeJS.Timeout | undefined;
    if (timerActive && verificationTimer > 0) {
      t = setInterval(() => setVerificationTimer(prev => prev - 1), 1000);
    } else if (verificationTimer === 0) {
      setTimerActive(false);
    }
    return () => t && clearInterval(t);
  }, [timerActive, verificationTimer]);

  React.useEffect(() => {
    let t: NodeJS.Timeout | undefined;
    if (resetTimerActive && resetVerificationTimer > 0) {
      t = setInterval(() => setResetVerificationTimer(prev => prev - 1), 1000);
    } else if (resetVerificationTimer === 0) {
      setResetTimerActive(false);
    }
    return () => t && clearInterval(t);
  }, [resetTimerActive, resetVerificationTimer]);

  // 회원가입 처리 함수
  const handleSignup = () => {
    if (!signupName || !signupEmail || !signupPassword || !signupPasswordConfirm) {
      showCustomAlert('입력 오류', '모든 필드를 입력해 주세요.');
      return;
    }
    if (!validateName(signupName)) {
      showCustomAlert('입력 오류', '이름에는 특수문자를 사용할 수 없습니다.');
      return;
    }
    if (!validateEmail(signupEmail)) {
      showCustomAlert('입력 오류', '올바른 이메일 형식을 입력해 주세요.');
      return;
    }
    if (!validatePassword(signupPassword)) {
      showCustomAlert('입력 오류', '비밀번호에는 특수문자가 하나 이상 포함되어야 합니다.');
      return;
    }
    if (signupPassword !== signupPasswordConfirm) {
      showCustomAlert('비밀번호 오류', '비밀번호가 일치하지 않습니다.');
      return;
    }
    if (signupPassword.length < 8) {
      showCustomAlert('비밀번호 오류', '비밀번호는 최소 8자 이상이어야 합니다.');
      return;
    }
    if (!signupPhone) {
      showCustomAlert('입력 오류', '전화번호를 입력해 주세요.');
      return;
    }
    if (!isCodeSent) {
      showCustomAlert('인증 오류', '인증번호를 먼저 요청해 주세요.');
      return;
    }
    if (!verificationCode) {
      showCustomAlert('입력 오류', '인증번호를 입력해 주세요.');
      return;
    }
    if (verificationCode !== '123456') {
      showCustomAlert('인증 실패', '인증번호가 올바르지 않습니다.');
      return;
    }
    showCustomAlert('회원가입 완료', '회원가입이 성공적으로 완료되었습니다.', [
      { text: '확인', onPress: () => goBackToLogin() },
    ]);
  };

  // Context 값
  const contextValue: AppContextType = { showCustomAlert, navigateToScreen, goBackToLogin };

  // 현재 화면 렌더링 함수
  const renderCurrentScreen = () => {
    const animatedStyle = { opacity: fadeAnimation };
    switch (currentScreen) {
      case 'splash':
        return <SplashScreen onFinish={handleSplashFinish} />;

      case 'login':
        return (
          <LoginScreen
            email={email}
            setEmail={setEmail}
            password={password}
            setPassword={setPassword}
            loginEmailError={loginEmailError}
            setLoginEmailError={setLoginEmailError}
            loginPasswordError={loginPasswordError}
            setLoginPasswordError={setLoginPasswordError}
            fadeAnimation={fadeAnimation}
            // 로그인 성공 시: 로그인 상태를 true로 설정하고 챗 화면으로 이동
            onLogin={() => {
              setLoggedIn(true);
              navigateToScreen('chat');
            }}
            onNavigateToSignup={() => navigateToScreen('signup')}
            onNavigateToFindAccount={() => navigateToScreen('findAccount')}
            onNavigateToResetPassword={() => navigateToScreen('resetPassword')}
            showCustomAlert={showCustomAlert}
          />
        );

      case 'signup':
        return (
          <Animated.View style={[{ flex: 1 }, animatedStyle]}>
            <SignupScreen
              signupName={signupName}
              setSignupName={setSignupName}
              signupEmail={signupEmail}
              setSignupEmail={setSignupEmail}
              signupPassword={signupPassword}
              setSignupPassword={setSignupPassword}
              signupPasswordConfirm={signupPasswordConfirm}
              setSignupPasswordConfirm={setSignupPasswordConfirm}
              signupPhone={signupPhone}
              setSignupPhone={setSignupPhone}
              verificationCode={verificationCode}
              setVerificationCode={setVerificationCode}
              isCodeSent={isCodeSent}
              setIsCodeSent={setIsCodeSent}
              verificationTimer={verificationTimer}
              setVerificationTimer={setVerificationTimer}
              timerActive={timerActive}
              setTimerActive={setTimerActive}
              formatPhoneNumber={formatPhoneNumber}
              onSignup={handleSignup}
              onBackToLogin={goBackToLogin}
            />
          </Animated.View>
        );

      case 'findAccount':
        return (
          <Animated.View style={[{ flex: 1 }, animatedStyle]}>
            <FindAccountScreen
              findAccountPhone={findAccountPhone}
              setFindAccountPhone={setFindAccountPhone}
              foundAccount={foundAccount}
              setFoundAccount={setFoundAccount}
              accountNotFound={accountNotFound}
              setAccountNotFound={setAccountNotFound}
              fadeAnimation={fadeAnimation}
              formatPhoneNumber={formatPhoneNumber}
              onBackToLogin={goBackToLogin}
              onNavigateToResetPassword={() => navigateToScreen('resetPassword')}
              showCustomAlert={showCustomAlert}
            />
          </Animated.View>
        );

      case 'resetPassword':
        return (
          <Animated.View style={[{ flex: 1 }, animatedStyle]}>
            <ResetPasswordScreen
              resetEmail={resetEmail}
              setResetEmail={setResetEmail}
              resetVerificationCode={resetVerificationCode}
              setResetVerificationCode={setResetVerificationCode}
              isResetCodeSent={isResetCodeSent}
              setIsResetCodeSent={setIsResetCodeSent}
              resetVerificationTimer={resetVerificationTimer}
              setResetVerificationTimer={setResetVerificationTimer}
              resetTimerActive={resetTimerActive}
              setResetTimerActive={setResetTimerActive}
              showPasswordReset={showPasswordReset}
              setShowPasswordReset={setShowPasswordReset}
              newPassword={newPassword}
              setNewPassword={setNewPassword}
              newPasswordConfirm={newPasswordConfirm}
              setNewPasswordConfirm={setNewPasswordConfirm}
              resetEmailError={resetEmailError}
              setResetEmailError={setResetEmailError}
              fadeAnimation={fadeAnimation}
              validateEmail={validateEmail}
              validatePassword={validatePassword}
              onBackToLogin={goBackToLogin}
              onNavigateToFindAccount={() => navigateToScreen('findAccount')}
              showCustomAlert={showCustomAlert}
            />
          </Animated.View>
        );

      case 'settings':
        return (
          <SettingsScreen
            navigation={{
              goBack: () => navigateToScreen('chat'),
              goToPrivacyPolicy: () => navigateToScreen('privacyPolicy'),
            }}
            chatTheme={chatTheme}
            setChatTheme={setChatTheme}
            darkMode={darkMode}
            setDarkMode={setDarkMode}
          />
        );

      case 'privacyPolicy':
        return (
          <Animated.View style={[{ flex: 1 }, animatedStyle]}>
            <PrivacyPolicyScreen
              navigation={{ goBack: () => navigateToScreen('settings') }}
              darkMode={darkMode}
            />
          </Animated.View>
        );

      case 'photoGallery':
        return (
          <Animated.View style={[{ flex: 1 }, animatedStyle]}>
            <PhotoGalleryScreen navigation={{ goBack: () => navigateToScreen('chat') }} />
          </Animated.View>
        );

      default: // chat
        return (
          <View style={styles.container}>
            <ChatBotScreen
              navigation={{
                goBack: () => setShowExitModal(true),
                goToSettings: () => navigateToScreen('settings'),
                goToPhotoGallery: () => navigateToScreen('photoGallery'),
                goToLogin: () => navigateToScreen('login'),
              }}
              chatTheme={chatTheme}
              darkMode={darkMode}
            />

            {/* 앱 종료 확인 모달 */}
            <Modal visible={showExitModal} transparent animationType="fade">
              <View style={styles.modalOverlay}>
                <View style={styles.exitModal}>
                  <Text style={styles.exitModalTitle}>앱 종료</Text>
                  <Text style={styles.exitModalMessage}>정말로 앱을 종료하시겠습니까?</Text>
                  <View style={styles.exitModalButtons}>
                    <TouchableOpacity style={styles.exitCancelButton} onPress={() => setShowExitModal(false)}>
                      <Text style={styles.exitCancelText}>취소</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.exitConfirmButton}
                      onPress={() => {
                        setShowExitModal(false);
                        BackHandler.exitApp();
                      }}
                    >
                      <Text style={styles.exitConfirmText}>종료</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Modal>
          </View>
        );
    }
  };

  // -------- refresh 토큰으로 자동 로그인 처리 --------
  useEffect(() => {
    const bootstrap = async () => {
      const refreshToken = await AsyncStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          // refresh 토큰으로 새 access 토큰을 받습니다.
          const res = await axios.post(`${API_BASE_URL}/token/refresh/`, { refresh: refreshToken });
          await AsyncStorage.setItem('accessToken', res.data.access);
          setLoggedIn(true);
          // 로그인 상태면 초기 화면을 'chat'으로 설정
          setCurrentScreen('chat');
        } catch (err) {
          // refresh 토큰이 만료되거나 오류가 있으면 로그인 상태를 false로
          await AsyncStorage.removeItem('accessToken');
          await AsyncStorage.removeItem('refreshToken');
          setLoggedIn(false);
          setCurrentScreen('login');
        }
      }
      setLoading(false);
    };

    bootstrap();
  }, []);

  // 초기 로딩 중일 때 스플래시 화면 등을 표시
  if (isLoading) {
    return <SplashScreen onFinish={() => {}} />;
  }

  // 앱 렌더링
  return (
    <SafeAreaProvider>
      <AppContext.Provider value={contextValue}>
        <View style={styles.container}>
          <StatusBar barStyle="light-content" backgroundColor="#0080ff" />
          {isLoggedIn ? (
            renderCurrentScreen()
          ) : (
            <LoginScreen
              email={email}
              setEmail={setEmail}
              password={password}
              setPassword={setPassword}
              loginEmailError={loginEmailError}
              setLoginEmailError={setLoginEmailError}
              loginPasswordError={loginPasswordError}
              setLoginPasswordError={setLoginPasswordError}
              fadeAnimation={fadeAnimation}
              onLogin={() => {
                // 로그인 성공 시
                setLoggedIn(true);
                navigateToScreen('chat');
              }}
              onNavigateToSignup={() => navigateToScreen('signup')}
              onNavigateToFindAccount={() => navigateToScreen('findAccount')}
              onNavigateToResetPassword={() => navigateToScreen('resetPassword')}
              showCustomAlert={showCustomAlert}
            />
          )}

          {/* 전역 Custom Alert */}
          <CustomAlert
            visible={customAlert.visible}
            title={customAlert.title}
            message={customAlert.message}
            buttons={customAlert.buttons}
            onClose={() => setCustomAlert({ ...customAlert, visible: false })}
          />
        </View>
      </AppContext.Provider>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  exitModal: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 25,
    width: '80%',
    maxWidth: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 15,
  },
  exitModalTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', textAlign: 'center', marginBottom: 10 },
  exitModalMessage: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 25, lineHeight: 20 },
  exitModalButtons: { flexDirection: 'row', justifyContent: 'space-between' },
  exitCancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    marginRight: 5,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  exitConfirmButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#dc3545',
    borderRadius: 10,
    marginLeft: 5,
  },
  exitCancelText: { color: '#666', fontSize: 16, fontWeight: '600', textAlign: 'center' },
  exitConfirmText: { color: '#fff', fontSize: 16, fontWeight: '600', textAlign: 'center' },
});

export default App;
