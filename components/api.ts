// src/api.ts
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const API_BASE_URL = 'http://15.164.104.195:8000';

// axios 인스턴스 생성
const api = axios.create({
  baseURL: API_BASE_URL,
});

// 요청 인터셉터: 매 요청마다 저장된 accessToken을 헤더에 넣어줍니다.
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 응답 인터셉터: 401 오류(토큰 만료) 시 refresh 토큰으로 새 access 토큰을 발급받습니다.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    // 토큰 만료이고 재시도한 적 없다면 실행
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = await AsyncStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          // refresh 토큰으로 새 access 토큰 요청
          const res = await axios.post(`${API_BASE_URL}/token/refresh/`, { refresh: refreshToken });
          const newAccessToken = res.data.access;
          // 새 access 토큰 저장
          await AsyncStorage.setItem('accessToken', newAccessToken);
          // 헤더에 새 토큰 설정 후 기존 요청 재시도
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
// 새 채팅(쓰레드) 생성
export const createThread = async (title: string) => {
  return api.post('/threads/', { thread_title: title });
};

// 메시지 전송
export const sendMessage = async (
  threadId: number,
  content: string,
  senderType: 'user' | 'assistant',
) => {
  return api.post('/messages/', { thread_id: threadId, content, sender_type: senderType });
};

// 쓰레드 목록 조회
export const getThreads = async () => {
  return api.get('/threads/');
};

// 특정 쓰레드 메시지 조회
export const getMessages = async (threadId: number) => {
  return api.get(`/threads/${threadId}/messages`);
};

// 쓰레드 제목 수정
export const updateThread = async (threadId: number, newTitle: string) => {
  return api.put(`/threads/${threadId}`, { thread_title: newTitle });
};

// 사용자 프로필 조회
export const getUserProfile = async () => {
  return api.get('/users/me/');
};

// 쓰레드 삭제
export const deleteThread = async (threadId: number) => {
  return api.delete(`/threads/${threadId}`);
};
