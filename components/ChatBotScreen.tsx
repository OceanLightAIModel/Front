// ChatBotScreen.tsx  — Q4(약 870MB) 안전검증/초기화 강화 버전
import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Platform, StatusBar,
  Image, ScrollView, Modal, Animated, BackHandler, Keyboard, FlatList, Alert as RNAlert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { createThread, sendMessage, getThreads, getMessages, updateThread, deleteThread, getUserProfile } from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';

// ===== 온디바이스 모델 파일/URL =====
const MODEL_FILE_NAME = 'kogpt-q4_k_m.gguf'; // 반드시 S3 객체 키와 동일해야 함(대소문자 포함)
const MODEL_SIGNED_URL_API = 'http://15.164.104.195:8000/model/url'; // 순수 URL 문자열

// Q4 ≈ 870MB
const MODEL_SIZE_BYTES = 900 * 1024 * 1024;
const MIN_VALID_SIZE_BYTES = 800 * 1024 * 1024; // 800MB 미만이면 손상 처리

const STOP_WORDS: readonly string[] = [
  '</s>', '<|end|>', '<|eot_id|>', '<|end_of_text|>', '<|im_end|>', '<|EOT|>', '<|end_of_turn|>', '<|endoftext|>',
];

type Message = { id: string; text: string; sender: 'user'|'bot'; timestamp: Date; };
type ModelState = 'checking'|'idle'|'downloading'|'ready'|'error';
type AppAlertConfig = { visible: boolean; title: string; message: string; confirmText?: string; cancelText?: string; onConfirm?:()=>void; onCancel?:()=>void; };

interface ChatBotScreenProps { navigation?: any; chatTheme?: boolean; darkMode?: boolean; }

const PALETTE = {
  light: { bg:'#F6F8FA', surface:'#FFFFFF', border:'#E6EAEE', text:'#1F2937', subtext:'#6B7280', primary:'#0080ff', primaryPressed:'#0073e6',
    bubbleUserText:'#FFFFFF', bubbleBot:'#FFFFFF', chipBg:'#EFF6F3', chipText:'#0080ff', spinner:'#0080ff', cursor:'#0080ff', headerBg:'#FFFFFF', danger:'#dc3545' },
  dark:  { bg:'#17191C', surface:'#23262A', border:'#2E3136', text:'#E5E7EB', subtext:'#9CA3AF', primary:'#0080ff', primaryPressed:'#0073e6',
    bubbleUserText:'#FFFFFF', bubbleBot:'#23262A', chipBg:'#1F2426', chipText:'#A7F3D0', spinner:'#0080ff', cursor:'#0080ff', headerBg:'#2B2F33', danger:'#ff6b6b' },
};

const INPUT_BAR_MIN_HEIGHT = 64;

