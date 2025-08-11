import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  SafeAreaView,
  Alert,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

const ProfileScreen = ({ navigation }: any) => {
  const [userInfo] = useState({
    name: '김철수',
    email: '1234@1234',
    phone: '010-1234-5678',
    joinDate: '2024.01.15',
  });

  const [pets] = useState([
    {
      id: 1,
      name: '코코',
      breed: '말티즈',
      age: '3살',
      gender: '암컷',
      weight: '3.2kg',
      image: require('../logo/사용자 아이콘.png'),
    },
    {
      id: 2,
      name: '맥스',
      breed: '골든리트리버',
      age: '5살',
      gender: '수컷',
      weight: '28kg',
      image: require('../logo/사용자 아이콘.png'),
    },
  ]);

  const menuItems = [
    { id: 1, title: '개인정보 수정', icon: 'edit', action: 'editProfile' },
    { id: 2, title: '반려동물 관리', icon: 'pets', action: 'managePets' },
    { id: 3, title: '진료 기록', icon: 'medical-services', action: 'medicalHistory' },
    { id: 4, title: '알림 설정', icon: 'notifications', action: 'notifications' },
    { id: 5, title: '도움말', icon: 'help', action: 'help' },
    { id: 6, title: '로그아웃', icon: 'logout', action: 'logout', color: '#ff6b6b' },
  ];

  const handleMenuPress = (action: string) => {
    switch (action) {
      case 'editProfile':
        Alert.alert('개인정보 수정', '개인정보 수정 화면으로 이동합니다.');
        break;
      case 'managePets':
        Alert.alert('반려동물 관리', '반려동물 관리 화면으로 이동합니다.');
        break;
      case 'medicalHistory':
        Alert.alert('진료 기록', '진료 기록을 확인할 수 있습니다.');
        break;
      case 'notifications':
        Alert.alert('알림 설정', '알림 설정을 변경할 수 있습니다.');
        break;
      case 'help':
        Alert.alert('도움말', '자주 묻는 질문과 사용법을 확인할 수 있습니다.');
        break;
      case 'logout':
        Alert.alert(
          '로그아웃',
          '정말 로그아웃하시겠습니까?',
          [
            { text: '취소', style: 'cancel' },
            { 
              text: '로그아웃', 
              style: 'destructive',
              onPress: () => navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              })
            },
          ]
        );
        break;
      default:
        break;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content}>
        {/* 사용자 정보 카드 */}
        <View style={styles.userCard}>
          <View style={styles.userHeader}>
            <Image
              source={require('../logo/logo.png')}
              style={styles.userImage}
            />
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{userInfo.name}</Text>
              <Text style={styles.userEmail}>{userInfo.email}</Text>
              <Text style={styles.joinDate}>가입일: {userInfo.joinDate}</Text>
            </View>
            <TouchableOpacity style={styles.editButton}>
              <MaterialIcons name="edit" size={20} color="#0080ff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* 통계 섹션 */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>15</Text>
            <Text style={styles.statLabel}>AI 상담</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>8</Text>
            <Text style={styles.statLabel}>병원 방문</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{pets.length}</Text>
            <Text style={styles.statLabel}>반려동물</Text>
          </View>
        </View>

        {/* 반려동물 섹션 */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>내 반려동물</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>전체보기</Text>
            </TouchableOpacity>
          </View>
          {pets.map((pet) => (
            <View key={pet.id} style={styles.petCard}>
              <Image source={pet.image} style={styles.petImage} />
              <View style={styles.petInfo}>
                <Text style={styles.petName}>{pet.name}</Text>
                <Text style={styles.petDetails}>
                  {pet.breed} • {pet.age} • {pet.gender}
                </Text>
                <Text style={styles.petWeight}>체중: {pet.weight}</Text>
              </View>
              <TouchableOpacity style={styles.petMenuButton}>
                <MaterialIcons name="more-vert" size={20} color="#666" />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* 메뉴 섹션 */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>설정</Text>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.menuItem}
              onPress={() => handleMenuPress(item.action)}
            >
              <View style={styles.menuLeft}>
                <MaterialIcons 
                  name={item.icon} 
                  size={24} 
                  color={item.color || '#666'} 
                />
                <Text style={[
                  styles.menuTitle,
                  item.color && { color: item.color }
                ]}>
                  {item.title}
                </Text>
              </View>
              <MaterialIcons name="chevron-right" size={20} color="#ccc" />
            </TouchableOpacity>
          ))}
        </View>

        {/* 앱 정보 */}
        <View style={styles.appInfo}>
          <Text style={styles.appInfoText}>AI Pet Care v1.0.0</Text>
          <Text style={styles.appInfoText}>© 2024 AI Pet Care. All rights reserved.</Text>
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
  userCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginVertical: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginRight: 15,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3,
  },
  joinDate: {
    fontSize: 12,
    color: '#999',
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0080ff',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#e9ecef',
  },
  sectionContainer: {
    marginBottom: 25,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  seeAllText: {
    fontSize: 14,
    color: '#0080ff',
    fontWeight: '600',
  },
  petCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
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
  petImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  petInfo: {
    flex: 1,
  },
  petName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 3,
  },
  petDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  petWeight: {
    fontSize: 12,
    color: '#999',
  },
  petMenuButton: {
    padding: 5,
  },
  menuItem: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 8,
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
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuTitle: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
    fontWeight: '500',
  },
  appInfo: {
    alignItems: 'center',
    paddingVertical: 20,
    marginBottom: 20,
  },
  appInfoText: {
    fontSize: 12,
    color: '#999',
    marginBottom: 3,
  },
});

export default ProfileScreen;
