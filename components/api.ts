// src/api.ts
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const API_BASE_URL = 'http://15.164.104.195:8000';
export const getUserProfile = async () => {
  return api.get('/users/me');
};
// axios 인스턴스 생성
const api = axios.create({
  baseURL: API_BASE_URL,
});

// 요청 인터셉터: 매 요청마다 저장된 accessToken을 헤더에 넣어줍니다.
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('accessToken');

  if (token) {
    // headers가 undefined면 빈 객체로 초기화
    const headers = config.headers ?? {};

    // Authorization 헤더 설정 (타입 캐스팅으로 타입 오류 방지)
    (headers as any).Authorization = `Bearer ${token}`;

    // config.headers에 다시 할당
    config.headers = headers;
  }

  return config;
});
// 응답 인터셉터: 401 오류(토큰 만료) 시 refresh 토큰으로 새 access 토큰을 발급받습니다.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = await AsyncStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          // refresh 토큰으로 새 access 토큰 요청
          // ✅ 백엔드에서는 /auth/refresh 엔드포인트를 사용합니다.
          const res = await axios.post(`${API_BASE_URL}/auth/refresh`, { refresh_token: refreshToken });
          const newAccessToken = res.data.access_token;
          // 새 access 토큰 저장
          await AsyncStorage.setItem('accessToken', newAccessToken);
          // 헤더에 새 토큰 설정 후 기존 요청 재시도
          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return api(originalRequest);
        } catch (refreshError) {
          // refresh 토큰도 만료된 경우, 저장된 토큰 삭제
          await AsyncStorage.removeItem('accessToken');
          await AsyncStorage.removeItem('refreshToken');
          return Promise.reject(refreshError);
        }
      }
    }
    return Promise.reject(error);
  }
);

// ========== API 함수들 ==========

// 사용자 설정 업데이트
export const updateUserPrefs = async (prefs: { chat_theme?: boolean; dark_mode?: boolean }) => {
  return api.patch('/users/me', prefs);
};
// 계정 삭제
export const deleteUserAccount = async () => {
  return api.delete('/users/me');
};

// 새 채팅(쓰레드) 생성
export const createThread = async (title: string) => {
  // /threads/threads가 맞습니다 (threads 라우터 prefix가 /threads, 내부 경로도 /threads)
  return api.post('/threads/threads', { thread_title: title });
};

// 쓰레드 목록 조회
export const getThreads = async () => {
  return api.get('/threads/threads');
};

// 특정 쓰레드 메시지 조회
export const getMessages = async (threadId: number) => {
  // 메시지 라우터는 prefix="/threads"로 정의되어 있으므로 중첩되지 않습니다.
  // 따라서 /threads/{thread_id}/messages 가 올바른 경로입니다.
  return api.get(`/threads/${threadId}/messages`);
};

// 메시지 전송
export const sendMessage = async (
  threadId: number,
  content: string,
  senderType: 'user' | 'assistant',
) => {
  // 메시지 생성 시에는 client_message_id가 필수입니다(멱등성 보장을 위해).
  // 간단히 현재 시간과 난수로 고유 ID를 생성합니다.
  const clientMessageId = `${Date.now()}-${Math.random()}`;

  return api.post(`/threads/${threadId}/messages`, {
    content,
    sender_type: senderType,
    client_message_id: clientMessageId,
    stream: false,
  });
};

// 쓰레드 제목 수정
export const updateThread = async (threadId: number, newTitle: string) => {
  return api.patch(`/threads/threads/${threadId}`, { thread_title: newTitle });
};

// 쓰레드 삭제
export const deleteThread = async (threadId: number) => {
  return api.delete(`/threads/threads/${threadId}`);
};
