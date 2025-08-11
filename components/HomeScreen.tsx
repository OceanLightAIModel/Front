import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  SafeAreaView,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

const HomeScreen = ({ navigation }: any) => {
  const quickActions = [
    { id: 1, title: 'AI 진단', icon: 'medical-services', color: '#ff6b6b' },
    { id: 2, title: '건강 체크', icon: 'favorite', color: '#4ecdc4' },
    { id: 3, title: '병원 찾기', icon: 'local-hospital', color: '#45b7d1' },
    { id: 4, title: '약물 관리', icon: 'medication', color: '#96ceb4' },
  ];

  const recentActivities = [
    { id: 1, title: '말티즈 코코 건강 체크', time: '2시간 전', status: '완료' },
    { id: 2, title: '골든리트리버 맥스 진료 예약', time: '5시간 전', status: '예약됨' },
    { id: 3, title: 'AI 상담 - 피부 트러블', time: '1일 전', status: '완료' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content}>
        {/* 웰컴 섹션 */}
        <View style={styles.welcomeSection}>
          <View style={styles.welcomeTextContainer}>
            <Text style={styles.welcomeText}>안녕하세요! </Text>
            <MaterialIcons name="emoji-emotions" size={24} color="#FFA500" />
          </View>
          <Text style={styles.welcomeSubtext}>오늘도 반려동물과 함께 건강한 하루 보내세요</Text>
        </View>

        {/* 펫 프로필 카드 */}
        <View style={styles.petCard}>
          <View style={styles.petInfo}>
            <Image
              source={require('../logo/사용자 아이콘.png')}
              style={styles.petImage}
            />
            <View style={styles.petDetails}>
              <Text style={styles.petName}>코코</Text>
              <Text style={styles.petBreed}>말티즈 • 3살</Text>
              <Text style={styles.petStatus}>건강 상태: 양호</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.addPetButton}>
            <MaterialIcons name="add" size={24} color="#0080ff" />
          </TouchableOpacity>
        </View>

        {/* 빠른 액션 */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>빠른 서비스</Text>
          <View style={styles.quickActionsGrid}>
            {quickActions.map((action) => (
              <TouchableOpacity
                key={action.id}
                style={[styles.actionCard, { backgroundColor: action.color }]}
                onPress={() => {
                  if (action.title === 'AI 진단') {
                    navigation.navigate('ChatBot');
                  }
                }}
              >
                <MaterialIcons name={action.icon} size={32} color="#fff" />
                <Text style={styles.actionTitle}>{action.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 최근 활동 */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>최근 활동</Text>
          {recentActivities.map((activity) => (
            <View key={activity.id} style={styles.activityCard}>
              <View style={styles.activityInfo}>
                <Text style={styles.activityTitle}>{activity.title}</Text>
                <Text style={styles.activityTime}>{activity.time}</Text>
              </View>
              <View style={[
                styles.statusBadge,
                activity.status === '완료' ? styles.completedBadge : styles.scheduledBadge
              ]}>
                <Text style={styles.statusText}>{activity.status}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* 건강 팁 */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>오늘의 펫 케어 팁</Text>
          <View style={styles.tipCard}>
            <MaterialIcons name="lightbulb" size={24} color="#ffa500" />
            <Text style={styles.tipText}>
              여름철에는 반려동물의 수분 섭취량을 늘려주세요. 
              충분한 물과 시원한 환경을 제공하는 것이 중요합니다.
            </Text>
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
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  welcomeSection: {
    paddingVertical: 20,
  },
  welcomeTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  welcomeSubtext: {
    fontSize: 16,
    color: '#666',
  },
  petCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 25,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  petInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  petImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 15,
  },
  petDetails: {
    flex: 1,
  },
  petName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 3,
  },
  petBreed: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3,
  },
  petStatus: {
    fontSize: 14,
    color: '#4ecdc4',
    fontWeight: '600',
  },
  addPetButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionContainer: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionCard: {
    width: '48%',
    aspectRatio: 1,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 8,
    textAlign: 'center',
  },
  activityCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  activityInfo: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  activityTime: {
    fontSize: 14,
    color: '#666',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  completedBadge: {
    backgroundColor: '#e8f5e8',
  },
  scheduledBadge: {
    backgroundColor: '#e8f3ff',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  tipCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    marginLeft: 10,
  },
});

export default HomeScreen;
