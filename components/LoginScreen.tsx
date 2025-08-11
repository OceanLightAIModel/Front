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
} from 'react-native';
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
  fadeAnimation: Animated.Value;
  onLogin: () => void;
  onNavigateToSignup: () => void;
  onNavigateToFindAccount: () => void;
  onNavigateToResetPassword: () => void;
  showCustomAlert: (title: string, message: string, buttons?: Array<{text: string; onPress?: () => void; style?: 'default' | 'cancel' | 'destructive'}>) => void;
}

const PALETTE = {
  bg: '#F6F8FA',
  card: '#FFFFFF',
  border: '#E6EAEE',
  text: '#1F2937',
  subtext: '#6B7280',
  primary: '#10A37F',
  primaryPressed: '#0B8063',
  danger: '#DC3545',
  inputBg: '#F3F6F8',
  link: '#0A84FF',
  placeholder: '#98A2AE',
  shadow: 'rgba(16, 163, 127, 0.08)',
};

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
  const [pwVisible, setPwVisible] = useState(false);
  const [focus, setFocus] = useState<{email:boolean; password:boolean}>({ email:false, password:false });

  // 하드웨어 뒤로가기 버튼 처리 (기존 동작 유지)
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

  const canSubmit = email.trim().length > 0 && password.trim().length > 0;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={PALETTE.bg} />
      <KeyboardAvoidingView style={styles.keyboardContainer} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.loginContainer}>
            {/* 상단 로고/타이틀 - 기존 fadeAnimation 유지 */}
            <Animated.View style={[styles.logoContainer, { opacity: fadeAnimation }]}>
              <Text style={styles.appTitle}>AI Pet Care</Text>
              <Text style={styles.appSubtitle}>AI 펫 헬스케어 솔루션</Text>
            </Animated.View>

            {/* 로그인 카드 */}
            <View style={styles.formContainer}>
              <View style={styles.loginBox}>
                <Text style={styles.loginTitle}>로그인</Text>

                <View style={styles.tempInfoContainer}>
                  <Text style={styles.tempInfoText}>임시 이메일: 1234@1234</Text>
                  <Text style={styles.tempInfoText}>임시 비밀번호: 1234</Text>
                </View>

                {/* 이메일 */}
                <View
                  style={[
                    styles.inputWrap,
                    { borderColor: focus.email ? PALETTE.primary : PALETTE.border, backgroundColor: PALETTE.inputBg },
                    loginEmailError ? { borderColor: PALETTE.danger } : null,
                  ]}
                >
                  <MaterialIcons name="mail-outline" size={20} color={loginEmailError ? PALETTE.danger : PALETTE.subtext} />
                  <TextInput
                    style={styles.input}
                    placeholder="이메일"
                    placeholderTextColor={PALETTE.placeholder}
                    value={email}
                    onFocus={() => setFocus((p)=>({ ...p, email:true }))}
                    onBlur={() => setFocus((p)=>({ ...p, email:false }))}
                    onChangeText={(text) => {
                      setEmail(text);
                      if (loginEmailError) setLoginEmailError('');
                    }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    returnKeyType="next"
                    blurOnSubmit={false}
                  />
                </View>
                {!!loginEmailError && <Text style={styles.errorText}>{loginEmailError}</Text>}

                {/* 비밀번호 */}
                <View
                  style={[
                    styles.inputWrap,
                    { borderColor: focus.password ? PALETTE.primary : PALETTE.border, backgroundColor: PALETTE.inputBg },
                    loginPasswordError ? { borderColor: PALETTE.danger } : null,
                  ]}
                >
                  <MaterialIcons name="lock-outline" size={20} color={loginPasswordError ? PALETTE.danger : PALETTE.subtext} />
                  <TextInput
                    style={styles.input}
                    placeholder="비밀번호"
                    placeholderTextColor={PALETTE.placeholder}
                    value={password}
                    onFocus={() => setFocus((p)=>({ ...p, password:true }))}
                    onBlur={() => setFocus((p)=>({ ...p, password:false }))}
                    onChangeText={(text) => {
                      setPassword(text);
                      if (loginPasswordError) setLoginPasswordError('');
                    }}
                    secureTextEntry={!pwVisible}
                    returnKeyType="done"
                  />
                  <TouchableOpacity onPress={() => setPwVisible(v=>!v)} style={styles.eyeButton} hitSlop={{top:10,bottom:10,left:10,right:10}}>
                    <MaterialIcons name={pwVisible ? 'visibility-off' : 'visibility'} size={20} color={PALETTE.subtext} />
                  </TouchableOpacity>
                </View>
                {!!loginPasswordError && <Text style={styles.errorText}>{loginPasswordError}</Text>}

                {/* 로그인 버튼 */}
                <TouchableOpacity
                  style={[styles.loginButton, { backgroundColor: canSubmit ? PALETTE.primary : '#D5DBE1' }]}
                  onPress={onLogin}
                  disabled={!canSubmit}
                  activeOpacity={0.9}
                >
                  <Text style={styles.loginButtonText}>로그인</Text>
                </TouchableOpacity>

                {/* 링크 모음 */}
                <View style={styles.linkContainer}>
                  <TouchableOpacity onPress={onNavigateToSignup}><Text style={styles.linkText}>회원가입</Text></TouchableOpacity>
                  <Text style={styles.linkDivider}>|</Text>
                  <TouchableOpacity onPress={onNavigateToFindAccount}><Text style={styles.linkText}>계정 찾기</Text></TouchableOpacity>
                  <Text style={styles.linkDivider}>|</Text>
                  <TouchableOpacity onPress={onNavigateToResetPassword}><Text style={styles.linkText}>비밀번호 찾기</Text></TouchableOpacity>
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
  container: { flex: 1, backgroundColor: PALETTE.bg },
  keyboardContainer: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  loginContainer: { flex: 1, paddingHorizontal: 24 },
  logoContainer: { flex: 0.5, justifyContent: 'center', alignItems: 'center', paddingTop: 10 },
  appTitle: { fontSize: 26, fontWeight: '800', color: PALETTE.primary, marginBottom: 6, textAlign: 'center' },
  appSubtitle: { fontSize: 14, color: PALETTE.subtext, textAlign: 'center' },

  formContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loginBox: {
    width: '100%',
    backgroundColor: PALETTE.card,
    borderRadius: 18,
    padding: 24,
    borderWidth: 1,
    borderColor: PALETTE.border,
    shadowColor: PALETTE.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 3,
  },
  bottomSpacer: { flex: 0.5 },

  loginTitle: { fontSize: 20, fontWeight: '800', color: PALETTE.text, textAlign: 'center', marginBottom: 12 },
  tempInfoContainer: { alignItems: 'center', marginBottom: 16 },
  tempInfoText: { fontSize: 12, color: PALETTE.subtext, marginBottom: 2 },

  inputWrap: {
    height: 50,
    borderWidth: 1.2,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: PALETTE.text,
    paddingVertical: Platform.OS === 'android' ? 8 : 6,
  },
  eyeButton: { width: 28, height: 28, justifyContent: 'center', alignItems: 'center' },

  errorText: { color: PALETTE.danger, fontSize: 12, marginTop: -6, marginBottom: 10, paddingHorizontal: 4 },

  loginButton: {
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 18,
  },
  loginButtonText: { color: '#fff', fontSize: 17, fontWeight: '800' },

  linkContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  linkText: { color: PALETTE.link, fontSize: 14, marginHorizontal: 6, fontWeight: '600' },
  linkDivider: { color: '#C7CDD3', marginHorizontal: 4 },
});

export default LoginScreen;
