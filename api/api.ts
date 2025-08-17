import axios from 'axios';

const API_BASE_URL = 'http://15.164.104.195:8000'; 

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default apiClient;
