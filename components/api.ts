// api.ts
export const API_BASE_URL = 'http://15.164.104.195:8000';
import axios from 'axios';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});