// ChatBotScreen.tsx
import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  StatusBar,
  Image,
  ScrollView,
  Modal,
  Animated,
  BackHandler,
  PermissionsAndroid,
  Keyboard,
  FlatList,
  KeyboardAvoidingView,
  Alert as RNAlert, // RN 기본 알림은 일부 옵션 메뉴에만 사용
} from 'react-native';

import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { launchImageLibrary, launchCamera, ImagePickerResponse, MediaType } from 'react-native-image-picker';
import {
  createThread,
  sendMessage,
  getThreads,
  getMessages,
  updateThread,
  deleteThread,
  getUserProfile
} from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';

// ====== 온디바이스 모델 URL/파일명 설정 ======
const MODEL_FILE_NAME = 'kogpt.Q3_K_M.gguf';
const MODEL_URL = 'https://oceanaimodel.s3.ap-northeast-2.amazonaws.com/kogpt.Q3_K_M.gguf';

type Message = {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  image?: string;
};

type ModelState = 'checking' | 'idle' | 'downloading' | 'ready' | 'error';

type AppAlertConfig = {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
};

const PALETTE = {
  light: {
    bg: '#F6F8FA',
    surface: '#FFFFFF',
    border: '#E6EAEE',
    text: '#1F2937',
    subtext: '#6B7280',
    primary: '#0080ff',
    primaryPressed: '#0073e6',
    bubbleUserText: '#FFFFFF',
    bubbleBot: '#FFFFFF',
    chipBg: '#EFF6F3',
    chipText: '#0080ff',
    spinner: '#0080ff',
    cursor: '#0080ff',
    headerBg: '#FFFFFF',
    danger: '#dc3545',
  },
  dark: {
    bg: '#17191C',
    surface: '#23262A',
    border: '#2E3136',
    text: '#E5E7EB',
    subtext: '#9CA3AF',
    primary: '#0080ff',
    primaryPressed: '#0073e6',
    bubbleUserText: '#FFFFFF',
    bubbleBot: '#23262A',
    chipBg: '#1F2426',
    chipText: '#A7F3D0',
    spinner: '#0080ff',
    cursor: '#0080ff',
    headerBg: '#2B2F33',
    danger: '#ff6b6b',
  },
};

const INPUT_BAR_MIN_HEIGHT = 64;

