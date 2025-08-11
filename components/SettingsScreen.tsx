import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ScrollView,
  SafeAreaView,
  Alert,
  Image,
  BackHandler,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

const SettingsScreen = ({ navigation, chatTheme, setChatTheme, darkMode, setDarkMode }: any) => {
  const [privacy, setPrivacy] = useState({
    dataSharing: false,
    analytics: true,
  });

  const handleChatThemeChange = (value: boolean) => {
    setChatTheme(value);
  };

  const handleDarkModeChange = (value: boolean) => {
    setDarkMode(value);
  };

  // 하드웨어 뒤로가기 버튼 처리
  useEffect(() => {
    const backAction = () => {
      navigation?.goBack && navigation.goBack();
      return true; // 기본 뒤로가기 동작을 막음
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction,
    );

    return () => backHandler.remove();
  }, [navigation]);

  const handleNotificationChange = (key: string, value: boolean) => {
    // 알림 설정 제거로 인해 빈 함수
  };

  const handlePrivacyChange = (key: string, value: boolean) => {
    setPrivacy(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const settingSections = [
    {
      title: '내 정보',
      items: [
        {
          key: 'profile',
          title: '내 정보',
          subtitle: 'oceanlight@example.com',
          type: 'profile',
        },
      ],
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
          onChange: (value: boolean) => handlePrivacyChange('dataSharing', value),
        },
        {
          key: 'analytics',
          title: '사용 분석',
          subtitle: '앱 사용 패턴 분석 허용',
          type: 'switch',
          value: privacy.analytics,
          onChange: (value: boolean) => handlePrivacyChange('analytics', value),
        },
      ],
    },
    {
      title: '앱 정보',
      items: [
        {
          key: 'version',
          title: '앱 버전',
          subtitle: '1.0.0',
          type: 'info',
          icon: 'info',
        },
        {
          key: 'terms',
          title: '이용약관',
          subtitle: '서비스 이용약관 보기',
          type: 'navigation',
          icon: 'description',
          onPress: () => Alert.alert('이용약관', '이용약관 화면으로 이동합니다.'),
        },
        {
          key: 'privacy_policy',
          title: '개인정보처리방침',
          subtitle: '개인정보처리방침 보기',
          type: 'navigation',
          icon: 'privacy-tip',
          onPress: () => Alert.alert('개인정보처리방침', '개인정보처리방침 화면으로 이동합니다.'),
        },
        {
          key: 'contact',
          title: '고객센터',
          subtitle: '문의사항이 있으시면 연락주세요',
          type: 'navigation',
          icon: 'support-agent',
          onPress: () => Alert.alert('고객센터', '이메일: support@oceanpetcare.com\n전화: 1588-1234'),
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
          type: 'navigation',
          icon: 'delete-forever',
          color: '#ff6b6b',
          onPress: () => Alert.alert(
            '계정 삭제',
            '정말로 계정을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.',
            [
              { text: '취소', style: 'cancel' },
              { text: '삭제', style: 'destructive' },
            ]
          ),
        },
      ],
    },
  ];

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
              <Text style={[styles.profileSubtitle, darkMode && styles.profileSubtitleDark]}>{item.subtitle}</Text>
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
                <Text style={[styles.settingSubtitle, darkMode && styles.settingSubtitleDark]}>{item.subtitle}</Text>
              </View>
            </View>
            <Switch
              value={item.value}
              onValueChange={item.onChange}
              trackColor={{ false: '#e9ecef', true: '#10a37f' }}
              thumbColor={item.value ? '#fff' : '#ccc'}
            />
          </View>
        );

      case 'switch':
        return (
          <View key={item.key} style={[styles.settingItem, darkMode && styles.settingItemDark]}>
            <View style={styles.settingContent}>
              <Text style={[styles.settingTitle, darkMode && styles.settingTitleDark]}>{item.title}</Text>
              <Text style={[styles.settingSubtitle, darkMode && styles.settingSubtitleDark]}>{item.subtitle}</Text>
            </View>
            <Switch
              value={item.value}
              onValueChange={item.onChange}
              trackColor={{ false: '#e9ecef', true: '#10a37f' }}
              thumbColor={item.value ? '#fff' : '#ccc'}
            />
          </View>
        );
      
      case 'info':
        return (
          <View key={item.key} style={[styles.settingItem, darkMode && styles.settingItemDark]}>
            <View style={styles.settingLeft}>
              {item.icon && (
                <MaterialIcons name={item.icon} size={24} color={darkMode ? "#aaa" : "#666"} style={styles.settingIcon} />
              )}
              <View style={styles.settingContent}>
                <Text style={[styles.settingTitle, darkMode && styles.settingTitleDark]}>{item.title}</Text>
                <Text style={[styles.settingSubtitle, darkMode && styles.settingSubtitleDark]}>{item.subtitle}</Text>
              </View>
            </View>
          </View>
        );
      
      case 'navigation':
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
                  color={item.color || (darkMode ? "#aaa" : "#666")} 
                  style={styles.settingIcon} 
                />
              )}
              <View style={styles.settingContent}>
                <Text style={[
                  styles.settingTitle,
                  darkMode && styles.settingTitleDark,
                  item.color && { color: item.color }
                ]}>
                  {item.title}
                </Text>
                <Text style={[styles.settingSubtitle, darkMode && styles.settingSubtitleDark]}>{item.subtitle}</Text>
              </View>
            </View>
            <MaterialIcons name="chevron-right" size={20} color={darkMode ? "#555" : "#ccc"} />
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
        <TouchableOpacity onPress={() => navigation?.goBack()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={darkMode ? "#fff" : "#333"} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, darkMode && styles.headerTitleDark]}>설정</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.content}>
        {settingSections.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.section}>
            <Text style={[styles.sectionTitle, darkMode && styles.sectionTitleDark]}>{section.title}</Text>
            <View style={[styles.sectionContent, darkMode && styles.sectionContentDark]}>
              {section.items.map((item) => renderSettingItem(item))}
            </View>
          </View>
        ))}
        
        <View style={styles.footer}>
          <View style={styles.footerTextContainer}>
            <Text style={[styles.footerText, darkMode && styles.footerTextDark]}>
              Ocean Pet Care와 함께 반려동물의 건강을 지켜주세요 
            </Text>
            <MaterialIcons name="pets" size={16} color={darkMode ? "#aaa" : "#666"} style={{ marginLeft: 5 }} />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  containerDark: {
    backgroundColor: '#212121',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 15,
    paddingTop: 35, // 더 아래로 내림
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  headerDark: {
    backgroundColor: '#2f2f2f',
    borderBottomColor: '#444',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  headerTitleDark: {
    color: '#fff',
  },
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginVertical: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    marginLeft: 5,
  },
  sectionTitleDark: {
    color: '#fff',
  },
  sectionContent: {
    backgroundColor: '#fff',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionContentDark: {
    backgroundColor: '#2f2f2f',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f4',
  },
  settingItemDark: {
    borderBottomColor: '#444',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    marginRight: 12,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 3,
  },
  settingTitleDark: {
    color: '#fff',
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  settingSubtitleDark: {
    color: '#aaa',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  footerTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  footerTextDark: {
    color: '#aaa',
  },
  profileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f4',
  },
  profileItemDark: {
    borderBottomColor: '#444',
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  profileInfo: {
    flex: 1,
  },
  profileTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 3,
  },
  profileTitleDark: {
    color: '#fff',
  },
  profileSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  profileSubtitleDark: {
    color: '#aaa',
  },
  themeIcon: {
    width: 32,
    height: 32,
    marginRight: 12,
  },
});

export default SettingsScreen;
