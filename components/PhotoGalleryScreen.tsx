import React, { useState } from 'react';
import Share from 'react-native-share';
import RNFS from 'react-native-fs';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  FlatList,
  Image,
  Dimensions,
  Modal,
  Alert,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

type SavedPhoto = {
  id: string;
  uri: any; // require() 타입을 위해 any로 변경
  title: string;
  date: string;
  category: string;
};

const PhotoGalleryScreen = ({ navigation }: any) => {
  const [selectedImage, setSelectedImage] = useState<SavedPhoto | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [savedPhotos, setSavedPhotos] = useState<SavedPhoto[]>([
    {
      id: '1',
      uri: require('../logo/dog.png'),
      title: '강아지 건강검진',
      date: '2025-01-15',
      category: '건강검진'
    },
    {
      id: '2',
      uri: require('../logo/dog.png'),
      title: '고양이 증상 기록',
      date: '2025-01-14',
      category: '증상기록'
    },
    {
      id: '3',
      uri: require('../logo/dog.png'),
      title: '반려동물 일상',
      date: '2025-01-13',
      category: '일상'
    },
    {
      id: '4',
      uri: require('../logo/dog.png'),
      title: '펫 사료 기록',
      date: '2025-01-12',
      category: '사료'
    }
  ]);

  const { width } = Dimensions.get('window');
  const imageSize = (width - 60) / 3; // 3개씩 배치하기 위한 크기 계산

  const openImageModal = (photo: SavedPhoto) => {
    setSelectedImage(photo);
    setModalVisible(true);
  };

  const closeImageModal = () => {
    setModalVisible(false);
    setSelectedImage(null);
  };

  const renderPhotoItem = ({ item }: { item: SavedPhoto }) => (
    <TouchableOpacity
      style={[styles.photoItem, { width: imageSize, height: imageSize }]}
      onPress={() => openImageModal(item)}
    >
      <Image
        source={item.uri}
        style={styles.photoImage}
        resizeMode="cover"
      />
      <View style={styles.photoOverlay}>
        <Text style={styles.photoTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.photoDate}>{item.date}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderImageModal = () => (
    <Modal
      visible={modalVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={closeImageModal}
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity 
          style={styles.modalBackdrop} 
          onPress={closeImageModal}
          activeOpacity={1}
        />
        <View style={styles.imageModalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>사진 상세보기</Text>
            <TouchableOpacity onPress={closeImageModal} style={styles.modalCloseButton}>
              <MaterialIcons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          {selectedImage && (
            <View style={styles.modalContent}>
              <Image
                source={selectedImage.uri}
                style={styles.fullSizeImage}
                resizeMode="contain"
              />
              <View style={styles.imageInfo}>
                <Text style={styles.imageTitle}>{selectedImage.title}</Text>
                <Text style={styles.imageCategory}>카테고리: {selectedImage.category}</Text>
                <Text style={styles.imageDate}>촬영일: {selectedImage.date}</Text>
              </View>
              
              <View style={styles.modalActions}>
                {/* 공유 */}
                <TouchableOpacity style={styles.actionButton} onPress={async () => {
                  if (!selectedImage) return;
                  try {
                    await Share.open({
                      url: RNFS.DocumentDirectoryPath + '/shared_image.png',
                      title: selectedImage.title,
                      message: selectedImage.title,
                    });
                  } catch (e) {
                    // 취소 시 에러 무시
                  }
                }}>
                  <MaterialIcons name="share" size={20} color="#0080ff" />
                  <Text style={styles.actionButtonText}>공유</Text>
                </TouchableOpacity>
                {/* 저장 */}
                <TouchableOpacity style={styles.actionButton} onPress={async () => {
                  if (!selectedImage) return;
                  try {
                    // 이미지를 앱의 DocumentDirectory에 저장
                    const destPath = RNFS.PicturesDirectoryPath + `/${selectedImage.title}_${Date.now()}.png`;
                    const source = Image.resolveAssetSource(selectedImage.uri).uri;
                    await RNFS.copyFile(source, destPath);
                    Alert.alert('알림', '이미지가 갤러리에 저장되었습니다!');
                  } catch (e) {
                    Alert.alert('오류', '이미지 저장에 실패했습니다.');
                  }
                }}>
                  <MaterialIcons name="download" size={20} color="#0080ff" />
                  <Text style={styles.actionButtonText}>저장</Text>
                </TouchableOpacity>
                {/* 삭제 */}
                <TouchableOpacity style={styles.actionButton} onPress={() => {
                  if (!selectedImage) return;
                  setSavedPhotos(prev => prev.filter(photo => photo.id !== selectedImage.id));
                  setModalVisible(false);
                  setSelectedImage(null);
                }}>
                  <MaterialIcons name="delete" size={20} color="#dc3545" />
                  <Text style={[styles.actionButtonText, { color: '#dc3545' }]}>삭제</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>사진 저장 목록</Text>
        <TouchableOpacity style={styles.searchButton}>
          <MaterialIcons name="search" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      {/* 메인 컨텐츠 */}
      <View style={styles.content}>
        <View style={styles.statsContainer}>
          <Text style={styles.statsText}>총 {savedPhotos.length}장의 사진</Text>
          <View style={styles.sortContainer}>
            <MaterialIcons name="sort" size={16} color="#666" />
            <Text style={styles.sortText}>최신순</Text>
          </View>
        </View>

        <FlatList
          data={savedPhotos}
          renderItem={renderPhotoItem}
          keyExtractor={(item) => item.id}
          numColumns={3}
          contentContainerStyle={styles.photoGrid}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          columnWrapperStyle={styles.photoRow}
        />
      </View>

      {/* 이미지 상세보기 모달 */}
      {renderImageModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 15,
    paddingTop: 50,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
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
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 10,
  },
  searchButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  statsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sortText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  photoGrid: {
    paddingBottom: 20,
  },
  photoRow: {
    justifyContent: 'space-between',
  },
  photoItem: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 10,
  },
  photoImage: {
    width: '100%',
    flex: 1,
  },
  photoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 8,
  },
  photoTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  photoDate: {
    fontSize: 10,
    color: '#ccc',
  },
  // 모달 스타일
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  imageModalContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    margin: 20,
    maxHeight: '90%',
    width: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: '#f8f9fa',
  },
  modalContent: {
    padding: 20,
  },
  fullSizeImage: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    marginBottom: 20,
  },
  imageInfo: {
    marginBottom: 20,
  },
  imageTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  imageCategory: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  imageDate: {
    fontSize: 14,
    color: '#666',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  actionButton: {
    alignItems: 'center',
    padding: 10,
  },
  actionButtonText: {
    fontSize: 12,
    color: '#0080ff',
    marginTop: 4,
    fontWeight: '500',
  },
});

export default PhotoGalleryScreen;
