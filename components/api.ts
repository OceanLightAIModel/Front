// src/api.ts
import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

/** ====== 서버 기본 주소 ====== */
export const API_BASE_URL = 'http://15.164.104.195:8000';

/** ====== Axios 인스턴스 ====== */
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
});

/** ====== 토큰 유틸 ====== */
const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';

export async function setTokens(accessToken: string, refreshToken?: string) {
  await AsyncStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  if (typeof refreshToken === 'string') {
    await AsyncStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }
}

export async function clearTokens() {
  await AsyncStorage.removeItem(ACCESS_TOKEN_KEY);
  await AsyncStorage.removeItem(REFRESH_TOKEN_KEY);
}

export async function getAccessToken() {
  return AsyncStorage.getItem(ACCESS_TOKEN_KEY);
}

export async function getRefreshToken() {
  return AsyncStorage.getItem(REFRESH_TOKEN_KEY);
}

/** ====== 요청 인터셉터: 토큰 자동 첨부 ====== */
api.interceptors.request.use(async (config) => {
  const token = await getAccessToken();
  if (token) {
    config.headers = config.headers ?? {};
    (config.headers as any).Authorization = `Bearer ${token}`;
  }
  return config;
});

/** ====== 응답 인터셉터: 401일 때 자동 토큰 재발급 ====== */
let isRefreshing = false;
let refreshWaitQueue: Array<(token: string) => void> = [];

function subscribeTokenRefreshed(cb: (token: string) => void) {
  refreshWaitQueue.push(cb);
}

function publishTokenRefreshed(token: string) {
  refreshWaitQueue.forEach((cb) => cb(token));
  refreshWaitQueue = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const { response, config } = error;
    const originalRequest = (config || {}) as AxiosRequestConfig & { _retry?: boolean };

    // 401이 아닌 오류는 그대로 처리
    if (response?.status !== 401) {
      return Promise.reject(error);
    }

    // 로그인 또는 refresh 자체에서 401이 발생하면 토큰 삭제 후 종료
    const reqUrl = (originalRequest.url || '').toString();
    if (reqUrl.includes('/auth/login') || reqUrl.includes('/auth/refresh')) {
      await clearTokens();
      return Promise.reject(error);
    }

    // 이미 재시도한 요청이면 무한루프 방지를 위해 종료
    if (originalRequest._retry) {
      await clearTokens();
      return Promise.reject(error);
    }
    originalRequest._retry = true;

    const refreshToken = await getRefreshToken();
    if (!refreshToken) {
      await clearTokens();
      return Promise.reject(error);
    }

    // 이미 다른 요청이 리프레시 중이면 큐에 등록
    if (isRefreshing) {
      return new Promise((resolve) => {
        subscribeTokenRefreshed((newToken) => {
          originalRequest.headers = originalRequest.headers ?? {};
          (originalRequest.headers as any).Authorization = `Bearer ${newToken}`;
          resolve(api(originalRequest));
        });
      });
    }

    // 실제 토큰 재발급
    isRefreshing = true;
    try {
      const res = await axios.post(
        `${API_BASE_URL}/auth/refresh`,
        { refresh_token: refreshToken },
        { timeout: 15000 }
      );

      const newAccessToken = (res.data as any)?.access_token;
      const newRefreshToken = (res.data as any)?.refresh_token;

      if (!newAccessToken) {
      throw new Error('No access_token in refresh response');
      }

      await setTokens(newAccessToken, newRefreshToken);

      // 대기 중인 요청들 재시도
      publishTokenRefreshed(newAccessToken);

      // 현재 요청 재시도
      originalRequest.headers = originalRequest.headers ?? {};
      (originalRequest.headers as any).Authorization = `Bearer ${newAccessToken}`;
      return api(originalRequest);
    } catch (e) {
      await clearTokens();
      return Promise.reject(e);
    } finally {
      isRefreshing = false;
    }
  }
);

/** =========================
 *  인증/계정 관련 API
 *  ======================= */

/** 로그인: username/email과 password를 form-urlencoded로 전송 */
export async function login(email: string, password: string) {
  const params = new URLSearchParams();
  params.append('username', email);
  params.append('password', password);

  const res = await axios.post(`${API_BASE_URL}/auth/login`, params, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    timeout: 20000,
  });

  const data = res.data as any;
  const access = data?.access_token;
  const refresh = data?.refresh_token;

  if (access) {
    await setTokens(access, refresh);
  }
  return data;
}

/** 로그아웃: 로컬에 저장한 토큰 삭제 */
export async function logout() {
  await clearTokens();
}

/** 내 프로필 조회 */
export const getUserProfile = async () => {
  return api.get('/users/me');
};

/** 사용자 설정 업데이트 (chat_theme / dark_mode) */
export const updateUserPrefs = async (prefs: { chat_theme?: boolean; dark_mode?: boolean }) => {
  return api.patch('/users/me', prefs);
};

/** 계정 삭제 */
export const deleteUserAccount = async () => {
  return api.delete('/users/me');
};

/** 모델 서명 URL (다운로드용) */
export const getModelSignedUrl = async () => {
  return api.get('/model/url');
};

/** =========================
 *  스레드/메시지 관련 API
 *  ======================= */

/** 새 채팅(스레드) 생성 */
export const createThread = async (title: string) => {
  return api.post('/threads/threads', { thread_title: title });
};

/** 스레드 목록 조회 */
export const getThreads = async () => {
  return api.get('/threads/threads');
};

/** 특정 스레드 메시지 조회 */
export const getMessages = async (threadId: number) => {
  return api.get(`/threads/${threadId}/messages`);
};

/** 메시지 전송 */
export const sendMessage = async (
  threadId: number,
  content: string,
  senderType: 'user' | 'assistant',
) => {
  const clientMessageId = `${Date.now()}-${Math.random()}`;
  return api.post(`/threads/${threadId}/messages`, {
    content,
    sender_type: senderType,
    client_message_id: clientMessageId,
    stream: false,
  });
};

/** 스레드 제목 수정 */
export const updateThread = async (threadId: number, newTitle: string) => {
  return api.patch(`/threads/threads/${threadId}`, { thread_title: newTitle });
};

/** 스레드 삭제 */
export const deleteThread = async (threadId: number) => {
  return api.delete(`/threads/threads/${threadId}`);
};

export default api;
