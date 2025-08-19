// ChatBotScreen.tsx
import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  SafeAreaView,
  StatusBar,
  Image,
  ScrollView,
  Modal,
  Animated,
  Dimensions,
  BackHandler,
  Alert,
  PermissionsAndroid,
  Keyboard,
} from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { launchImageLibrary, launchCamera, ImagePickerResponse, MediaType } from 'react-native-image-picker';
import { KeyboardAwareFlatList } from 'react-native-keyboard-aware-scroll-view';
import {   
  createThread,
  sendMessage,
  getThreads,
  getMessages,
  updateThread,
  deleteThread,
  getUserProfile 
   } from './api'; 
import { KeyboardAvoidingView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Message = {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  image?: string;
};

const PALETTE = {
  light: {
    bg: '#F6F8FA',
    surface: '#FFFFFF',
    border: '#E6EAEE',
    text: '#1F2937',
    subtext: '#6B7280',
    primary: '#0080ff',
    primaryPressed: '#0080ff',
    bubbleUserText: '#FFFFFF',
    bubbleBot: '#FFFFFF',
    chipBg: '#EFF6F3',
    chipText: '#0080ff',
    spinner: '#0080ff',
    cursor: '#0080ff',
    headerBg: '#FFFFFF',
  },
  dark: {
    bg: '#17191C',
    surface: '#23262A',
    border: '#2E3136',
    text: '#E5E7EB',
    subtext: '#9CA3AF',
    primary: '#0080ff',
    primaryPressed: '#0080ff',
    bubbleUserText: '#FFFFFF',
    bubbleBot: '#23262A',
    chipBg: '#1F2426',
    chipText: '#A7F3D0',
    spinner: '#0080ff',
    cursor: '#0080ff',
    headerBg: '#2B2F33',
  },
};

// 입력바 최소 높이
const INPUT_BAR_MIN_HEIGHT = 64;

const ChatBotScreen = ({ navigation, chatTheme, darkMode }: any) => {
  const insets = useSafeAreaInsets();
  const theme = useMemo(() => (darkMode ? PALETTE.dark : PALETTE.light), [darkMode]);
  const { width: screenWidth } = Dimensions.get('window');
  const [threadId, setThreadId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [typingText, setTypingText] = useState('');
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [imagePickerVisible, setImagePickerVisible] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [chatStartTime, setChatStartTime] = useState<Date | null>(null);
  const [headerHeight, setHeaderHeight] = useState<number>(64);
  const [username, setUsername] = useState<string>('');
  const [threads, setThreads] = useState<Array<{ thread_id: number; thread_title: string }>>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<number | null>(null);
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  const flatListRef = useRef<KeyboardAwareFlatList>(null);
  const sidebarAnimation = useRef(new Animated.Value(-300)).current;
  const spinnerAnimation = useRef(new Animated.Value(0)).current;
  const cursorAnimation = useRef(new Animated.Value(1)).current;

  const quickActions = [
    { icon: 'camera-alt', title: '동물 사진 분석', description: '반려동물 사진을 업로드하여 건강 상태를 분석해보세요' },
    { icon: 'pets', title: '펫 헬스케어', description: '사료, 증상, 생활습관 등 무엇이든 물어보세요' },
  ];

  // 키보드 이동 관련 코드 완전 제거 (KeyboardAvoidingView만 사용)

  useEffect(() => {
    if (messages.length > 0) setTimeout(() => flatListRef.current?.scrollToEnd(), 80);
  }, [messages]);

    useEffect(() => {
      const fetchProfile = async () => {
        try {
          const res = await getUserProfile();
          // res.data.username, res.data.nickname 등 백엔드 응답에 맞춰 수정하세요.
          const name = res.data.username || res.data.nickname;
          setUsername(name);
          // 로컬 저장도 필요하다면 저장
          await AsyncStorage.setItem('username', name);
        } catch (e) {
          console.error('사용자 정보 불러오기 실패:', e);
        }
      };
      fetchProfile();
    }, []);

  useEffect(() => {
    const backAction = () => {
      if (sidebarVisible) {
        toggleSidebar();
        return true;
      }
      navigation?.goBack && navigation.goBack();
      return true;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [sidebarVisible, navigation]);

  useEffect(() => {
    if (isDiagnosing) {
      const loop = Animated.loop(
        Animated.timing(spinnerAnimation, { toValue: 1, duration: 1000, useNativeDriver: true })
      );
      loop.start();
      return () => {
        loop.stop();
        spinnerAnimation.setValue(0);
      };
    }
  }, [isDiagnosing, spinnerAnimation]);
    useEffect(() => {
      const fetchThreads = async () => {
        try {
          const res = await getThreads();
          setThreads(res.data); // assume res.data is an array of threads
        } catch (e) {
          console.error('채팅 목록 불러오기 실패:', e);
        }
      };
      fetchThreads();
    }, []);

  useEffect(() => {
    if (isTyping && !isDiagnosing) {
      const blink = Animated.loop(
        Animated.sequence([
          Animated.timing(cursorAnimation, { toValue: 0, duration: 450, useNativeDriver: true }),
          Animated.timing(cursorAnimation, { toValue: 1, duration: 450, useNativeDriver: true }),
        ])
      );
      blink.start();
      return () => {
        blink.stop();
        cursorAnimation.setValue(1);
      };
    }
  }, [isTyping, isDiagnosing, cursorAnimation]);

  const toggleSidebar = () => {
    if (sidebarVisible) {
      Animated.timing(sidebarAnimation, { toValue: -300, duration: 280, useNativeDriver: false }).start(() =>
        setSidebarVisible(false)
      );
    } else {
      setSidebarVisible(true);
      Animated.timing(sidebarAnimation, { toValue: 0, duration: 280, useNativeDriver: false }).start();
    }
  };
    const selectThread = async (thread: { thread_id: number; thread_title: string }) => {
      setSelectedThreadId(thread.thread_id);
      setThreadId(thread.thread_id);
      setChatStartTime(null);
      try {
        const res = await getMessages(thread.thread_id);
        // res.data는 백엔드에서 돌려주는 메시지 목록이라고 가정합니다.
        setMessages(
          res.data.map((m: any) => ({
            id: String(m.message_id),
            text: m.content,
            sender: m.sender_type === 'assistant' ? 'bot' : 'user',
            timestamp: new Date(m.created_at),
            image: m.image_url ?? undefined,
          })),
        );
      } catch (e) {
        console.error('메시지 불러오기 실패:', e);
        Alert.alert('오류', '채팅을 열 수 없습니다.');
      }
      toggleSidebar(); // 사이드바 닫기
    };

  const startNewChat = async () => {
    setMessages([]);
    setChatStartTime(null);
    toggleSidebar();
    try {
      const response = await createThread('새 채팅');
      const createdThread = response.data;
      setThreadId(createdThread.thread_id);
      setThreads((prev) => [...prev, createdThread]); // 목록에 새 항목 추가
      setSelectedThreadId(createdThread.thread_id);
    } catch (e) {
      console.error('새 채팅 생성 실패:', e);
      Alert.alert('오류', '새 채팅을 시작할 수 없습니다.');
    }
  };
  

  const two = (n: number) => n.toString().padStart(2, '0');
  const formatChatStartTime = (d: Date) =>
    `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 ${two(d.getHours())}:${two(d.getMinutes())}`;
  const formatMessageTime = (d: Date) => `${two(d.getHours())}:${two(d.getMinutes())}`;
  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const shouldShowDateSeparator = (current: Message, prev: Message | null) => !!prev && !isSameDay(current.timestamp, prev.timestamp);

  const ensureStartTime = () => {
    if (!chatStartTime) setChatStartTime(new Date());
  };

  // ===== 이미지/메시지 전송 =====
  const requestCameraPermission = async () => {
    if (Platform.OS !== 'android') return true;
    try {
      const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA, {
        title: '카메라 권한',
        message: '사진 촬영을 위해 카메라 권한이 필요합니다.',
        buttonNeutral: '나중에',
        buttonNegative: '취소',
        buttonPositive: '확인',
      });
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (e) {
      console.warn(e);
      return false;
    }
  };

  const showImagePicker = () => setImagePickerVisible(true);

  const pickImageFromGallery = () => {
    setImagePickerVisible(false);
    const options = { mediaType: 'photo' as MediaType, includeBase64: false, maxHeight: 2000, maxWidth: 2000 };
    launchImageLibrary(options, (res: ImagePickerResponse) => {
      if (res.didCancel || res.errorMessage) return;
      const uri = res.assets?.[0]?.uri;
      if (uri) sendImageMessage(uri);
    });
  };

  const pickImageFromCamera = async () => {
    setImagePickerVisible(false);
    const ok = await requestCameraPermission();
    if (!ok) {
      Alert.alert('권한 필요', '카메라 사용을 위해 권한이 필요합니다.');
      return;
    }
    const options = { mediaType: 'photo' as MediaType, includeBase64: false, maxHeight: 2000, maxWidth: 2000 };
    launchCamera(options, (res: ImagePickerResponse) => {
      if (res.didCancel || res.errorMessage) return;
      const uri = res.assets?.[0]?.uri;
      if (uri) sendImageMessage(uri);
    });
  };

  const typeWriter = (text: string, onDone: () => void) => {
    setTypingText('');
    setIsTyping(true);
    setIsDiagnosing(false);
    let i = 0;
    const timer = setInterval(() => {
      if (i < text.length) {
        setTypingText(text.slice(0, i + 1));
        i++;
      } else {
        clearInterval(timer);
        setIsTyping(false);
        onDone();
      }
    }, 18);
  };

  const sendImageMessage = (imageUri: string) => {
    ensureStartTime();
    const now = new Date();
    const userMsg: Message = {
      id: Date.now().toString(),
      text: '동물 사진 분석을 요청합니다.',
      sender: 'user',
      timestamp: now,
      image: imageUri,
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsDiagnosing(true);

    setTimeout(() => {
      const botResponse =
        '업로드해주신 사진을 분석하고 있어요 🔍\n\n더 정확한 판단을 위해 아래 정보를 알려주세요:\n• 나이/품종\n• 현재 보이는 증상과 시작 시점\n• 식욕·활동량 변화\n\n심각한 증상이 보이면 가까운 동물병원 방문을 권장합니다. 🏥';
      typeWriter(botResponse, () => {
        const botMsg: Message = { id: (Date.now() + 1).toString(), text: botResponse, sender: 'bot', timestamp: new Date() };
        setMessages((prev) => [...prev, botMsg]);
        setTypingText('');
      });
    }, 1800);
  };

const handleSend = async (text?: string) => {
  const messageText = (text ?? input).trim();
  if (!messageText) return;
  ensureStartTime();
  const now = new Date();
  const userMsg: Message = { id: Date.now().toString(), text: messageText, sender: 'user', timestamp: now };
  setMessages((prev) => [...prev, userMsg]);
  setInput('');
  setIsDiagnosing(true);

  // DB에 유저 메시지 저장
  if (threadId) {
    try {
      await sendMessage(threadId, messageText, 'user');
    } catch (e) {
      console.error('메시지 저장 실패:', e);
    }
  }

  setTimeout(() => {
    const botResponse = generateBotResponse(messageText);
    typeWriter(botResponse, async () => {
      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: botResponse,
        sender: 'bot',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMsg]);
      setTypingText('');

      if (threadId) {
        try {
          await sendMessage(threadId, botResponse, 'assistant');
        } catch (e) {
          console.error('챗봇 응답 저장 실패:', e);
        }
      }
    });
  }, 1200);
};


  const generateBotResponse = (msg: string): string => {
    const m = msg.toLowerCase();
    if (m.includes('안녕') || m.includes('hello') || m.includes('도움')) {
      return (
        '안녕하세요! 저는 반려동물 헬스케어 AI 챗봇입니다. 🐾\n' +
        '행동·증상·사료·생활습관 등 무엇이든 물어보세요.\n' +
        '응급이 의심될 땐 즉시 동물병원 방문을 권장드려요. 🏥'
      );
    }
    if (m.includes('기침') || m.includes('콜록')) {
      return (
        '기침이 있다면 다음을 확인해보세요:\n' +
        '• 지속 시간/빈도, 발열 여부\n' +
        '• 식욕/활동량 변화\n' +
        '• 가래·혈액 동반 여부\n' +
        '2일 이상 지속되면 진료를 권장합니다. 🏥'
      );
    }
    if (m.includes('밥') || m.includes('식욕') || m.includes('안 먹')) {
      return (
        '식욕 부진의 흔한 원인:\n' +
        '• 환경 변화/스트레스\n' +
        '• 구강·치과 문제\n' +
        '• 소화기 질환, 사료 변경 거부\n' +
        '24시간 이상 전혀 먹지 않으면 즉시 병원으로 가세요. 물은 상시 제공하세요. 💧'
      );
    }
    return (
      '증상에 대해 조금만 더 알려주실 수 있을까요?\n' +
      '• 언제부터 시작되었나요?\n' +
      '• 동반 증상(구토/설사/무기력 등)은 있나요?\n' +
      '• 평소와 달라진 행동이 있나요?\n' +
      '심각하면 바로 병원 방문을 권장합니다. 🏥'
    );
  };

  // ===== 렌더 =====
  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const prev = index > 0 ? messages[index - 1] : null;
    const needDateChip = shouldShowDateSeparator(item, prev);

    return (
      <View>
        {needDateChip && (
          <View style={styles.dateSeparatorContainer}>
            <Text style={styles.dateSeparatorText}>
              {`${item.timestamp.getFullYear()}년 ${item.timestamp.getMonth() + 1}월 ${item.timestamp.getDate()}일`}
            </Text>
          </View>
        )}

        {item.sender === 'user' ? (
          <View style={styles.userMessageContainer}>
            <View
              style={[
                styles.messageBubble,
                { backgroundColor: theme.primary, borderBottomRightRadius: 6, borderColor: 'transparent' },
              ]}
            >
              {item.image ? (
                <View>
                  <Image source={{ uri: item.image }} style={styles.messageImage} resizeMode="cover" />
                  {item.text ? (
                    <Text style={[styles.messageText, { color: theme.bubbleUserText, marginTop: 8 }]}>{item.text}</Text>
                  ) : null}
                </View>
              ) : (
                <Text style={[styles.messageText, { color: theme.bubbleUserText }]}>{item.text}</Text>
              )}
            </View>
            <Image
              source={darkMode ? require('../logo/user2.png') : require('../logo/user.png')}
              style={styles.userAvatar}
              resizeMode="contain"
            />
          </View>
        ) : (
          <View>
            <View style={styles.botMessageContainer}>
              <Image
                source={chatTheme ? require('../logo/cat.png') : require('../logo/dog.png')}
                style={styles.botAvatar}
                resizeMode="contain"
              />
              <View
                style={[
                  styles.messageBubble,
                  { backgroundColor: theme.bubbleBot, borderColor: theme.border, borderBottomLeftRadius: 6 },
                ]}
              >
                <Text style={[styles.messageText, { color: theme.text }]}>{item.text}</Text>
              </View>
            </View>
            <View style={styles.botTimeContainer}>
              <Text style={[styles.botTimeText, { color: theme.subtext }]}>{formatMessageTime(item.timestamp)}</Text>
            </View>
          </View>
        )}
      </View>
    );
  };

  const spin = spinnerAnimation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const renderTypingIndicator = () => (
    <View style={styles.botMessageContainer}>
      <Image
        source={chatTheme ? require('../logo/cat.png') : require('../logo/dog.png')}
        style={styles.botAvatar}
        resizeMode="contain"
      />
      <View
        style={[
          styles.messageBubble,
          { backgroundColor: theme.bubbleBot, borderColor: theme.border, borderBottomLeftRadius: 6 },
        ]}
      >
        {isDiagnosing ? (
          <View style={styles.diagnosingContainer}>
            <Animated.View style={[styles.loadingSpinner, { borderColor: theme.spinner, transform: [{ rotate: spin }] }]} />
            <Text style={[styles.diagnosingText, { color: theme.subtext }]}>진단중...</Text>
          </View>
        ) : (
          <View style={styles.typingContainer}>
            <Text style={[styles.messageText, { color: theme.text }]}>{typingText}</Text>
            <Animated.View style={[styles.typingCursor, { backgroundColor: theme.cursor, opacity: cursorAnimation }]} />
          </View>
        )}
      </View>
    </View>
  );

  const renderSidebar = () => (
    <Modal visible={sidebarVisible} transparent animationType="none" onRequestClose={toggleSidebar}>
      <View style={styles.sidebarOverlay}>
        <TouchableOpacity style={styles.sidebarBackdrop} onPress={toggleSidebar} activeOpacity={1} />
        <Animated.View
          style={[styles.sidebar, { left: sidebarAnimation, backgroundColor: theme.surface, borderRightColor: theme.border }]}
        >
          <View style={styles.sidebarContent}>
            <View style={[styles.sidebarTopHeader, { backgroundColor: theme.headerBg, borderBottomColor: theme.border }]}>
              <View
                style={[
                  styles.searchInputContainer,
                  { backgroundColor: darkMode ? '#3A3F44' : '#F3F5F7', borderColor: theme.border },
                ]}
              >
                <MaterialIcons name="search" size={16} color={theme.subtext} style={styles.searchIcon} />
                <TextInput
                  style={[styles.searchInput, { color: theme.text }]}
                  placeholder="채팅 검색"
                  placeholderTextColor={theme.subtext}
                  blurOnSubmit={false}
                  returnKeyType="search"
                  removeClippedSubviews={false}
                />
              </View>
              <TouchableOpacity onPress={toggleSidebar} style={styles.closeButton}>
                <MaterialIcons name="close" size={20} color={theme.subtext} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.sidebarScrollView} contentContainerStyle={styles.sidebarScrollContent}>
              <TouchableOpacity style={styles.newChatButton} onPress={startNewChat}>
                <MaterialIcons name="chat" size={18} color={theme.subtext} style={{ marginRight: 12 }} />
                <Text style={[styles.newChatText, { color: theme.text }]}>새 채팅</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.photoSaveButton}
                onPress={() => {
                  navigation?.goToPhotoGallery && navigation.goToPhotoGallery();
                }}
              >
                <MaterialIcons name="photo-library" size={18} color={theme.subtext} style={{ marginRight: 12 }} />
                <Text style={[styles.photoSaveText, { color: theme.text }]}>사진 저장 목록</Text>
              </TouchableOpacity>

              <View style={[styles.divider, { backgroundColor: theme.border }]} />

              <View style={styles.sidebarSection}>
                <Text style={[styles.sectionTitle, { color: theme.subtext }]}>내 채팅</Text>
                {threads.map((thread) => (
  <View key={thread.thread_id} style={{ flexDirection: 'row', alignItems: 'center' }}>
    {/* 채팅을 눌렀을 때 해당 쓰레드를 열도록 설정 */}
    <TouchableOpacity
      style={{ flex: 1, paddingVertical: 10, paddingHorizontal: 20 }}
      onPress={() => selectThread(thread)}
    >
      <Text style={{ color: theme.text }}>{thread.thread_title}</Text>
    </TouchableOpacity>

    {/* 햄버거 메뉴: 이름 변경/삭제 메뉴를 띄우는 버튼 */}
    <TouchableOpacity
      style={{ paddingHorizontal: 16, paddingVertical: 10 }}
      onPress={() => {
        Alert.alert(
          '채팅 옵션',
          '',
          [
            {
              text: '이름 변경',
              onPress: () => {
                setNewTitle(thread.thread_title);
                setSelectedThreadId(thread.thread_id);
                setRenameModalVisible(true);
              },
            },
            {
              text: '삭제',
              onPress: async () => {
                try {
                  await deleteThread(thread.thread_id);
                  setThreads((prev) => prev.filter((t) => t.thread_id !== thread.thread_id));
                  if (selectedThreadId === thread.thread_id) {
                    setMessages([]);
                    setThreadId(null);
                    setSelectedThreadId(null);
                  }
                } catch (e) {
                  console.error('삭제 실패:', e);
                  Alert.alert('오류', '채팅을 삭제할 수 없습니다.');
                }
              },
              style: 'destructive',
            },
            { text: '취소', style: 'cancel' },
          ],
          { cancelable: true },
        );
      }}
    >
      <MaterialIcons name="more-horiz" size={20} color={theme.subtext} />
    </TouchableOpacity>
  </View>
))}

              </View>
            </ScrollView>

            <View style={[styles.sidebarBottom, { borderTopColor: theme.border }]}>
              <TouchableOpacity
                style={[styles.logoutButton, { backgroundColor: '#dc3545', borderColor: theme.border }]}
                onPress={() => setLogoutModalVisible(true)}
              >
                <Text style={styles.logoutText}>로그아웃</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );

  const renderImagePickerModal = () => (
    <Modal visible={imagePickerVisible} transparent animationType="fade" onRequestClose={() => setImagePickerVisible(false)}>
      <View style={styles.modalOverlay}>
        <View style={[styles.imagePickerModal, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>사진 선택</Text>
            <TouchableOpacity
              onPress={() => setImagePickerVisible(false)}
              style={[styles.modalCloseButton, { backgroundColor: darkMode ? '#2F3438' : '#F3F5F7' }]}
            >
              <MaterialIcons name="close" size={24} color={theme.subtext} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.modalSubtitle, { color: theme.subtext }]}>사진을 어떻게 추가하시겠습니까?</Text>

          <View style={styles.imagePickerOptions}>
            <TouchableOpacity
              style={[
                styles.imagePickerOption,
                { backgroundColor: darkMode ? '#1F2426' : '#F6F8FA', borderColor: theme.border },
              ]}
              onPress={pickImageFromGallery}
            >
              <View style={[styles.optionIconContainer, { backgroundColor: darkMode ? '#163D34' : '#E3F2ED' }]}>
                <MaterialIcons name="photo-library" size={32} color={theme.primary} />
              </View>
              <View style={styles.optionContent}>
                <Text style={[styles.optionTitle, { color: theme.text }]}>갤러리에서 선택</Text>
                <Text style={[styles.optionDescription, { color: theme.subtext }]}>저장된 사진에서 선택합니다</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.imagePickerOption,
                { backgroundColor: darkMode ? '#1F2426' : '#F6F8FA', borderColor: theme.border },
              ]}
              onPress={pickImageFromCamera}
            >
              <View style={[styles.optionIconContainer, { backgroundColor: darkMode ? '#163D34' : '#E3F2ED' }]}>
                <MaterialIcons name="camera-alt" size={32} color={theme.primary} />
              </View>
              <View style={styles.optionContent}>
                <Text style={[styles.optionTitle, { color: theme.text }]}>카메라로 촬영</Text>
                <Text style={[styles.optionDescription, { color: theme.subtext }]}>새로운 사진을 촬영합니다</Text>
              </View>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.modalCancelButton, { backgroundColor: darkMode ? '#2B2F33' : '#F3F5F7', borderColor: theme.border }]}
            onPress={() => setImagePickerVisible(false)}
          >
            <Text style={[styles.modalCancelText, { color: theme.subtext }]}>취소</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderLogoutModal = () => (
    <Modal visible={logoutModalVisible} transparent animationType="fade" onRequestClose={() => setLogoutModalVisible(false)}>
      <View style={styles.modalOverlay}>
        <View style={[styles.logoutConfirmModal, { backgroundColor: theme.surface }]}>
          <View style={styles.modalHeader}>
            <MaterialIcons name="logout" size={32} color="#ff6b6b" />
            <Text style={[styles.logoutModalTitle, { color: '#ff6b6b' }]}>로그아웃</Text>
          </View>
          <Text style={[styles.logoutModalMessage, { color: theme.subtext }]}>
            정말로 로그아웃 하시겠습니까?{'\n'}현재 채팅 내용이 저장되지 않을 수 있습니다.
          </Text>
          <View style={styles.logoutModalButtons}>
            <TouchableOpacity
              style={[styles.logoutCancelButton, { backgroundColor: darkMode ? '#2B2F33' : '#F3F5F7', borderColor: theme.border }]}
              onPress={() => setLogoutModalVisible(false)}
            >
              <Text style={[styles.logoutCancelText, { color: theme.subtext }]}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.logoutConfirmButton, { backgroundColor: '#dc3545' }]}
              onPress={() => {
                setLogoutModalVisible(false);
                toggleSidebar();
                navigation?.goToLogin && navigation.goToLogin();
              }}
            >
              <Text style={styles.logoutConfirmText}>로그아웃</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={headerHeight}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}> 
      <StatusBar barStyle={darkMode ? 'light-content' : 'dark-content'} backgroundColor={theme.headerBg} />

      {renderSidebar()}
      {renderImagePickerModal()}
      {renderLogoutModal()}
      {/* 이름 변경 모달 */}
