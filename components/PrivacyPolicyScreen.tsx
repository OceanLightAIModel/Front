import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  BackHandler,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

interface PrivacyPolicyScreenProps {
  navigation: { goBack: () => void };
  darkMode?: boolean;
}

const PrivacyPolicyScreen: React.FC<PrivacyPolicyScreenProps> = ({ navigation, darkMode = false }) => {
  // 하드웨어 뒤로가기
  useEffect(() => {
    const backAction = () => {
      navigation?.goBack?.();
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => sub.remove();
  }, [navigation]);

  return (
    <SafeAreaView style={[styles.container, darkMode && styles.containerDark]}>
      {/* 헤더 */}
      <View style={[styles.header, darkMode && styles.headerDark]}>
        <TouchableOpacity onPress={() => navigation?.goBack?.()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={darkMode ? '#fff' : '#333'} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, darkMode && styles.headerTitleDark]}>개인정보처리방침</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 40 }}>
        <Text style={[styles.updatedAt, darkMode && styles.updatedAtDark]}>
          최종 업데이트: 2025-08-14
        </Text>

        {/* 1. 수집 항목 */}
        <Section
          title="1. 수집하는 개인정보 항목"
          body={[
            '회원가입 및 서비스 이용을 위해 다음 정보를 수집합니다:',
            '• 이름, 이메일, 비밀번호',
            '• 전화번호',
            '• 인증/복구를 위한 이메일 또는 문자 인증코드',
          ]}
          darkMode={darkMode}
        />

        {/* 2. 이용 목적 */}
        <Section
          title="2. 개인정보의 이용 목적"
          body={[
            '• 회원가입 및 본인 확인',
            '• 아이디/비밀번호 찾기(이메일 또는 전화번호로 인증코드 발송 포함)',
            '• 고객 문의 대응 및 서비스 제공·개선',
            '• 보안, 부정이용 방지 및 기록 보관',
          ]}
          darkMode={darkMode}
        />

        {/* 3. 보관 기간 */}
        <Section
          title="3. 보관 및 파기"
          body={[
            '• 회원 탈퇴 시 지체 없이 파기합니다.',
            '• 관련 법령에 따라 일정 기간 보관이 필요한 정보는 해당 기간 동안 별도 저장 후 파기합니다.',
          ]}
          darkMode={darkMode}
        />

        {/* 4. 제3자 제공/처리위탁 */}
        <Section
          title="4. 제3자 제공 및 처리위탁"
          body={[
            '• 법령에 의한 경우를 제외하고 사전 동의 없이 제3자에게 제공하지 않습니다.',
            '• 인증메일/문자 발송, 데이터 보관 등 서비스 운영을 위해 필요한 경우에 한해 처리위탁할 수 있습니다. 이 경우 수탁사 명칭과 업무 범위를 고지합니다.',
          ]}
          darkMode={darkMode}
        />

        {/* 5. 이용자 권리 */}
        <Section
          title="5. 이용자의 권리"
          body={[
            '• 개인정보 열람·정정·삭제·처리를 제한할 권리가 있습니다.',
            '• 동의 철회 및 회원 탈퇴를 요청할 수 있습니다.',
            '• 요청 시 법령에서 정하는 바에 따라 신속하게 조치합니다.',
          ]}
          darkMode={darkMode}
        />

        {/* 6. 안전성 확보 조치 */}
        <Section
          title="6. 안전성 확보 조치"
          body={[
            '• 비밀번호는 안전한 방식으로 저장되며, 전송 구간은 암호화(HTTPS)합니다.',
            '• 접근 통제, 권한 관리, 로그 모니터링 등 보호 조치를 이행합니다.',
          ]}
          darkMode={darkMode}
        />

        {/* 7. 문의처 */}
        <Section
          title="7. 문의처"
          body={[
            '• 이메일: support@oceanpetcare.com',
            '• 문의 시 본인확인을 위해 추가 정보를 요청할 수 있습니다.',
          ]}
          darkMode={darkMode}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

const Section = ({
  title,
  body,
  darkMode,
}: {
  title: string;
  body: string[];
  darkMode: boolean;
}) => (
  <View style={[styles.card, darkMode && styles.cardDark]}>
    <Text style={[styles.cardTitle, darkMode && styles.cardTitleDark]}>{title}</Text>
    {body.map((line, idx) => (
      <Text key={idx} style={[styles.cardBody, darkMode && styles.cardBodyDark]}>
        {line}
      </Text>
    ))}
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  containerDark: { backgroundColor: '#212121' },

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

  content: { flex: 1, paddingHorizontal: 20, paddingTop: 10 },

  updatedAt: { fontSize: 12, color: '#666', textAlign: 'right', marginBottom: 10 },
  updatedAtDark: { color: '#aaa' },

  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  cardDark: { backgroundColor: '#2f2f2f', borderColor: '#444' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 8 },
  cardTitleDark: { color: '#fff' },
  cardBody: { fontSize: 14, color: '#555', lineHeight: 20, marginBottom: 4 },
  cardBodyDark: { color: '#ccc' },
});

export default PrivacyPolicyScreen;