const ChatBotScreen: React.FC<ChatBotScreenProps> = ({ navigation, chatTheme, darkMode }) => {
  const insets = useSafeAreaInsets();
  const theme = useMemo(() => (darkMode ? PALETTE.dark : PALETTE.light), [darkMode]);

  const [threadId, setThreadId] = useState<number|null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [typingText, setTypingText] = useState('');
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [chatStartTime, setChatStartTime] = useState<Date|null>(null);
  const [username, setUsername] = useState<string>('');
  const [threads, setThreads] = useState<Array<{ thread_id: number; thread_title: string }>>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<number|null>(null);
  const [appAlert, setAppAlert] = useState<AppAlertConfig>({ visible:false, title:'', message:'', confirmText:'확인' });

  const flatListRef = useRef<FlatList<Message>>(null);
  const sidebarAnimation = useRef(new Animated.Value(-300)).current;
  const spinnerAnimation = useRef(new Animated.Value(0)).current;
  const cursorAnimation = useRef(new Animated.Value(1)).current;

  // 모델 상태
  const [modelState, setModelState] = useState<ModelState>('checking');
  const [modelPath, setModelPath] = useState<string>('');
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [downloadModalVisible, setDownloadModalVisible] = useState<boolean>(false);
  const [downloadJobId, setDownloadJobId] = useState<number|null>(null);

  // Android 키보드
  const [androidKeyboardHeight, setAndroidKeyboardHeight] = useState(0);

  // llama.rn 컨텍스트
  const llamaRef = useRef<any|null>(null);
  const [llamaReady, setLlamaReady] = useState(false);
  const initInProgressRef = useRef(false);

  const openAlert = (cfg: Omit<AppAlertConfig,'visible'>) => setAppAlert({ visible:true, ...cfg });
  const closeAlert = () => setAppAlert((p)=>({ ...p, visible:false }));

  const quickActions = [{ icon:'pets', title:'펫 헬스케어', description:'사료, 증상, 생활습관 등 무엇이든 물어보세요' }];

  const scrollToEnd = (animated = true) => { requestAnimationFrame(()=>flatListRef.current?.scrollToEnd({ animated })); };
  useEffect(()=>{ if (messages.length>0) setTimeout(()=>scrollToEnd(true), 80); }, [messages]);

  // Android 키보드
  useEffect(()=>{
    if (Platform.OS!=='android') return;
    const onShow = (e:any) => { const h = e?.endCoordinates?.height ?? 0; setAndroidKeyboardHeight(h); setTimeout(()=>scrollToEnd(true), 60); };
    const onHide = () => { setAndroidKeyboardHeight(0); setTimeout(()=>scrollToEnd(false), 60); };
    const showSub = Keyboard.addListener('keyboardDidShow', onShow);
    const hideSub = Keyboard.addListener('keyboardDidHide', onHide);
    return ()=>{ showSub.remove(); hideSub.remove(); };
  }, []);

  // 프로필
  useEffect(()=>{
    (async()=>{
      try {
        const savedName = await AsyncStorage.getItem('username'); if (savedName) setUsername(savedName);
        const res = await getUserProfile(); const name = res.data?.username || res.data?.nickname || res.data?.userName;
        if (name) { setUsername(name); await AsyncStorage.setItem('username', name); }
      } catch(e){ console.error('사용자 정보 불러오기 실패:', e); }
    })();
  }, []);

  // 뒤로가기/사이드바
  useEffect(()=>{
    const backAction = () => { if (sidebarVisible){ toggleSidebar(); return true; } if (navigation?.goBack) navigation.goBack(); return true; };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return ()=> backHandler.remove();
  }, [sidebarVisible, navigation]);

  // 스피너
  useEffect(()=>{
    if (!isDiagnosing) return;
    const loop = Animated.loop(Animated.timing(spinnerAnimation, { toValue:1, duration:1000, useNativeDriver:true }));
    loop.start();
    return ()=>{ loop.stop(); spinnerAnimation.setValue(0); };
  }, [isDiagnosing, spinnerAnimation]);

  // 스레드
  useEffect(()=>{
    (async()=>{ try{ const res = await getThreads(); setThreads(res.data); } catch(e){ console.error('채팅 목록 불러오기 실패:', e);} })();
  }, []);

  // 커서
  useEffect(()=>{
    if (isTyping && !isDiagnosing) {
      const blink = Animated.loop(Animated.sequence([
        Animated.timing(cursorAnimation,{ toValue:0, duration:450, useNativeDriver:true }),
        Animated.timing(cursorAnimation,{ toValue:1, duration:450, useNativeDriver:true }),
      ]));
      blink.start();
      return ()=>{ blink.stop(); cursorAnimation.setValue(1); };
    }
  }, [isTyping, isDiagnosing, cursorAnimation]);

  // ===== 유틸: HEAD 체크 (gzip 방지 헤더 포함) =====
  async function headCheck(url: string) {
    try {
      const res = await fetch(url, { method:'HEAD', headers: { 'Accept-Encoding':'identity' } });
      const lenStr = res.headers.get('content-length');
      const len = lenStr ? Number(lenStr) : null;
      return { ok: res.ok, status: res.status, length: len };
    } catch {
      return { ok:false, status:0, length:null };
    }
  }

  // ===== 모델 검증: 용량 + GGUF 매직 =====
  async function hasGgufMagic(path: string): Promise<boolean> {
    try {
      // RNFS.read: (path, length, position, encoding)
      const s = await RNFS.read(path, 4, 0, 'ascii'); // 첫 4바이트
      return s === 'GGUF';
    } catch (e) {
      console.warn('GGUF 매직 읽기 실패:', e);
      return false;
    }
  }

  async function verifyModelFile(dest: string, expectedLen?: number | null) {
    try {
      const stat = await RNFS.stat(dest);
      const size = Number(stat?.size || 0);
      if (size < MIN_VALID_SIZE_BYTES) {
        try { await RNFS.unlink(dest); } catch {}
        console.warn(`모델 파일 크기 부족: ${size}B`);
        return false;
      }
      if (typeof expectedLen === 'number' && expectedLen > 0 && size !== expectedLen) {
        console.warn(`크기 불일치: head=${expectedLen}, file=${size}`);
        return false;
      }
      const magicOk = await hasGgufMagic(dest);
      if (!magicOk) {
        console.warn('GGUF 매직 불일치 (gzip/HTML/손상 가능)');
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  // ===== 저장공간 체크 =====
  async function ensureSpaceAndSkipIfExists(dest: string) {
    const exists = await RNFS.exists(dest);
    if (exists) return { ok: true, reason: 'exists' as const };
    const info = await RNFS.getFSInfo();
    if (!info || typeof info.freeSpace !== 'number') return { ok:true, reason:'unknown' as const };
    const required = MODEL_SIZE_BYTES * 2;
    if (info.freeSpace < required) return { ok:false, reason:'no-space' as const, free: info.freeSpace, required };
    return { ok:true, reason:'enough-space' as const };
  }

  // ===== 서명 URL 받기 =====
  async function fetchSignedModelUrl(): Promise<string> {
    const res = await fetch(MODEL_SIGNED_URL_API, { method:'GET', headers:{ Accept:'application/json' } });
    if (!res.ok) throw new Error('서명 URL 발급 실패');
    const data = await res.json();
    if (!data?.url) throw new Error('서명 URL 응답에 url 필드 없음');
    return data.url; // https://.../kogpt-q4_k_m.gguf?...
  }

  // ===== 초기 레거시 파일 정리 (Q3 파일 남아 있을 수 있음) =====
  async function cleanupLegacyFiles() {
    try {
      const dir = RNFS.DocumentDirectoryPath;
      const list = await RNFS.readDir(dir);
      const legacy = list.filter(x => x.name.toLowerCase().includes('kogpt') && x.name.toLowerCase().endsWith('.gguf') && x.name !== MODEL_FILE_NAME);
      for (const f of legacy) {
        try { await RNFS.unlink(f.path); } catch {}
      }
    } catch (e) { console.warn('레거시 파일 정리 실패:', e); }
  }

  // ===== 모델 파일 존재/다운로드 안내 =====
  useEffect(()=>{
    (async()=>{
      try {
        await cleanupLegacyFiles();

        const dest = `${RNFS.DocumentDirectoryPath}/${MODEL_FILE_NAME}`;
        setModelPath(dest);
        const exists = await RNFS.exists(dest);
        if (exists) {
          const ok = await verifyModelFile(dest, null);
          setModelState(ok ? 'ready' : 'idle');
          if (!ok) {
            openAlert({ title:'모델 재다운로드 필요', message:'이전 다운로드 파일이 손상되었거나 비정상입니다. 다시 다운로드해 주세요.', confirmText:'확인' });
          }
        } else {
          setModelState('idle');
          openAlert({
            title: '온디바이스 모델 다운로드',
            message: '로컬에서 동작하는 AI 모델(약 870MB)을 다운로드합니다.\n데이터 사용량이 크니 Wi‑Fi를 권장해요.',
            cancelText: '나중에',
            confirmText: '다운로드',
            onConfirm: ()=>{ closeAlert(); startDownload(); },
            onCancel: ()=> closeAlert(),
          });
        }
      } catch (e) {
        console.error(e);
        setModelState('error');
        openAlert({ title:'오류', message:'모델 상태 확인에 실패했습니다. 네트워크 상태를 확인해 주세요.', confirmText:'확인' });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ===== 모델 다운로드 / 취소 =====
  const startDownload = async () => {
    if (!modelPath) return;
    try {
      const check = await ensureSpaceAndSkipIfExists(modelPath);
      if (!check.ok) {
        openAlert({ title:'저장공간 부족', message:'온디바이스 모델을 받기 위해 충분한 저장공간이 필요합니다.\n불필요한 파일을 지운 뒤 다시 시도해 주세요.', confirmText:'확인' });
        return;
      }
      if (check.reason === 'exists') {
        const ok = await verifyModelFile(modelPath, null);
        setModelState(ok ? 'ready' : 'idle');
        if (!ok) openAlert({ title:'모델 재다운로드 필요', message:'이전 다운로드 파일이 손상되었습니다. 다시 다운로드해 주세요.', confirmText:'확인' });
        return;
      }

      const signedUrl = await fetchSignedModelUrl();
      const head = await headCheck(signedUrl);
      if (!head.ok || (head.length !== null && head.length < MIN_VALID_SIZE_BYTES)) {
        openAlert({
          title:'CloudFront 접근 오류',
          message:'모델 파일에 접근할 수 없거나 파일 크기가 비정상입니다.\n• 서명 URL 만료/오입력\n• CloudFront Compress/KeyGroup 설정\n• S3 원본(OAC) 연결 여부를 확인해 주세요.',
          confirmText:'확인',
        });
        return;
      }

      setDownloadProgress(0);
      setModelState('downloading');
      setDownloadModalVisible(true);

      const task = RNFS.downloadFile({
        fromUrl: signedUrl,
        toFile: modelPath,
        headers: { 'Accept-Encoding':'identity' }, // gzip 방지
        progress: (data) => {
          const total = data.contentLength || MODEL_SIZE_BYTES;
          const written = data.bytesWritten || 0;
          const p = total > 0 ? written / total : 0;
          setDownloadProgress(p);
        },
        progressDivider: 10,
      });
      setDownloadJobId(task.jobId);
      await task.promise;

      // 다운로드 후 HEAD 재검증 및 매직 체크
      const head2 = await headCheck(signedUrl);
      const ok = await verifyModelFile(modelPath, head2.length ?? head.length ?? null);
      if (!ok) {
        setDownloadModalVisible(false);
        setModelState('idle');
        setDownloadJobId(null);
        openAlert({
          title:'다운로드 실패',
          message:'파일이 올바르지 않습니다(압축/부분 다운로드/HTML 가능성). 다시 시도해 주세요.',
          confirmText:'확인',
        });
        return;
      }

      setDownloadModalVisible(false);
      setModelState('ready');
      setDownloadJobId(null);
      openAlert({ title:'완료', message:'온디바이스 모델이 준비됐습니다.', confirmText:'확인' });
    } catch (e) {
      console.error('다운로드 실패:', e);
      setDownloadModalVisible(false);
      setModelState('idle');
      setDownloadJobId(null);
      openAlert({ title:'다운로드 실패', message:'네트워크 상태를 확인한 후 다시 시도해 주세요.', confirmText:'확인' });
    }
  };

  const cancelDownload = () => {
    if (downloadJobId) RNFS.stopDownload(downloadJobId);
    setDownloadModalVisible(false);
    setModelState('idle');
  };

  // ===== llama.rn 초기화 (mmap off 백업 포함, Android 보수) =====
  async function initLlamaSafe(localPath: string) {
    if (initInProgressRef.current || llamaRef.current) return;
    initInProgressRef.current = true;
    setLlamaReady(false);

    let mod: any;
    try {
      mod = await import('llama.rn');
    } catch {
      initInProgressRef.current = false;
      openAlert({ title:'로컬 엔진 미설치', message:'llama.rn 모듈을 불러올 수 없습니다. 빌드 설정을 확인해 주세요.', confirmText:'확인' });
      return;
    }

    const { initLlama, loadLlamaModelInfo } = mod;
    const uri = `file://${localPath}`;

    // 사전 헤더 파싱 (여기서도 떨어지면 중단)
    try {
      await loadLlamaModelInfo(uri);
    } catch (e) {
      initInProgressRef.current = false;
      openAlert({
        title:'모델 열기 실패',
        message:'모델 파일을 읽을 수 없습니다.\n• GGUF 매직/버전\n• llama.rn(내부 llama.cpp)와의 호환성을 확인해 주세요.',
        confirmText:'확인',
      });
      return;
    }

    // Android: GPU off + 낮은 n_ctx, mmap on/off 조합
    const presets = Platform.OS === 'android'
      ? [
          { n_ctx:256, n_threads:2, n_gpu_layers:0, use_mlock:false, use_mmap:true  },
          { n_ctx:256, n_threads:2, n_gpu_layers:0, use_mlock:false, use_mmap:false },
          { n_ctx:384, n_threads:3, n_gpu_layers:0, use_mlock:false, use_mmap:false },
          { n_ctx:512, n_threads:4, n_gpu_layers:0, use_mlock:false, use_mmap:false },
        ]
      : [
          { n_ctx:384, n_threads:2, n_gpu_layers:99, use_mlock:false, use_mmap:true },
          { n_ctx:512, n_threads:3, n_gpu_layers:99, use_mlock:false, use_mmap:true },
          { n_ctx:768, n_threads:4, n_gpu_layers:99, use_mlock:false, use_mmap:true },
        ];

    for (const p of presets) {
      try {
        const ctx = await initLlama({ model: uri, ...p });
        llamaRef.current = ctx;
        setLlamaReady(true);
        initInProgressRef.current = false;
        return;
      } catch (e) {
        console.warn('llama init 실패, 다음 프리셋 시도:', p, e);
      }
    }

    setLlamaReady(false);
    initInProgressRef.current = false;
    openAlert({
      title:'모델 초기화 실패',
      message:'메모리 제약 또는 모델 포맷-엔진 호환성 문제로 보입니다.\n• llama.rn(내부 llama.cpp) 최신화\n• Q4_K_M 대신 Q4_0 등 호환폭 넓은 양자화로 재시도\n• 같은 커밋의 llama.cpp로 재양자화(gguf) 권장',
      confirmText:'확인',
    });
  }

  // 모델 준비되면 초기화
  useEffect(()=>{
    (async()=>{
      if (modelState!=='ready' || !modelPath) return;
      try { await initLlamaSafe(modelPath); }
      catch (e:any) {
        console.error(e);
        openAlert({ title:'모델 초기화 실패', message:'모델을 여는 중 오류가 발생했습니다.', confirmText:'확인' });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelState, modelPath]);

  // ===== 사이드바 =====
  const toggleSidebar = () => {
    if (sidebarVisible) {
      Animated.timing(sidebarAnimation,{ toValue:-300, duration:280, useNativeDriver:false }).start(()=> setSidebarVisible(false));
    } else {
      setSidebarVisible(true);
      Animated.timing(sidebarAnimation,{ toValue:0, duration:280, useNativeDriver:false }).start();
    }
  };

  const selectThread = async (thread: { thread_id:number; thread_title:string }) => {
    setSelectedThreadId(thread.thread_id); setThreadId(thread.thread_id); setChatStartTime(null);
    try {
      const res = await getMessages(thread.thread_id);
      setMessages(res.data.map((m:any)=>({ id:String(m.message_id), text:m.content, sender:m.sender_type==='assistant'?'bot':'user', timestamp:new Date(m.created_at) })));
    } catch (e) {
      console.error('메시지 불러오기 실패:', e);
      openAlert({ title:'오류', message:'채팅을 열 수 없습니다.', confirmText:'확인' });
    }
    toggleSidebar();
  };

  const startNewChat = async () => {
    setMessages([]); setChatStartTime(null); toggleSidebar();
    try {
      const response = await createThread('새 채팅');
      const created = response.data;
      setThreadId(created.thread_id);
      setThreads((prev)=>[...prev, created]);
      setSelectedThreadId(created.thread_id);
    } catch (e) {
      console.error('새 채팅 생성 실패:', e);
      openAlert({ title:'오류', message:'새 채팅을 시작할 수 없습니다.', confirmText:'확인' });
    }
  };

  const two = (n:number)=> n.toString().padStart(2,'0');
  const formatChatStartTime = (d:Date)=> `${d.getFullYear()}년 ${d.getMonth()+1}월 ${d.getDate()}일 ${two(d.getHours())}:${two(d.getMinutes())}`;
  const formatMessageTime = (d:Date)=> `${two(d.getHours())}:${two(d.getMinutes())}`;
  const isSameDay = (a:Date,b:Date)=> a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
  const shouldShowDateSeparator = (current:Message, prev:Message|null)=> !!prev && !isSameDay(current.timestamp, prev.timestamp);
  const ensureStartTime = ()=> { if (!chatStartTime) setChatStartTime(new Date()); };

  function buildChatForModel(history: Message[], latestUser: string) {
    const recent = history.slice(-12);
    const msgs:any[] = [{ role:'system', content:'You are a helpful veterinary assistant for pets. Always be careful and suggest vet visit for emergencies. Answer in Korean.' }];
    for (const m of recent) { if (!m.text) continue; msgs.push({ role: m.sender==='user'?'user':'assistant', content: m.text }); }
    msgs.push({ role:'user', content: latestUser });
    return msgs;
  }

  async function askLocalModel(newUserText: string): Promise<string> {
    const ctx = llamaRef.current;
    if (!ctx) throw new Error('LLM not ready');
    let partial = '';
    setIsDiagnosing(true); setIsTyping(true); setTypingText('');
    try {
      const messagesForModel = buildChatForModel(messages, newUserText);
      const res = await ctx.completion(
        { messages: messagesForModel, n_predict:160, stop: STOP_WORDS as string[], temperature:0.7, top_p:0.9 },
        ({ token }:any)=>{ if (partial.length===0) setIsDiagnosing(false); partial += token ?? ''; setTypingText(partial); }
      );
      const finalText = (res?.text || partial || '').trim();
      return finalText;
    } finally {
      setIsTyping(false); setIsDiagnosing(false); setTypingText('');
    }
  }

  const handleSend = async (text?: string) => {
    const messageText = (text ?? input).trim(); if (!messageText) return;
    ensureStartTime();

    const now = new Date();
    const userMsg: Message = { id: Date.now().toString(), text: messageText, sender: 'user', timestamp: now };
    setMessages((prev)=>[...prev, userMsg]);
    setInput(''); setIsDiagnosing(true);

    if (threadId) { try { await sendMessage(threadId, messageText, 'user'); } catch(e){ console.error('메시지 저장 실패:', e); } }

    try {
      if (!(modelState==='ready' && llamaReady)) {
        openAlert({ title:'모델 준비 중', message:'온디바이스 모델이 아직 준비되지 않았습니다. 모델을 다운로드/초기화한 뒤 다시 시도해 주세요.', confirmText:'확인' });
        setIsDiagnosing(false); return;
      }
      const botResponse = await askLocalModel(messageText);
      const botMsg: Message = { id: (Date.now()+1).toString(), text: botResponse, sender: 'bot', timestamp: new Date() };
      setMessages((prev)=>[...prev, botMsg]);

      if (threadId) {
        try { await sendMessage(threadId, botResponse, 'assistant'); const updated = await getThreads(); setThreads(updated.data); }
        catch(e){ console.error('스레드 목록 갱신 실패:', e); }
      }
    } catch (e:any) {
      console.error('LLM 응답 실패:', e);
      openAlert({ title:'오류', message:'로컬 모델 응답에 실패했습니다. 네트워크 또는 메모리 상태 확인 후 다시 시도해 주세요.', confirmText:'확인' });
      setIsDiagnosing(false); setIsTyping(false); setTypingText('');
    }
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const prev = index>0 ? messages[index-1] : null;
    const needDateChip = shouldShowDateSeparator(item, prev);
    return (
      <View>
        {needDateChip && (
          <View style={styles.dateSeparatorContainer}><Text style={styles.dateSeparatorText}>
            {`${item.timestamp.getFullYear()}년 ${item.timestamp.getMonth()+1}월 ${item.timestamp.getDate()}일`}
          </Text></View>
        )}
        {item.sender==='user' ? (
          <View style={styles.userMessageContainer}>
            <View style={[styles.messageBubble,{ backgroundColor: theme.primary, borderBottomRightRadius:6, borderColor:'transparent' }]}>
              <Text style={[styles.messageText,{ color: theme.bubbleUserText }]}>{item.text}</Text>
            </View>
            <Image source={darkMode?require('../logo/user2.png'):require('../logo/user.png')} style={styles.userAvatar} resizeMode="contain" />
          </View>
        ) : (
          <View>
            <View style={styles.botMessageContainer}>
              <Image source={chatTheme?require('../logo/cat.png'):require('../logo/dog.png')} style={styles.botAvatar} resizeMode="contain" />
              <View style={[styles.messageBubble,{ backgroundColor: theme.bubbleBot, borderColor: theme.border, borderBottomLeftRadius:6 }]}>
                <Text style={[styles.messageText,{ color: theme.text }]}>{item.text}</Text>
              </View>
            </View>
            <View style={styles.botTimeContainer}><Text style={[styles.botTimeText,{ color: theme.subtext }]}>{formatMessageTime(item.timestamp)}</Text></View>
          </View>
        )}
      </View>
    );
  };

  const spin = spinnerAnimation.interpolate({ inputRange:[0,1], outputRange:['0deg','360deg'] });
  const renderTypingIndicator = () => (
    <View style={styles.botMessageContainer}>
      <Image source={chatTheme?require('../logo/cat.png'):require('../logo/dog.png')} style={styles.botAvatar} resizeMode="contain" />
      <View style={[styles.messageBubble,{ backgroundColor: theme.bubbleBot, borderColor: theme.border, borderBottomLeftRadius:6 }]}>
        {isDiagnosing ? (
          <View style={styles.diagnosingContainer}>
            <Animated.View style={[styles.loadingSpinner,{ borderColor: theme.spinner, transform:[{ rotate: spin }] }]} />
            <Text style={[styles.diagnosingText,{ color: theme.subtext }]}>생각 중…</Text>
          </View>
        ) : (
          <View style={styles.typingContainer}>
            <Text style={[styles.messageText,{ color: theme.text }]}>{typingText}</Text>
            <Animated.View style={[styles.typingCursor,{ backgroundColor: theme.cursor, opacity: cursorAnimation }]} />
          </View>
        )}
      </View>
    </View>
  );

  const renderSidebar = () => (
    <Modal visible={sidebarVisible} transparent animationType="none" onRequestClose={toggleSidebar}>
      <View style={styles.sidebarOverlay}>
        <TouchableOpacity style={styles.sidebarBackdrop} onPress={toggleSidebar} activeOpacity={1} />
        <Animated.View style={[styles.sidebar,{ left: sidebarAnimation, backgroundColor: theme.surface, borderRightColor: theme.border }]}>
          <View style={styles.sidebarContent}>
            <View style={[styles.sidebarTopHeader,{ backgroundColor: theme.headerBg, borderBottomColor: theme.border }]}>
              <View style={[styles.searchInputContainer,{ backgroundColor: darkMode?'#3A3F44':'#F3F5F7', borderColor: theme.border }]}>
                <MaterialIcons name="search" size={16} color={theme.subtext} style={styles.searchIcon} />
                <TextInput style={[styles.searchInput,{ color: theme.text }]} placeholder="채팅 검색" placeholderTextColor={theme.subtext} blurOnSubmit={false} returnKeyType="search" removeClippedSubviews={false}/>
              </View>
              <TouchableOpacity onPress={toggleSidebar} style={styles.closeButton}><MaterialIcons name="close" size={20} color={theme.subtext}/></TouchableOpacity>
            </View>

            <ScrollView style={styles.sidebarScrollView} contentContainerStyle={styles.sidebarScrollContent}>
              <TouchableOpacity style={styles.newChatButton} onPress={startNewChat}>
                <MaterialIcons name="chat" size={18} color={theme.subtext} style={{ marginRight: 12 }} />
                <Text style={[styles.newChatText,{ color: theme.text }]}>새 채팅</Text>
              </TouchableOpacity>

              <View style={[styles.divider,{ backgroundColor: theme.border }]} />

              <View style={styles.sidebarSection}>
                <Text style={[styles.sectionTitle,{ color: theme.subtext }]}>내 채팅</Text>
                {threads.map((thread)=>(
                  <View key={thread.thread_id} style={{ flexDirection:'row', alignItems:'center' }}>
                    <TouchableOpacity style={{ flex:1, paddingVertical:10, paddingHorizontal:20 }} onPress={()=>selectThread(thread)}>
                      <Text style={{ color: theme.text }}>{thread.thread_title}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={{ paddingHorizontal:16, paddingVertical:10 }} onPress={()=>{
                      RNAlert.alert('채팅 옵션','',[
                        { text:'이름 변경', onPress:()=>{ setNewTitle(thread.thread_title); setSelectedThreadId(thread.thread_id); setRenameModalVisible(true);} },
                        { text:'삭제', style:'destructive', onPress:async()=>{ try{ await deleteThread(thread.thread_id); const updated = await getThreads(); setThreads(updated.data); if (selectedThreadId===thread.thread_id){ setMessages([]); setThreadId(null); setSelectedThreadId(null); } } catch(e){ console.error('삭제 실패:', e); openAlert({ title:'오류', message:'채팅을 삭제할 수 없습니다.', confirmText:'확인' }); } } },
                        { text:'취소', style:'cancel' },
                      ],{ cancelable:true });
                    }}>
                      <MaterialIcons name="more-horiz" size={20} color={theme.subtext}/>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </ScrollView>

            <View style={[styles.sidebarBottom,{ borderTopColor: theme.border }]}>
              <TouchableOpacity style={[styles.logoutButton,{ backgroundColor: theme.danger, borderColor: theme.border }]} onPress={()=> setLogoutModalVisible(true)}>
                <Text style={styles.logoutText}>로그아웃</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );

  const renderLogoutModal = () => (
    <Modal visible={logoutModalVisible} transparent animationType="fade" onRequestClose={()=> setLogoutModalVisible(false)}>
      <View style={styles.modalOverlay}>
        <View style={[styles.logoutConfirmModal,{ backgroundColor: theme.surface }]}>
          <View style={styles.modalHeader}><MaterialIcons name="logout" size={32} color={theme.danger}/><Text style={[styles.logoutModalTitle,{ color: theme.danger }]}>로그아웃</Text></View>
          <Text style={[styles.logoutModalMessage,{ color: theme.subtext }]}>정말로 로그아웃 하시겠습니까?{'\n'}현재 채팅 내용이 저장되지 않을 수 있습니다.</Text>
          <View style={styles.logoutModalButtons}>
            <TouchableOpacity style={[styles.logoutCancelButton,{ backgroundColor: darkMode?'#2B2F33':'#F3F5F7', borderColor: theme.border }]} onPress={()=> setLogoutModalVisible(false)}><Text style={[styles.logoutCancelText,{ color: theme.subtext }]}>취소</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.logoutConfirmButton,{ backgroundColor: theme.danger }]} onPress={()=>{ setLogoutModalVisible(false); toggleSidebar(); navigation?.goToLogin && navigation.goToLogin(); }}><Text style={styles.logoutConfirmText}>로그아웃</Text></TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderAppAlert = () => (
    <Modal visible={appAlert.visible} transparent animationType="fade" onRequestClose={closeAlert}>
      <View style={styles.modalOverlay}>
        <View style={[styles.appAlert,{ backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.appAlertTitle,{ color: theme.text }]}>{appAlert.title}</Text>
          <Text style={[styles.appAlertMessage,{ color: theme.subtext }]}>{appAlert.message}</Text>
          <View style={styles.appAlertButtons}>
            {appAlert.cancelText ? (
              <TouchableOpacity style={[styles.appAlertButton,{ backgroundColor: darkMode?'#2B2F33':'#F3F5F7', borderColor: theme.border }]} onPress={()=>{ closeAlert(); appAlert.onCancel?.(); }}>
                <Text style={[styles.appAlertButtonText,{ color: theme.subtext }]}>{appAlert.cancelText}</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity style={[styles.appAlertButtonPrimary,{ backgroundColor: theme.primary }]} onPress={()=>{ closeAlert(); appAlert.onConfirm?.(); }}>
              <Text style={styles.appAlertButtonPrimaryText}>{appAlert.confirmText || '확인'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderDownloadModal = () => (
    <Modal visible={downloadModalVisible} transparent animationType="fade" onRequestClose={cancelDownload}>
      <View style={styles.modalOverlay}>
        <View style={[styles.downloadModal,{ backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={{ flexDirection:'row', alignItems:'center', marginBottom:8 }}>
            <MaterialIcons name="cloud-download" size={22} color={theme.primary} style={{ marginRight:8 }}/>
            <Text style={[styles.modalTitle,{ color: theme.text }]}>모델 다운로드 중...</Text>
          </View>
          <Text style={[styles.modalSubtitle,{ color: theme.subtext, marginBottom:12 }]}>{Math.round(downloadProgress*100)}%</Text>
          <View style={[styles.progressBar,{ backgroundColor: darkMode?'#30353a':'#EEF1F4', borderColor: theme.border }]}>
            <View style={[styles.progressFill,{ width: `${Math.round(downloadProgress*100)}%`, backgroundColor: theme.primary }]} />
          </View>
          <View style={{ flexDirection:'row', marginTop:16 }}>
            <TouchableOpacity style={[styles.modalCancelButton,{ backgroundColor: darkMode?'#2B2F33':'#F3F5F7', borderColor: theme.border, flex:1 }]} onPress={cancelDownload}>
              <Text style={[styles.modalCancelText,{ color: theme.subtext }]}>취소</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const renderRenameModal = () => (
    <Modal visible={renameModalVisible} transparent animationType="fade" onRequestClose={()=> setRenameModalVisible(false)}>
      <View style={styles.modalOverlay}>
        <View style={[styles.renameModal,{ backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.modalTitle,{ color: theme.text }]}>채팅 이름 변경</Text>
          <TextInput style={[styles.renameInput,{ color: theme.text, borderColor: theme.border, backgroundColor: darkMode?'#1F2426':'#F6F8FA' }]}
                     placeholder="새 제목 입력" placeholderTextColor={theme.subtext} value={newTitle} onChangeText={setNewTitle}/>
          <View style={{ flexDirection:'row', marginTop:12 }}>
            <TouchableOpacity style={[styles.modalCancelButton,{ backgroundColor: darkMode?'#2B2F33':'#F3F5F7', borderColor: theme.border, flex:1 }]} onPress={()=> setRenameModalVisible(false)}>
              <Text style={[styles.modalCancelText,{ color: theme.subtext }]}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.appAlertButtonPrimary,{ backgroundColor: theme.primary, flex:1, marginLeft:8 }]} onPress={async ()=>{
              if (!selectedThreadId || !newTitle.trim()) return;
              try { await updateThread(selectedThreadId, newTitle.trim()); const updated = await getThreads(); setThreads(updated.data); setRenameModalVisible(false); }
              catch(e){ console.error(e); openAlert({ title:'오류', message:'이름을 변경할 수 없습니다.', confirmText:'확인' }); }
            }}>
              <Text style={styles.appAlertButtonPrimaryText}>저장</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={[styles.container,{ backgroundColor: theme.bg }]} edges={['top','left','right']}>
      <StatusBar barStyle={darkMode?'light-content':'dark-content'} backgroundColor={theme.headerBg} />
      <View style={[styles.header,{ backgroundColor: theme.headerBg, borderBottomColor: theme.border }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={toggleSidebar} style={styles.menuButton}><MaterialIcons name="menu" size={24} color={theme.text}/></TouchableOpacity>
          <Text style={[styles.headerTitle,{ color: theme.text }]}>내 AI</Text>
        </View>
        <View style={styles.headerRight}>
          {!!username && <Text style={[styles.welcomeText,{ color: theme.subtext }]}>{username}님</Text>}
          <TouchableOpacity style={styles.profileIconContainer} onPress={()=>{
            if (navigation?.navigate) { try { navigation.navigate('Settings'); } catch { openAlert({ title:'설정', message:'설정 화면이 아직 연결되지 않았습니다.', confirmText:'확인' }); } }
            else { openAlert({ title:'설정', message:'설정 화면이 아직 연결되지 않았습니다.', confirmText:'확인' }); }
          }}>
            <MaterialIcons name="settings" size={20} color={theme.text}/>
          </TouchableOpacity>
        </View>
      </View>

      {renderSidebar()}
      {renderLogoutModal()}
      {renderAppAlert()}
      {renderDownloadModal()}
      {renderRenameModal()}

      <View style={{ flex:1 }}>
        <View style={{ flex:1 }}>
          {messages.length===0 ? (
            <ScrollView style={{ flex:1 }} contentContainerStyle={[
              styles.welcomeContent,
              { paddingBottom: 40 + (insets.bottom||0) + (Platform.OS==='android'?androidKeyboardHeight:0) },
            ]} showsVerticalScrollIndicator={false}>
              <View style={styles.logoSection}>
                <View style={[styles.logoContainer,{ backgroundColor: darkMode?'#1F2426':'#F6F8FA', borderColor: theme.border }]}>
                  <Image source={chatTheme?require('../logo/cat.png'):require('../logo/dog.png')} style={styles.logoImage} resizeMode="contain" />
                </View>
                <Text style={[styles.welcomeTitle,{ color: theme.text }]}>무엇을 도와드릴까요?</Text>

                {modelState==='ready' ? (
                  <View style={[styles.readyBadge,{ backgroundColor: theme.chipBg }]}>
                    <MaterialIcons name="check-circle" size={16} color={theme.chipText} style={{ marginRight:6 }}/>
                    <Text style={{ color: theme.chipText, fontWeight:'700' }}>
                      온디바이스 모델 준비 완료{llamaReady ? '' : ' (로컬 엔진 미설치·폴백 없음)'}
                    </Text>
                  </View>
                ) : modelState==='downloading' ? (
                  <View style={[styles.downloadCard,{ backgroundColor: theme.surface, borderColor: theme.border }]}>
                    <View style={{ flexDirection:'row', alignItems:'center', marginBottom:8 }}>
                      <MaterialIcons name="cloud-download" size={20} color={theme.primary} style={{ marginRight:8 }}/>
                      <Text style={{ color: theme.text, fontWeight:'700' }}>다운로드 중...</Text>
                    </View>
                    <View style={[styles.progressBar,{ backgroundColor: darkMode?'#30353a':'#EEF1F4', borderColor: theme.border }]}>
                      <View style={[styles.progressFill,{ width:`${Math.round(downloadProgress*100)}%`, backgroundColor: theme.primary }]} />
                    </View>
                    <Text style={{ color: theme.subtext, marginTop:6 }}>{Math.round(downloadProgress*100)}%</Text>
                  </View>
                ) : (
                  <TouchableOpacity style={[styles.downloadCard,{ backgroundColor: theme.surface, borderColor: theme.border }]} onPress={startDownload}>
                    <View style={{ flexDirection:'row', alignItems:'center' }}>
                      <MaterialIcons name="cloud-download" size={20} color={theme.primary} style={{ marginRight:8 }}/>
                      <Text style={{ color: theme.text, fontWeight:'700' }}>온디바이스 모델 다운로드</Text>
                    </View>
                    <Text style={{ color: theme.subtext, marginTop:6 }}>약 870MB • Wi‑Fi 권장</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.quickActionsContainer}>
                {quickActions.map((action,i)=>(
                  <TouchableOpacity key={i} style={[styles.quickActionCard,{ backgroundColor: theme.surface, borderColor: theme.border }]}
                    onPress={()=>{ if (action.title==='펫 헬스케어') setInput('펫 헬스케어에 대해 알려주세요'); else handleSend(action.title); }}>
                    <View style={styles.quickActionHeader}>
                      <MaterialIcons name={action.icon} size={24} color={theme.primary} style={{ marginRight:12 }}/>
                      <Text style={[styles.quickActionTitle,{ color: theme.text }]}>{action.title}</Text>
                    </View>
                    <Text style={[styles.quickActionDescription,{ color: theme.subtext }]}>{action.description}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={({item,index})=>renderMessage({item,index})}
              keyExtractor={(item)=>item.id}
              contentContainerStyle={{
                padding:15,
                paddingBottom: INPUT_BAR_MIN_HEIGHT + 8 + (insets.bottom||0) + (Platform.OS==='android'?androidKeyboardHeight:0),
              }}
              ListHeaderComponent={chatStartTime ? (
                <View style={styles.chatStartTimeContainer}>
                  <Text style={[styles.chatStartTimeText,{ backgroundColor: theme.chipBg, color: theme.chipText }]}>{formatChatStartTime(chatStartTime)}</Text>
                </View>
              ) : null}
              ListFooterComponent={(isDiagnosing || isTyping) ? renderTypingIndicator : null}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              onContentSizeChange={() => scrollToEnd(false)}
              onLayout={() => scrollToEnd(false)}
            />
          )}
        </View>

        {/* 입력창 */}
        <View style={[
          styles.inputContainer,
          { backgroundColor: theme.surface, borderTopColor: theme.border, paddingBottom: insets.bottom||0, minHeight: INPUT_BAR_MIN_HEIGHT,
            ...(Platform.OS==='android'?{ marginBottom: androidKeyboardHeight }:null), },
        ]}>
          <View style={[styles.inputWrapper,{ backgroundColor: darkMode?'#1F2426':'#F6F8FA', borderColor: theme.border }]}>
            <TextInput style={[styles.input,{ color: theme.text }]} placeholder="메시지를 입력하세요..." placeholderTextColor={theme.subtext}
              value={input} onChangeText={setInput} multiline maxLength={500} blurOnSubmit={false} returnKeyType="send" removeClippedSubviews={false}
              onFocus={()=> setTimeout(()=>scrollToEnd(true), 120)}
              onSubmitEditing={()=>{ if (!input.trim()) return; handleSend(); }}
            />
            <TouchableOpacity onPress={()=>handleSend()} style={[styles.sendButton,{ backgroundColor: input.trim()?theme.primary:(darkMode?'#2B2F33':'#E6EAEE') }]} disabled={!input.trim()}>
              <MaterialIcons name="send" size={18} color={input.trim()?'#fff':(darkMode?'#565B60':'#98A2AE')} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container:{ flex:1 },
  header:{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingHorizontal:15, paddingVertical:14, borderBottomWidth:1 },
  headerLeft:{ flexDirection:'row', alignItems:'center', flex:1 },
  menuButton:{ width:30, height:40, justifyContent:'center', alignItems:'center' },
  headerTitle:{ fontSize:18, fontWeight:'700', marginLeft:6 },
  headerRight:{ flexDirection:'row', alignItems:'center' },
  welcomeText:{ fontSize:14, marginRight:8, textAlign:'center' },
  teamText:{ fontSize:12, marginRight:8, textAlign:'center' },
  profileIconImage:{ width:25, height:25, borderRadius:12.5 },
  profileIconContainer:{ width:35, height:35, borderRadius:17.5, justifyContent:'center', alignItems:'center', marginLeft:4 },

  welcomeContent:{ flexGrow:1, justifyContent:'center', alignItems:'center', paddingHorizontal:20 },
  logoSection:{ alignItems:'center', marginBottom:18 },
  logoContainer:{ width:84, height:84, borderRadius:42, justifyContent:'center', alignItems:'center', marginBottom:12, borderWidth:1 },
  logoImage:{ width:60, height:60 },
  welcomeTitle:{ fontSize:22, fontWeight:'800', marginBottom:8 },

  readyBadge:{ flexDirection:'row', alignItems:'center', paddingHorizontal:10, paddingVertical:8, borderRadius:999, marginTop:6 },
  downloadCard:{ marginTop:8, width:'100%', maxWidth:340, borderRadius:12, padding:14, borderWidth:1 },
  progressBar:{ width:280, height:10, borderRadius:6, overflow:'hidden', borderWidth:1, alignSelf:'center' },
  progressFill:{ height:'100%', borderRadius:6 },

  quickActionsContainer:{ width:'100%', gap:12, paddingHorizontal:16, marginTop:14 },
  quickActionCard:{ borderRadius:14, padding:18, borderWidth:1, shadowColor:'#000', shadowOpacity:0.05, shadowRadius:6, shadowOffset:{ width:0, height:2 }, elevation:2 },
  quickActionHeader:{ flexDirection:'row', alignItems:'center', marginBottom:6 },
  quickActionTitle:{ fontSize:15, fontWeight:'700' },
  quickActionDescription:{ fontSize:13, lineHeight:19 },

  userMessageContainer:{ flexDirection:'row', justifyContent:'flex-end', alignItems:'flex-end', marginVertical:4, paddingHorizontal:10 },
  botMessageContainer:{ flexDirection:'row', justifyContent:'flex-start', alignItems:'flex-start', marginVertical:4, paddingHorizontal:0 },
  botAvatar:{ width:40, height:40, borderRadius:20, marginRight:6, marginTop:2 },
  userAvatar:{ width:35, height:35, borderRadius:17.5, marginLeft:6, marginTop:2 },
  messageBubble:{ paddingVertical:10, paddingHorizontal:13, borderRadius:18, maxWidth:'78%', borderWidth:1 },
  messageText:{ fontSize:15, lineHeight:22 },

  chatStartTimeContainer:{ alignItems:'center', marginVertical:18 },
  chatStartTimeText:{ fontSize:12, paddingHorizontal:12, paddingVertical:6, borderRadius:999 },
  dateSeparatorContainer:{ alignItems:'center', marginVertical:14 },
  dateSeparatorText:{ fontSize:12, paddingHorizontal:12, paddingVertical:6, borderRadius:999 },
  botTimeContainer:{ marginLeft:55, marginTop:2, marginBottom:8 },
  botTimeText:{ fontSize:11 },

  diagnosingContainer:{ flexDirection:'row', alignItems:'center', padding:5 },
  loadingSpinner:{ width:16, height:16, borderRadius:8, borderWidth:2, borderTopColor:'transparent', marginRight:8 },
  diagnosingText:{ fontSize:14 },
  typingContainer:{ flexDirection:'row', alignItems:'flex-end', flexWrap:'wrap' },
  typingCursor:{ width:2, height:18, marginLeft:3, opacity:1 },

  inputContainer:{ borderTopWidth:1, paddingHorizontal:15, paddingTop:8 },
  inputWrapper:{ flexDirection:'row', alignItems:'center', borderRadius:22, paddingHorizontal:12, paddingVertical:6, borderWidth:1 },
  input:{ flex:1, fontSize:16, maxHeight:120, paddingVertical:Platform.OS==='android'?10:8, textAlignVertical:'top' },
  sendButton:{ width:36, height:36, borderRadius:18, justifyContent:'center', alignItems:'center', marginLeft:8 },

  sidebarOverlay:{ flex:1, backgroundColor:'rgba(0,0,0,0.5)', flexDirection:'row' },
  sidebarBackdrop:{ flex:1 },
  sidebar:{ width:280, height:'100%', position:'absolute', left:-300, top:0, borderRightWidth:1 },
  sidebarContent:{ flex:1, paddingTop:0 },
  sidebarScrollView:{ flex:1 },
  sidebarScrollContent:{ flexGrow:1 },
  sidebarTopHeader:{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingHorizontal:10, paddingVertical:10, borderBottomWidth:1 },
  searchInputContainer:{ flexDirection:'row', alignItems:'center', borderRadius:18, paddingHorizontal:12, paddingVertical:6, flex:1, marginRight:10, borderWidth:1 },
  searchInput:{ flex:1, fontSize:14, paddingVertical:4 },
  searchIcon:{ marginRight:6 },
  closeButton:{ width:30, height:30, justifyContent:'center', alignItems:'center' },
  newChatButton:{ flexDirection:'row', alignItems:'center', paddingHorizontal:20, paddingVertical:14 },
  newChatText:{ fontSize:16, fontWeight:'600' },
  divider:{ height:1, marginHorizontal:0, marginVertical:10 },
  sidebarSection:{ paddingHorizontal:20, paddingVertical:14 },
  sectionTitle:{ fontSize:14, fontWeight:'600' },
  sidebarBottom:{ paddingHorizontal:20, paddingVertical:20, borderTopWidth:1 },
  logoutButton:{ justifyContent:'center', alignItems:'center', paddingVertical:13, paddingHorizontal:13, borderRadius:10, borderWidth:1 },
  logoutText:{ fontSize:16, color:'#fff', fontWeight:'700' },

  modalOverlay:{ flex:1, backgroundColor:'rgba(0, 0, 0, 0.5)', justifyContent:'center', alignItems:'center', padding:20 },
  modalHeader:{ flexDirection:'row', alignItems:'center', gap:8, marginBottom:8 },
  modalTitle:{ fontSize:20, fontWeight:'800' },
  modalSubtitle:{ fontSize:14 },

  modalCancelButton:{ paddingVertical:12, paddingHorizontal:24, borderRadius:8, borderWidth:1, alignItems:'center' },
  modalCancelText:{ fontSize:16, fontWeight:'600' },

  logoutConfirmModal:{ borderRadius:16, padding:24, margin:40, alignItems:'center', shadowColor:'#000', shadowOffset:{ width:0, height:4 }, shadowOpacity:0.25, shadowRadius:8, elevation:8 },
  logoutModalTitle:{ fontSize:20, fontWeight:'800', marginLeft:12 },
  logoutModalMessage:{ fontSize:16, textAlign:'center', lineHeight:24, marginVertical:18 },
  logoutModalButtons:{ flexDirection:'row', justifyContent:'space-between', width:'100%', marginTop:10 },
  logoutCancelButton:{ flex:1, padding:14, borderRadius:8, marginRight:8, alignItems:'center', borderWidth:1 },
  logoutCancelText:{ fontSize:16, fontWeight:'700' },
  logoutConfirmButton:{ flex:1, padding:14, borderRadius:8, marginLeft:8, alignItems:'center' },
  logoutConfirmText:{ fontSize:16, color:'#fff', fontWeight:'800' },

  appAlert:{ borderRadius:16, padding:20, width:'100%', maxWidth:340, borderWidth:1 },
  appAlertTitle:{ fontSize:18, fontWeight:'800', marginBottom:8, textAlign:'center' },
  appAlertMessage:{ fontSize:14, lineHeight:20, textAlign:'center' },
  appAlertButtons:{ flexDirection:'row', marginTop:14 },
  appAlertButton:{ flex:1, paddingVertical:12, borderRadius:10, alignItems:'center', borderWidth:1 },
  appAlertButtonText:{ fontSize:15, fontWeight:'700' },
  appAlertButtonPrimary:{ flex:1, paddingVertical:12, borderRadius:10, alignItems:'center', marginLeft:8 },
  appAlertButtonPrimaryText:{ fontSize:15, fontWeight:'800', color:'#fff' },

  downloadModal:{ borderRadius:16, padding:20, width:'100%', maxWidth:360, borderWidth:1 },
  renameModal:{ borderRadius:16, padding:20, width:'100%', maxWidth:360, borderWidth:1 },
  renameInput:{ borderWidth:1, borderRadius:10, paddingHorizontal:12, paddingVertical: Platform.OS==='android'?10:8, fontSize:15, marginTop:10 },
});

export default ChatBotScreen;