<Modal visible={renameModalVisible} transparent animationType="fade" onRequestClose={() => setRenameModalVisible(false)}>
  <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
    <View style={{ width: '80%', backgroundColor: '#fff', padding: 20, borderRadius: 8 }}>
      <Text style={{ fontSize: 16, marginBottom: 10 }}>채팅 이름 수정</Text>
      <TextInput
        value={newTitle}
        onChangeText={setNewTitle}
        placeholder="새로운 이름"
        style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 5, padding: 8, marginBottom: 10 }}
      />
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
        <TouchableOpacity onPress={() => setRenameModalVisible(false)} style={{ marginRight: 10 }}>
          <Text style={{ color: '#999' }}>취소</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={async () => {
            if (!selectedThreadId) return;
            try {
              await updateThread(selectedThreadId, newTitle);
              setThreads((prev) =>
                prev.map((t) => (t.thread_id === selectedThreadId ? { ...t, thread_title: newTitle } : t)),
              );
              setRenameModalVisible(false);
            } catch (e) {
              console.error('이름 변경 실패:', e);
              Alert.alert('오류', '이름을 수정할 수 없습니다.');
            }
          }}
        >
          <Text style={{ color: '#0080ff' }}>저장</Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
</Modal>


      {/* 헤더 */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: theme.headerBg,
            borderBottomColor: theme.border,
          },
        ]}
        onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}
      >
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.menuButton} onPress={toggleSidebar}>
            <MaterialIcons name="menu" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Pet Bot</Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={[styles.welcomeText, { color: theme.subtext }]}>
            환영합니다{'\n'}
          <Text style={[styles.teamText, { color: theme.subtext }]}>
            {`${username}님`}
          </Text>
          </Text>
          <TouchableOpacity
            style={[styles.profileIconContainer, { backgroundColor: darkMode ? '#2B2F33' : '#F0F2F4' }]}
            onPress={() => navigation?.goToSettings && navigation.goToSettings()}
          >
            <Image
              source={darkMode ? require('../logo/user2.png') : require('../logo/user.png')}
              style={styles.profileIconImage}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* 본문 */}
      <View style={{ flex: 1 }}>
        {messages.length === 0 ? (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.welcomeContent} showsVerticalScrollIndicator={false}>
            <View style={styles.logoSection}>
              <View
                style={[
                  styles.logoContainer,
                  { backgroundColor: darkMode ? '#1F2426' : '#F6F8FA', borderColor: theme.border },
                ]}
              >
                <Image source={chatTheme ? require('../logo/cat.png') : require('../logo/dog.png')} style={styles.logoImage} resizeMode="contain" />
              </View>
              <Text style={[styles.welcomeTitle, { color: theme.text }]}>무엇을 도와드릴까요?</Text>
            </View>

            <View style={styles.quickActionsContainer}>
              {quickActions.map((action, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.quickActionCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
                  onPress={() => {
                    if (action.title === '동물 사진 분석') showImagePicker();
                    else if (action.title === '펫 헬스케어') setInput('펫 헬스케어에 대해 알려주세요');
                    else handleSend(action.title);
                  }}
                >
                  <View style={styles.quickActionHeader}>
                    <MaterialIcons name={action.icon} size={24} color={theme.primary} style={{ marginRight: 12 }} />
                    <Text style={[styles.quickActionTitle, { color: theme.text }]}>{action.title}</Text>
                  </View>
                  <Text style={[styles.quickActionDescription, { color: theme.subtext }]}>{action.description}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        ) : (
          <KeyboardAwareFlatList
            ref={flatListRef}
            data={messages}
            renderItem={({ item, index }) => renderMessage({ item, index })}
            keyExtractor={(item) => item.id}
            // 입력바 높이 + 안전영역 + 키보드 높이만큼 패딩
            contentContainerStyle={{
              padding: 15,
              paddingBottom: INPUT_BAR_MIN_HEIGHT + (insets.bottom || 0) + 8,
            }}
            ListHeaderComponent={
              chatStartTime ? (
                <View style={styles.chatStartTimeContainer}>
                  <Text style={[styles.chatStartTimeText, { backgroundColor: theme.chipBg, color: theme.chipText }]}>
                    {formatChatStartTime(chatStartTime)}
                  </Text>
                </View>
              ) : null
            }
            ListFooterComponent={isDiagnosing || isTyping ? renderTypingIndicator : null}
            keyboardShouldPersistTaps="handled"
            enableOnAndroid
            enableAutomaticScroll
            extraScrollHeight={0}
            showsVerticalScrollIndicator={false}
            keyboardDismissMode="interactive"
            onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
            onLayout={() => flatListRef.current?.scrollToEnd()}
          />
        )}
      </View>

      {/* 입력창: KeyboardAvoidingView만 사용, 일반 View로 변경 */}
          <View
            style={[
              styles.inputContainer,
              {
                backgroundColor: theme.surface,
                borderTopColor: theme.border,
                paddingBottom: insets.bottom || 0,
                minHeight: INPUT_BAR_MIN_HEIGHT,
              },
            ]}
          >
        <View
          style={[
            styles.inputWrapper,
            {
              backgroundColor: darkMode ? '#1F2426' : '#F6F8FA',
              borderColor: theme.border,
            },
          ]}
        >
          <TouchableOpacity style={styles.attachButton} onPress={showImagePicker}>
            <MaterialIcons name="photo-camera" size={20} color={theme.subtext} />
          </TouchableOpacity>
          <TextInput
            style={[styles.input, { color: theme.text }]}
            placeholder="메시지를 입력하세요..."
            placeholderTextColor={theme.subtext}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={500}
            blurOnSubmit={false}
            returnKeyType="send"
            removeClippedSubviews={false}
            onFocus={() => {
              setTimeout(() => flatListRef.current?.scrollToEnd(), Platform.OS === 'ios' ? 80 : 200);
            }}
            onSubmitEditing={() => {
              if (!input.trim()) return;
              handleSend();
            }}
          />
          <TouchableOpacity
            onPress={() => handleSend()}
            style={[
              styles.sendButton,
              { backgroundColor: input.trim() ? theme.primary : (darkMode ? '#2B2F33' : '#E6EAEE') },
            ]}
            disabled={!input.trim()}
          >
            <MaterialIcons name="send" size={18} color={input.trim() ? '#fff' : (darkMode ? '#565B60' : '#98A2AE')} />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  </KeyboardAvoidingView>
);
};

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 14,
    paddingTop: 50,
    borderBottomWidth: 1,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  menuButton: { width: 30, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  welcomeText: { fontSize: 14, marginRight: 5, textAlign: 'center' },
  teamText: { fontSize: 12, marginRight: 8, textAlign: 'center' },
  profileIconImage: { width: 25, height: 25, borderRadius: 12.5 },
  profileIconContainer: { width: 35, height: 35, borderRadius: 17.5, justifyContent: 'center', alignItems: 'center', marginLeft: 8 },

  // 빈 상태
  welcomeContent: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 40 },
  logoSection: { alignItems: 'center', marginBottom: 28 },
  logoContainer: { width: 84, height: 84, borderRadius: 42, justifyContent: 'center', alignItems: 'center', marginBottom: 16, borderWidth: 1 },
  logoImage: { width: 60, height: 60 },
  welcomeTitle: { fontSize: 22, fontWeight: '800' },
  quickActionsContainer: { width: '100%', gap: 12, paddingHorizontal: 16 },
  quickActionCard: {
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  quickActionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  quickActionTitle: { fontSize: 15, fontWeight: '700' },
  quickActionDescription: { fontSize: 13, lineHeight: 19 },

  // 메시지 리스트
  userMessageContainer: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'flex-end', marginVertical: 4, paddingHorizontal: 10 },
  botMessageContainer: { flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'flex-start', marginVertical: 4, paddingHorizontal: 0 },
  botAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 6, marginTop: 2 },
  userAvatar: { width: 35, height: 35, borderRadius: 17.5, marginLeft: 6, marginTop: 2 },
  messageBubble: { paddingVertical: 10, paddingHorizontal: 13, borderRadius: 18, maxWidth: '78%', borderWidth: 1 },
  messageText: { fontSize: 15, lineHeight: 22 },
  messageImage: { width: 210, height: 210, borderRadius: 12, marginBottom: 6 },

  // 날짜/시간 칩
  chatStartTimeContainer: { alignItems: 'center', marginVertical: 18 },
  chatStartTimeText: { fontSize: 12, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  dateSeparatorContainer: { alignItems: 'center', marginVertical: 14 },
  dateSeparatorText: { fontSize: 12, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  botTimeContainer: { marginLeft: 55, marginTop: 2, marginBottom: 8 },
  botTimeText: { fontSize: 11 },

  // 타이핑/진단
  diagnosingContainer: { flexDirection: 'row', alignItems: 'center', padding: 5 },
  loadingSpinner: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderTopColor: 'transparent', marginRight: 8 },
  diagnosingText: { fontSize: 14 },
  typingContainer: { flexDirection: 'row', alignItems: 'flex-end', flexWrap: 'wrap' },
  typingCursor: { width: 2, height: 18, marginLeft: 3, opacity: 1 },

  // 입력 영역
  inputContainer: {
    borderTopWidth: 1,
    paddingHorizontal: 15,
    paddingTop: 8,
  },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', borderRadius: 22, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1 },
  attachButton: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center', marginRight: 6 },
  input: { flex: 1, fontSize: 16, maxHeight: 120, paddingVertical: Platform.OS === 'android' ? 10 : 8, textAlignVertical: 'top' },
  sendButton: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginLeft: 8 },

  // 사이드바/모달
  sidebarOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', flexDirection: 'row' },
  sidebarBackdrop: { flex: 1 },
  sidebar: { width: 280, height: '100%', position: 'absolute', left: -300, top: 0, borderRightWidth: 1 },
  sidebarContent: { flex: 1, paddingTop: 0 },
  sidebarScrollView: { flex: 1 },
  sidebarScrollContent: { flexGrow: 1 },
  sidebarTopHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 10, borderBottomWidth: 1 },
  searchInputContainer: { flexDirection: 'row', alignItems: 'center', borderRadius: 18, paddingHorizontal: 12, paddingVertical: 6, flex: 1, marginRight: 10, borderWidth: 1 },
  searchInput: { flex: 1, fontSize: 14, paddingVertical: 4 },
  searchIcon: { marginRight: 6 },
  closeButton: { width: 30, height: 30, justifyContent: 'center', alignItems: 'center' },
  newChatButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14 },
  newChatText: { fontSize: 16, fontWeight: '600' },
  photoSaveButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14 },
  photoSaveText: { fontSize: 16, fontWeight: '600' },
  divider: { height: 1, marginHorizontal: 0, marginVertical: 10 },
  sidebarSection: { paddingHorizontal: 20, paddingVertical: 14 },
  sectionTitle: { fontSize: 14, fontWeight: '600' },
  sidebarBottom: { paddingHorizontal: 20, paddingVertical: 20, borderTopWidth: 1 },
  logoutButton: { justifyContent: 'center', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 13, borderRadius: 10, borderWidth: 1 },
  logoutText: { fontSize: 16, color: '#fff', fontWeight: '700' },

  // 공통 모달
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  imagePickerModal: {
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 320,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  modalTitle: { fontSize: 20, fontWeight: '800' },
  modalCloseButton: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center', borderRadius: 16 },
  modalSubtitle: { fontSize: 14, marginBottom: 18, textAlign: 'center' },
  imagePickerOptions: { gap: 10, marginBottom: 18 },
  imagePickerOption: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 1 },
  optionIconContainer: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  optionContent: { flex: 1 },
  optionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  optionDescription: { fontSize: 13 },
  modalCancelButton: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8, borderWidth: 1, alignItems: 'center' },
  modalCancelText: { fontSize: 16, fontWeight: '600' },

  // 로그아웃 모달
  logoutConfirmModal: {
    borderRadius: 16,
    padding: 24,
    margin: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  logoutModalTitle: { fontSize: 20, fontWeight: '800', marginLeft: 12 },
  logoutModalMessage: { fontSize: 16, textAlign: 'center', lineHeight: 24, marginVertical: 18 },
  logoutModalButtons: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 10 },
  logoutCancelButton: { flex: 1, padding: 14, borderRadius: 8, marginRight: 8, alignItems: 'center', borderWidth: 1 },
  logoutCancelText: { fontSize: 16, fontWeight: '700' },
  logoutConfirmButton: { flex: 1, padding: 14, borderRadius: 8, marginLeft: 8, alignItems: 'center' },
  logoutConfirmText: { fontSize: 16, color: '#fff', fontWeight: '800' },
});

export default ChatBotScreen;