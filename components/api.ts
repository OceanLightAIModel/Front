// src/api.ts
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const API_BASE_URL = 'http://15.164.104.195:8000';

// 토큰을 Authorization 헤더에 포함하는 헬퍼
const getAuthHeaders = async () => {
  const token = await AsyncStorage.getItem('accessToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// 새 채팅(쓰레드) 생성
export const createThread = async (title: string) => {
  const headers = await getAuthHeaders();
  return axios.post(`${API_BASE_URL}/threads`, { thread_title: title }, { headers });
};

// 메시지 전송
export const sendMessage = async (
  threadId: number,
  content: string,
  senderType: 'user' | 'assistant',
) => {
  const headers = await getAuthHeaders();
  return axios.post(
    `${API_BASE_URL}/messages`,
    { thread_id: threadId, content, sender_type: senderType },
    { headers },
  );
};

// 쓰레드 목록 조회 (선택사항)
export const getThreads = async () => {
  const headers = await getAuthHeaders();
  return axios.get(`${API_BASE_URL}/threads`, { headers });
};

// 특정 쓰레드의 메시지 조회 (선택사항)
export const getMessages = async (threadId: number) => {
  const headers = await getAuthHeaders();
  return axios.get(`${API_BASE_URL}/threads/${threadId}/messages`, { headers });
};
