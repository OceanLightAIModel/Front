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
  showCustomAlert: (title: string, message: string, buttons?: Array<{text: string; onPress?: () => void; style?: 'default' | 'cancel' | 'destructive'}>) => void;
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
  // 하드웨어 뒤로가기 버튼 처리
  useEffect(() => {
    const backAction = () => {
      showCustomAlert(
        '앱 종료',
        '정말로 앱을 종료하시겠습니까?',
        [
          { text: '취소', style: 'cancel', onPress: () => {} },
          { text: '종료', style: 'destructive', onPress: () => BackHandler.exitApp() }
        ]
      );
      return true;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [showCustomAlert]);

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
              <Text style={styles.appSubtitle}>AI 펫 케어 솔루션</Text>
            </Animated.View>

            {/* 중앙 로그인 폼 */}
            <View style={styles.formContainer}>
              <View style={styles.loginBox}>
                <Text style={styles.loginTitle}>로그인</Text>
                <View style={styles.tempInfoContainer}>
                  <Text style={styles.tempInfoText}>임시 이메일: 1234@1234.com</Text>
                  <Text style={styles.tempInfoText}>임시 비밀번호: Ocean1234!</Text>
                </View>
                
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

                <TouchableOpacity style={styles.loginButton} onPress={onLogin}>
                  <Text style={styles.loginButtonText}>로그인</Text>
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

            {/* 하단 여백 */}
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
  tempInfoContainer: { alignItems: 'center', marginBottom: 20 },
  tempInfoText: { fontSize: 12, color: '#666', marginBottom: 3 },
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