const ChatBotScreen = ({ navigation, chatTheme, darkMode }: any) => {
  const insets = useSafeAreaInsets();
  const theme = useMemo(() => (darkMode ? PALETTE.dark : PALETTE.light), [darkMode]);

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
  const [username, setUsername] = useState<string>('');
  const [threads, setThreads] = useState<Array<{ thread_id: number; thread_title: string }>>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<number | null>(null);

  // 이름 변경 모달
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  const flatListRef = useRef<FlatList<Message>>(null);
  const sidebarAnimation = useRef(new Animated.Value(-300)).current;
  const spinnerAnimation = useRef(new Animated.Value(0)).current;
  const cursorAnimation = useRef(new Animated.Value(1)).current;

  // 키보드 상태
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  // ====== 커스텀 App Alert 상태 ======
  const [appAlert, setAppAlert] = useState<AppAlertConfig>({
    visible: false,
    title: '',
    message: '',
    confirmText: '확인',
  });

  const openAlert = (cfg: Omit<AppAlertConfig, 'visible'>) => {
    setAppAlert({ visible: true, ...cfg });
  };
  const closeAlert = () => setAppAlert(prev => ({ ...prev, visible: false }));

  // ====== 모델 다운로드/상태 ======
  const [modelState, setModelState] = useState<ModelState>('checking');
  const [modelPath, setModelPath] = useState<string>('');
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [downloadModalVisible, setDownloadModalVisible] = useState<boolean>(false);
  const [downloadJobId, setDownloadJobId] = useState<number | null>(null);

  const quickActions = [
    { icon: 'camera-alt', title: '동물 사진 분석', description: '반려동물 사진을 업로드하여 건강 상태를 분석해보세요' },
    { icon: 'pets', title: '펫 헬스케어', description: '사료, 증상, 생활습관 등 무엇이든 물어보세요' },
  ];

  // 공통
  const scrollToEnd = (animated = true) => {
    requestAnimationFrame(() => {
      flatListRef.current?.scrollToEnd({ animated });
    });
  };

  useEffect(() => {
    if (messages.length > 0) setTimeout(() => scrollToEnd(true), 80);
  }, [messages]);

  // 키보드 이벤트
  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = () => {
      setIsKeyboardVisible(true);
      setTimeout(() => scrollToEnd(true), 60);
    };
    const onHide = () => {
      setIsKeyboardVisible(false);
      setTimeout(() => scrollToEnd(false), 60);
    };

    const showSub = Keyboard.addListener(showEvt, onShow);
    const hideSub = Keyboard.addListener(hideEvt, onHide);
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  // 프로필 이름
  useEffect(() => {
    const fetchName = async () => {
      try {
        const savedName = await AsyncStorage.getItem('username');
        if (savedName) setUsername(savedName);

        const res = await getUserProfile();
        const name = res.data?.username || res.data?.nickname || res.data?.userName;
        if (name) {
          setUsername(name);
          await AsyncStorage.setItem('username', name);
        }
      } catch (e) {
        console.error('사용자 정보 불러오기 실패:', e);
      }
    };
    fetchName();
  }, []);

  // 뒤로 가기/사이드바
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

  // 스피너 애니메이션
  useEffect(() => {
    if (isDiagnosing) {
      const loop = Animated.loop(Animated.timing(spinnerAnimation, { toValue: 1, duration: 1000, useNativeDriver: true }));
      loop.start();
      return () => { loop.stop(); spinnerAnimation.setValue(0); };
    }
  }, [isDiagnosing, spinnerAnimation]);

  // 스레드 목록
  useEffect(() => {
    const fetchThreads = async () => {
      try {
        const res = await getThreads();
        setThreads(res.data);
      } catch (e) {
        console.error('채팅 목록 불러오기 실패:', e);
      }
    };
    fetchThreads();
  }, []);

  // 타이핑 커서
  useEffect(() => {
    if (isTyping && !isDiagnosing) {
      const blink = Animated.loop(
        Animated.sequence([
          Animated.timing(cursorAnimation, { toValue: 0, duration: 450, useNativeDriver: true }),
          Animated.timing(cursorAnimation, { toValue: 1, duration: 450, useNativeDriver: true }),
        ])
      );
      blink.start();
      return () => { blink.stop(); cursorAnimation.setValue(1); };
    }
  }, [isTyping, isDiagnosing, cursorAnimation]);

  // ====== 모델 준비 체크 (진입 시) ======
  useEffect(() => {
    const check = async () => {
      try {
        const dest = `${RNFS.DocumentDirectoryPath}/${MODEL_FILE_NAME}`;
        setModelPath(dest);
        const exists = await RNFS.exists(dest);
        if (exists) {
          setModelState('ready');
        } else {
          setModelState('idle');
          // 사용자에게 다운로드 여부 안내
          openAlert({
            title: '온디바이스 모델 다운로드',
            message: '로컬에서 동작하는 AI 모델(약 700MB)을 다운로드합니다.\n데이터 사용량이 크니 Wi‑Fi를 권장해요.',
            cancelText: '나중에',
            confirmText: '다운로드',
            onConfirm: () => { closeAlert(); startDownload(); },
            onCancel: () => closeAlert(),
          });
        }
      } catch (e) {
        console.error(e);
        setModelState('error');
        openAlert({
          title: '오류',
          message: '모델 상태 확인에 실패했습니다. 네트워크 상태를 확인해 주세요.',
          confirmText: '확인',
        });
      }
    };
    check();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ====== 모델 다운로드 / 취소 ======
  const startDownload = async () => {
    if (!modelPath) return;
    try {
      setDownloadProgress(0);
      setModelState('downloading');
      setDownloadModalVisible(true);

      const task = RNFS.downloadFile({
        fromUrl: MODEL_URL,
        toFile: modelPath,
        progress: (data) => {
          const total = data.contentLength || 0;
          const written = data.bytesWritten || 0;
          const p = total > 0 ? written / total : 0;
          setDownloadProgress(p);
        },
        progressDivider: 5,
      });
      setDownloadJobId(task.jobId);
      await task.promise;
      setDownloadModalVisible(false);
      setModelState('ready');
      setDownloadJobId(null);
      openAlert({
        title: '완료',
        message: '온디바이스 모델이 준비됐습니다.',
        confirmText: '확인',
      });
    } catch (e) {
      console.error('다운로드 실패:', e);
      setDownloadModalVisible(false);
      setModelState('idle');
      setDownloadJobId(null);
      openAlert({
        title: '다운로드 실패',
        message: '네트워크 상태를 확인한 후 다시 시도해 주세요.',
        confirmText: '확인',
      });
    }
  };

  const cancelDownload = () => {
    if (downloadJobId) {
      RNFS.stopDownload(downloadJobId);
    }
    setDownloadModalVisible(false);
    setModelState('idle');
  };

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
      openAlert({ title: '오류', message: '채팅을 열 수 없습니다.', confirmText: '확인' });
    }
    toggleSidebar();
  };

  const startNewChat = async () => {
    setMessages([]);
    setChatStartTime(null);
    toggleSidebar();
    try {
      const response = await createThread('새 채팅');
      const createdThread = response.data;
      setThreadId(createdThread.thread_id);
      setThreads((prev) => [...prev, createdThread]);
      setSelectedThreadId(createdThread.thread_id);
    } catch (e) {
      console.error('새 채팅 생성 실패:', e);
      openAlert({ title: '오류', message: '새 채팅을 시작할 수 없습니다.', confirmText: '확인' });
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

  // ===== 권한/이미지 =====
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
      const ok = granted === PermissionsAndroid.RESULTS.GRANTED;
      if (!ok) {
        openAlert({ title: '권한 필요', message: '카메라 사용을 위해 권한이 필요합니다.', confirmText: '확인' });
      }
      return ok;
    } catch (e) {
      console.warn(e);
      openAlert({ title: '오류', message: '권한 요청 중 문제가 발생했습니다.', confirmText: '확인' });
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
    if (!ok) return;
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
            const updated = await getThreads();
            setThreads(updated.data);
          } catch (e) {
            console.error('스레드 목록 갱신 실패:', e);
          }
        }
      });
    }, 1200);
  };

  // ▼ (임시) 규칙 기반 응답 — 실제 온디바이스 모델 연동 시 이 함수를 LLM 호출로 대체
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
                    <TouchableOpacity
                      style={{ flex: 1, paddingVertical: 10, paddingHorizontal: 20 }}
                      onPress={() => selectThread(thread)}
                    >
                      <Text style={{ color: theme.text }}>{thread.thread_title}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={{ paddingHorizontal: 16, paddingVertical: 10 }}
                      onPress={() => {
                        // 옵션은 RNAlert로 유지(다중 버튼)
                        RNAlert.alert(
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
                                  const updated = await getThreads();
                                  setThreads(updated.data);
                                  if (selectedThreadId === thread.thread_id) {
                                    setMessages([]);
                                    setThreadId(null);
                                    setSelectedThreadId(null);
                                  }
                                } catch (e) {
                                  console.error('삭제 실패:', e);
                                  openAlert({ title: '오류', message: '채팅을 삭제할 수 없습니다.', confirmText: '확인' });
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

            <View style={[styles.sidebarBottom, { borderTopColor: theme.border }]} >
              <TouchableOpacity
                style={[styles.logoutButton, { backgroundColor: theme.danger, borderColor: theme.border }]}
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
            <MaterialIcons name="logout" size={32} color={theme.danger} />
            <Text style={[styles.logoutModalTitle, { color: theme.danger }]}>로그아웃</Text>
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
              style={[styles.logoutConfirmButton, { backgroundColor: theme.danger }]}
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

  // 커스텀 App Alert
  const renderAppAlert = () => (
    <Modal visible={appAlert.visible} transparent animationType="fade" onRequestClose={closeAlert}>
      <View style={styles.modalOverlay}>
        <View style={[styles.appAlert, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.appAlertTitle, { color: theme.text }]}>{appAlert.title}</Text>
          <Text style={[styles.appAlertMessage, { color: theme.subtext }]}>{appAlert.message}</Text>
          <View style={styles.appAlertButtons}>
            {appAlert.cancelText ? (
              <TouchableOpacity
                style={[styles.appAlertButton, { backgroundColor: darkMode ? '#2B2F33' : '#F3F5F7', borderColor: theme.border }]}
                onPress={() => { closeAlert(); appAlert.onCancel?.(); }}
              >
                <Text style={[styles.appAlertButtonText, { color: theme.subtext }]}>{appAlert.cancelText}</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              style={[styles.appAlertButtonPrimary, { backgroundColor: theme.primary }]}
              onPress={() => { closeAlert(); appAlert.onConfirm?.(); }}
            >
              <Text style={styles.appAlertButtonPrimaryText}>{appAlert.confirmText || '확인'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // 모델 다운로드 진행률 모달
  const renderDownloadModal = () => (
    <Modal visible={downloadModalVisible} transparent animationType="fade" onRequestClose={cancelDownload}>
      <View style={styles.modalOverlay}>
        <View style={[styles.downloadModal, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <MaterialIcons name="cloud-download" size={22} color={theme.primary} style={{ marginRight: 8 }} />
            <Text style={[styles.modalTitle, { color: theme.text }]}>모델 다운로드 중...</Text>
          </View>
          <Text style={[styles.modalSubtitle, { color: theme.subtext, marginBottom: 12 }]}>
            {Math.round(downloadProgress * 100)}%
          </Text>
          <View style={[styles.progressBar, { backgroundColor: darkMode ? '#30353a' : '#EEF1F4', borderColor: theme.border }]}>
            <View style={[styles.progressFill, { width: `${Math.round(downloadProgress * 100)}%`, backgroundColor: theme.primary }]} />
          </View>

          <View style={{ flexDirection: 'row', marginTop: 16 }}>
            <TouchableOpacity
              style={[styles.modalCancelButton, { backgroundColor: darkMode ? '#2B2F33' : '#F3F5F7', borderColor: theme.border, flex: 1 }]}
              onPress={cancelDownload}
            >
              <Text style={[styles.modalCancelText, { color: theme.subtext }]}>취소</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // 이름 변경 모달
  const renderRenameModal = () => (
    <Modal visible={renameModalVisible} transparent animationType="fade" onRequestClose={() => setRenameModalVisible(false)}>
      <View style={styles.modalOverlay}>
        <View style={[styles.renameModal, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.modalTitle, { color: theme.text }]}>채팅 이름 변경</Text>
          <TextInput
            style={[styles.renameInput, { color: theme.text, borderColor: theme.border, backgroundColor: darkMode ? '#1F2426' : '#F6F8FA' }]}
            placeholder="새 제목 입력"
            placeholderTextColor={theme.subtext}
            value={newTitle}
            onChangeText={setNewTitle}
          />
          <View style={{ flexDirection: 'row', marginTop: 12 }}>
            <TouchableOpacity
              style={[styles.modalCancelButton, { backgroundColor: darkMode ? '#2B2F33' : '#F3F5F7', borderColor: theme.border, flex: 1 }]}
              onPress={() => setRenameModalVisible(false)}
            >
              <Text style={[styles.modalCancelText, { color: theme.subtext }]}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.appAlertButtonPrimary, { backgroundColor: theme.primary, flex: 1, marginLeft: 8 }]}
              onPress={async () => {
                if (!selectedThreadId || !newTitle.trim()) return;
                try {
                  await updateThread(selectedThreadId, newTitle.trim()); // <- 프로젝트 API 시그니처에 맞게 필요 시 조정
                  const updated = await getThreads();
                  setThreads(updated.data);
                  setRenameModalVisible(false);
                } catch (e) {
                  console.error(e);
                  openAlert({ title: '오류', message: '이름을 변경할 수 없습니다.', confirmText: '확인' });
                }
              }}
            >
              <Text style={styles.appAlertButtonPrimaryText}>저장</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // 헤더 고정, 본문+입력만 KAV
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={['top', 'left', 'right']}>
      <StatusBar barStyle={darkMode ? 'light-content' : 'dark-content'} backgroundColor={theme.headerBg} />

      {renderSidebar()}
      {renderImagePickerModal()}
      {renderLogoutModal()}
      {renderAppAlert()}
      {renderDownloadModal()}
      {renderRenameModal()}

      {/* 헤더 */}
      <View
        style={[
          styles.header,
          { backgroundColor: theme.headerBg, borderBottomColor: theme.border },
        ]}
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
            <Text style={[styles.teamText, { color: theme.subtext }]}>{username ? `${username}님` : ''}</Text>
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

      {/* 본문+입력창 */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior="padding"              // ← iOS/Android 모두 padding으로 통일 (떠 보이는 문제 방지)
        keyboardVerticalOffset={0}
      >
        <View style={{ flex: 1 }}>
          {messages.length === 0 ? (
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={[
                styles.welcomeContent,
                { paddingBottom: 40 + (insets.bottom || 0) } // ← 고정값으로 변경
              ]}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.logoSection}>
                <View
                  style={[
                    styles.logoContainer,
                    { backgroundColor: darkMode ? '#1F2426' : '#F6F8FA', borderColor: theme.border },
                  ]}
                >
                  <Image
                    source={chatTheme ? require('../logo/cat.png') : require('../logo/dog.png')}
                    style={styles.logoImage}
                    resizeMode="contain"
                  />
                </View>
                <Text style={[styles.welcomeTitle, { color: theme.text }]}>무엇을 도와드릴까요?</Text>

                {/* 모델 상태 배지/버튼 */}
                {modelState === 'ready' ? (
                  <View style={[styles.readyBadge, { backgroundColor: theme.chipBg }]}>
                    <MaterialIcons name="check-circle" size={16} color={theme.chipText} style={{ marginRight: 6 }} />
                    <Text style={{ color: theme.chipText, fontWeight: '700' }}>온디바이스 모델 준비 완료</Text>
                  </View>
                ) : modelState === 'downloading' ? (
                  <View style={[styles.downloadCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                      <MaterialIcons name="cloud-download" size={20} color={theme.primary} style={{ marginRight: 8 }} />
                      <Text style={{ color: theme.text, fontWeight: '700' }}>다운로드 중...</Text>
                    </View>
                    <View style={[styles.progressBar, { backgroundColor: darkMode ? '#30353a' : '#EEF1F4', borderColor: theme.border }]}>
                      <View style={[styles.progressFill, { width: `${Math.round(downloadProgress * 100)}%`, backgroundColor: theme.primary }]} />
                    </View>
                    <Text style={{ color: theme.subtext, marginTop: 6 }}>{Math.round(downloadProgress * 100)}%</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[styles.downloadCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
                    onPress={startDownload}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <MaterialIcons name="cloud-download" size={20} color={theme.primary} style={{ marginRight: 8 }} />
                      <Text style={{ color: theme.text, fontWeight: '700' }}>온디바이스 모델 다운로드</Text>
                    </View>
                    <Text style={{ color: theme.subtext, marginTop: 6 }}>약 700MB • Wi‑Fi 권장</Text>
                  </TouchableOpacity>
                )}
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
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={({ item, index }) => renderMessage({ item, index })}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{
                padding: 15,
                paddingBottom: INPUT_BAR_MIN_HEIGHT + 8 + (insets.bottom || 0), // ← 고정값으로 변경
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
              showsVerticalScrollIndicator={false}
              onContentSizeChange={() => scrollToEnd(false)}
              onLayout={() => scrollToEnd(false)}
            />
          )}
        </View>

        {/* 입력창 */}
        <View
          style={[
            styles.inputContainer,
            {
              backgroundColor: theme.surface,
              borderTopColor: theme.border,
              paddingBottom: (insets.bottom || 0), // ← 항상 세이프에어리어만 반영
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
              onFocus={() => setTimeout(() => scrollToEnd(true), 120)}
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
      </KeyboardAvoidingView>
    </SafeAreaView>
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

  welcomeContent: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 40 },
  logoSection: { alignItems: 'center', marginBottom: 18 },
  logoContainer: { width: 84, height: 84, borderRadius: 42, justifyContent: 'center', alignItems: 'center', marginBottom: 12, borderWidth: 1 },
  logoImage: { width: 60, height: 60 },
  welcomeTitle: { fontSize: 22, fontWeight: '800', marginBottom: 8 },

  // 모델 상태 카드/배지/프로그레스
  readyBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 999, marginTop: 6 },
  downloadCard: {
    marginTop: 8,
    width: '100%',
    maxWidth: 340,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
  },
  progressBar: {
    width: 280,
    height: 10,
    borderRadius: 6,
    overflow: 'hidden',
    borderWidth: 1,
    alignSelf: 'center',
  },
  progressFill: {
    height: '100%',
    borderRadius: 6,
  },

  quickActionsContainer: { width: '100%', gap: 12, paddingHorizontal: 16, marginTop: 14 },
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

  userMessageContainer: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'flex-end', marginVertical: 4, paddingHorizontal: 10 },
  botMessageContainer: { flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'flex-start', marginVertical: 4, paddingHorizontal: 0 },
  botAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 6, marginTop: 2 },
  userAvatar: { width: 35, height: 35, borderRadius: 17.5, marginLeft: 6, marginTop: 2 },
  messageBubble: { paddingVertical: 10, paddingHorizontal: 13, borderRadius: 18, maxWidth: '78%', borderWidth: 1 },
  messageText: { fontSize: 15, lineHeight: 22 },
  messageImage: { width: 210, height: 210, borderRadius: 12, marginBottom: 6 },

  chatStartTimeContainer: { alignItems: 'center', marginVertical: 18 },
  chatStartTimeText: { fontSize: 12, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  dateSeparatorContainer: { alignItems: 'center', marginVertical: 14 },
  dateSeparatorText: { fontSize: 12, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  botTimeContainer: { marginLeft: 55, marginTop: 2, marginBottom: 8 },
  botTimeText: { fontSize: 11 },

  diagnosingContainer: { flexDirection: 'row', alignItems: 'center', padding: 5 },
  loadingSpinner: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderTopColor: 'transparent', marginRight: 8 },
  diagnosingText: { fontSize: 14 },
  typingContainer: { flexDirection: 'row', alignItems: 'flex-end', flexWrap: 'wrap' },
  typingCursor: { width: 2, height: 18, marginLeft: 3, opacity: 1 },

  inputContainer: {
    borderTopWidth: 1,
    paddingHorizontal: 15,
    paddingTop: 8,
  },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', borderRadius: 22, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1 },
  attachButton: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center', marginRight: 6 },
  input: { flex: 1, fontSize: 16, maxHeight: 120, paddingVertical: Platform.OS === 'android' ? 10 : 8, textAlignVertical: 'top' },
  sendButton: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginLeft: 8 },

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
  modalSubtitle: { fontSize: 14, marginBottom: 12, textAlign: 'center' },

  // ✅ 누락되었던 이미지 피커 옵션 스타일들 복원
  imagePickerOptions: { gap: 10, marginBottom: 18, width: '100%' },
  imagePickerOption: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 1 },
  optionIconContainer: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  optionContent: { flex: 1 },
  optionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  optionDescription: { fontSize: 13 },

  // 이 버튼/텍스트도 일부 모달에서 재사용
  modalCancelButton: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8, borderWidth: 1, alignItems: 'center' },
  modalCancelText: { fontSize: 16, fontWeight: '600' },

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

  // 커스텀 App Alert
  appAlert: {
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 340,
    borderWidth: 1,
  },
  appAlertTitle: { fontSize: 18, fontWeight: '800', marginBottom: 8, textAlign: 'center' },
  appAlertMessage: { fontSize: 14, lineHeight: 20, textAlign: 'center' },
  appAlertButtons: { flexDirection: 'row', marginTop: 14 },
  appAlertButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
  },
  appAlertButtonText: { fontSize: 15, fontWeight: '700' },
  appAlertButtonPrimary: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginLeft: 8,
  },
  appAlertButtonPrimaryText: { fontSize: 15, fontWeight: '800', color: '#fff' },

  // 다운로드 모달
  downloadModal: {
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 360,
    borderWidth: 1,
  },

  // 이름 변경 모달
  renameModal: {
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 360,
    borderWidth: 1,
  },
  renameInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'android' ? 10 : 8,
    fontSize: 15,
    marginTop: 10,
  },
});

export default ChatBotScreen;
