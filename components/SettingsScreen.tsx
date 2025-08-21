import { getUserProfile, updateUserPrefs, deleteUserAccount } from './api';
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ScrollView,
  SafeAreaView,
  Image,
  BackHandler,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

interface SettingsScreenProps {
  navigation: { goBack: () => void; goToPrivacyPolicy?: () => void; goToLogin?: () => void };
  chatTheme: boolean;
  setChatTheme: (v: boolean) => void;
  darkMode: boolean;
  setDarkMode: (v: boolean) => void;
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({
  navigation,
  chatTheme,
  setChatTheme,
  darkMode,
  setDarkMode,
}) => {
  const [profileEmail, setProfileEmail] = useState<string>('');
  const [privacy, setPrivacy] = useState({ dataSharing: false, analytics: true });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [errorModal, setErrorModal] = useState<{ visible: boolean; title: string; message: string }>({
    visible: false,
    title: '',
    message: '',
  });

  // 초기 진입 시 백엔드에서 프로필 정보(이메일, 테마, 다크모드)를 가져옵니다.
  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await getUserProfile();
        const user = res.data?.user ?? res.data;
        setProfileEmail(user?.email ?? '');
        setChatTheme(user.chat_theme);
        setDarkMode(user.dark_mode);
      } catch (e) {
        console.error('프로필 불러오기 실패:', e);
      }
    }
    fetchUser();
  }, []);

  // 테마(고양이/강아지) 설정 변경 시 백엔드에 저장
  const handleChatThemeChange = async (value: boolean) => {
    setChatTheme(value);
    try {
      await updateUserPrefs({ chat_theme: value });
    } catch (e) {
      console.error('테마 업데이트 실패', e);
    }
  };

  // 다크모드 설정 변경 시 백엔드에 저장
  const handleDarkModeChange = async (value: boolean) => {
    setDarkMode(value);
    try {
      await updateUserPrefs({ dark_mode: value });
    } catch (e) {
      console.error('다크모드 업데이트 실패', e);
    }
  };

  // 하드웨어 뒤로가기 버튼 처리
  useEffect(() => {
    const backAction = () => {
      navigation?.goBack?.();
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => sub.remove();
  }, [navigation]);

  const handlePrivacyChange = (key: keyof typeof privacy, value: boolean) =>
    setPrivacy(prev => ({ ...prev, [key]: value }));

  // 설정 섹션 정의
  const settingSections = [
    {
      title: '내 정보',
      items: [{ key: 'profile', title: '내 정보', subtitle: profileEmail, type: 'profile' }],
    },
    {
      title: '앱 설정',
      items: [
        {
          key: 'chatTheme',
          title: '챗봇 테마 변경',
          subtitle: chatTheme ? '고양이 테마 사용 중' : '강아지 테마 사용 중',
          type: 'theme',
          value: chatTheme,
          onChange: handleChatThemeChange,
        },
        {
          key: 'darkMode',
          title: '다크모드',
          subtitle: darkMode ? '다크모드 사용 중' : '라이트모드 사용 중',
          type: 'switch',
          value: darkMode,
          onChange: handleDarkModeChange,
        },
      ],
    },
    {
      title: '개인정보 및 보안',
      items: [
        {
          key: 'dataSharing',
          title: '데이터 공유',
          subtitle: '서비스 개선을 위한 익명 데이터 공유',
          type: 'switch',
          value: privacy.dataSharing,
          onChange: (v: boolean) => handlePrivacyChange('dataSharing', v),
        },
        {
          key: 'analytics',
          title: '사용 분석',
          subtitle: '앱 사용 패턴 분석 허용',
          type: 'switch',
          value: privacy.analytics,
          onChange: (v: boolean) => handlePrivacyChange('analytics', v),
        },
      ],
    },
    {
      title: '앱 정보',
      items: [
        { key: 'version', title: '앱 버전', subtitle: '1.0.0', type: 'info', icon: 'info' },
        {
          key: 'terms',
          title: '이용약관',
          subtitle: '서비스 이용약관 보기',
          type: 'navigation',
          icon: 'description',
          onPress: () => {
            // 필요 시 약관 스크린 라우팅 연결
          },
        },
        {
          key: 'privacy_policy',
          title: '개인정보처리방침',
          subtitle: '개인정보처리방침 보기',
          type: 'navigation',
          icon: 'privacy-tip',
          onPress: () => navigation?.goToPrivacyPolicy?.(),
        },
      ],
    },
    {
      title: '계정',
      items: [
        {
          key: 'delete',
          title: '계정 삭제',
          subtitle: '계정과 모든 데이터를 삭제합니다',
          type: 'danger',
          icon: 'delete-forever',
          color: '#dc3545',
          onPress: () => setShowDeleteModal(true),
        },
      ],
    },
  ] as const;

  // 각 설정 항목 렌더링
  const renderSettingItem = (item: any) => {
    switch (item.type) {
      case 'profile':
        return (
          <View key={item.key} style={[styles.profileItem, darkMode && styles.profileItemDark]}>
            <Image
              source={darkMode ? require('../logo/user2.png') : require('../logo/user.png')}
              style={styles.profileImage}
            />
            <View style={styles.profileInfo}>
              <Text style={[styles.profileTitle, darkMode && styles.profileTitleDark]}>{item.title}</Text>
              <Text style={[styles.profileSubtitle, darkMode && styles.profileSubtitleDark]}>
                {item.subtitle}
              </Text>
            </View>
          </View>
        );

      case 'theme':
        return (
          <View key={item.key} style={[styles.settingItem, darkMode && styles.settingItemDark]}>
            <View style={styles.settingLeft}>
              <Image
                source={item.value ? require('../logo/cat.png') : require('../logo/dog.png')}
                style={styles.themeIcon}
              />
              <View style={styles.settingContent}>
                <Text style={[styles.settingTitle, darkMode && styles.settingTitleDark]}>{item.title}</Text>
                <Text style={[styles.settingSubtitle, darkMode && styles.settingSubtitleDark]}>
                  {item.subtitle}
                </Text>
              </View>
            </View>
            <Switch
              value={item.value}
              onValueChange={item.onChange}
              trackColor={{ false: '#e9ecef', true: '#0080ff' }}
              thumbColor={item.value ? '#fff' : '#ccc'}
            />
          </View>
        );

      case 'switch':
        return (
          <View key={item.key} style={[styles.settingItem, darkMode && styles.settingItemDark]}>
            <View style={styles.settingContent}>
              <Text style={[styles.settingTitle, darkMode && styles.settingTitleDark]}>{item.title}</Text>
              <Text style={[styles.settingSubtitle, darkMode && styles.settingSubtitleDark]}>
                {item.subtitle}
              </Text>
            </View>
            <Switch
              value={item.value}
              onValueChange={item.onChange}
              trackColor={{ false: '#e9ecef', true: '#0080ff' }}
              thumbColor={item.value ? '#fff' : '#ccc'}
            />
          </View>
        );

      case 'info':
        return (
          <View key={item.key} style={[styles.settingItem, darkMode && styles.settingItemDark]}>
            <View style={styles.settingLeft}>
              {item.icon && (
                <MaterialIcons
                  name={item.icon}
                  size={24}
                  color={darkMode ? '#aaa' : '#666'}
                  style={styles.settingIcon}
                />
              )}
              <View style={styles.settingContent}>
                <Text style={[styles.settingTitle, darkMode && styles.settingTitleDark]}>{item.title}</Text>
                <Text style={[styles.settingSubtitle, darkMode && styles.settingSubtitleDark]}>
                  {item.subtitle}
                </Text>
              </View>
            </View>
          </View>
        );

      case 'navigation':
      case 'danger':
        return (
          <TouchableOpacity
            key={item.key}
            style={[styles.settingItem, darkMode && styles.settingItemDark]}
            onPress={item.onPress}
          >
            <View style={styles.settingLeft}>
              {item.icon && (
                <MaterialIcons
                  name={item.icon}
                  size={24}
                  color={item.color || (darkMode ? '#aaa' : '#666')}
                  style={styles.settingIcon}
                />
              )}
              <View style={styles.settingContent}>
                <Text
                  style={[
                    styles.settingTitle,
                    darkMode && styles.settingTitleDark,
                    item.color && { color: item.color, fontWeight: '700' },
                  ]}
                >
                  {item.title}
                </Text>
                <Text style={[styles.settingSubtitle, darkMode && styles.settingSubtitleDark]}>
                  {item.subtitle}
                </Text>
              </View>
            </View>
            <MaterialIcons name="chevron-right" size={20} color={darkMode ? '#555' : '#ccc'} />
          </TouchableOpacity>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={[styles.container, darkMode && styles.containerDark]}>
      {/* 헤더 */}
      <View style={[styles.header, darkMode && styles.headerDark]}>
        <TouchableOpacity onPress={() => navigation?.goBack?.()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={darkMode ? '#fff' : '#333'} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, darkMode && styles.headerTitleDark]}>설정</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.content}>
        {settingSections.map((section, idx) => (
          <View key={idx} style={styles.section}>
            <Text style={[styles.sectionTitle, darkMode && styles.sectionTitleDark]}>{section.title}</Text>
            <View style={[styles.sectionContent, darkMode && styles.sectionContentDark]}>
              {section.items.map(item => renderSettingItem(item))}
            </View>
          </View>
        ))}

        <View style={styles.footer}>
          <View style={styles.footerTextContainer}>
            <Text style={[styles.footerText, darkMode && styles.footerTextDark]}>
              Ocean Pet Care와 함께 반려동물의 건강을 지켜주세요
            </Text>
            <MaterialIcons name="pets" size={16} color={darkMode ? '#aaa' : '#666'} style={{ marginLeft: 5 }} />
          </View>
        </View>
      </ScrollView>

      {/* 계정 삭제 모달 */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, darkMode && styles.modalCardDark]}>
            <MaterialIcons
              name="warning-amber"
              size={28}
              color="#dc3545"
              style={{ alignSelf: 'center', marginBottom: 6 }}
            />
            <Text style={[styles.modalTitle, darkMode && styles.modalTitleDark]}>계정 삭제</Text>
            <Text style={[styles.modalMessage, darkMode && styles.modalMessageDark]}>
              정말로 계정을 삭제하시겠습니까?{'\n'}이 작업은 되돌릴 수 없습니다.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalCancelBtn, darkMode && styles.modalCancelBtnDark]}
                onPress={() => setShowDeleteModal(false)}
              >
                <Text style={[styles.modalCancelText, darkMode && styles.modalCancelTextDark]}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalDeleteBtn]}
                onPress={async () => {
                  try {
                    await deleteUserAccount();
                    await AsyncStorage.removeItem('accessToken');
                    await AsyncStorage.removeItem('refreshToken');
                    setShowDeleteModal(false);
                    // 계정 삭제 후 로그인 화면이나 초기 화면으로 이동
                    if (navigation?.goToLogin) {
                      navigation.goToLogin();
                    } else {
                      navigation.goBack();
                    }
                  } catch (e) {
                    // 오류 발생 시 커스텀 알림 표시
                    setShowDeleteModal(false);
                    setErrorModal({
                      visible: true,
                      title: '오류',
                      message: '계정을 삭제할 수 없습니다.',
                    });
                  }
                }}
              >
                <Text style={styles.modalDeleteText}>삭제</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 커스텀 오류 알림 모달 */}
      <Modal
        visible={errorModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setErrorModal({ ...errorModal, visible: false })}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, darkMode && styles.modalCardDark]}>
            <MaterialIcons
              name="error-outline"
              size={28}
              color="#dc3545"
              style={{ alignSelf: 'center', marginBottom: 6 }}
            />
            <Text style={[styles.modalTitle, darkMode && styles.modalTitleDark]}>{errorModal.title}</Text>
            <Text style={[styles.modalMessage, darkMode && styles.modalMessageDark]}>{errorModal.message}</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalDeleteBtn]}
                onPress={() => setErrorModal({ ...errorModal, visible: false })}
              >
                <Text style={styles.modalDeleteText}>확인</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  // containers
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  containerDark: { backgroundColor: '#212121' },

  // header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 15,
    paddingTop: 35,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  headerDark: { backgroundColor: '#2f2f2f', borderBottomColor: '#444' },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  headerTitleDark: { color: '#fff' },
  headerRight: { width: 40 },

  // content
  content: { flex: 1, paddingHorizontal: 20 },
  section: { marginVertical: 10 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 10, marginLeft: 5 },
  sectionTitleDark: { color: '#fff' },
  sectionContent: {
    backgroundColor: '#fff',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionContentDark: { backgroundColor: '#2f2f2f' },

  // rows
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f4',
  },
  settingItemDark: { borderBottomColor: '#444' },
  settingLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  settingIcon: { marginRight: 12 },
  settingContent: { flex: 1 },
  settingTitle: { fontSize: 16, fontWeight: '500', color: '#333', marginBottom: 3 },
  settingTitleDark: { color: '#fff' },
  settingSubtitle: { fontSize: 14, color: '#666' },
  settingSubtitleDark: { color: '#aaa' },

  // footer
  footer: { alignItems: 'center', paddingVertical: 30, paddingHorizontal: 20 },
  footerTextContainer: { flexDirection: 'row', alignItems: 'center' },
  footerText: { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 20 },
  footerTextDark: { color: '#aaa' },

  // profile row
  profileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f4',
  },
  profileItemDark: { borderBottomColor: '#444' },
  profileImage: { width: 50, height: 50, borderRadius: 25, marginRight: 15 },
  profileInfo: { flex: 1 },
  profileTitle: { fontSize: 16, fontWeight: '500', color: '#333', marginBottom: 3 },
  profileTitleDark: { color: '#fff' },
  profileSubtitle: { fontSize: 14, color: '#666' },
  profileSubtitleDark: { color: '#aaa' },
  themeIcon: { width: 32, height: 32, marginRight: 12 },

  // delete modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 15,
  },
  modalCardDark: { backgroundColor: '#2f2f2f' },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalTitleDark: { color: '#fff' },
  modalMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 18,
  },
  modalMessageDark: { color: '#bbb' },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between' },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  modalCancelBtn: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ddd',
    marginRight: 6,
  },
  modalCancelBtnDark: { backgroundColor: '#3a3a3a', borderColor: '#555' },
  modalDeleteBtn: { backgroundColor: '#dc3545', marginLeft: 6 },
  modalCancelText: { color: '#666', fontSize: 16, fontWeight: '600', textAlign: 'center' },
  modalCancelTextDark: { color: '#ddd' },
  modalDeleteText: { color: '#fff', fontSize: 16, fontWeight: '600', textAlign: 'center' },
});

export default SettingsScreen;
