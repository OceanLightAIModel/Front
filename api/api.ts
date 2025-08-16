import axios from 'axios';

const API_BASE_URL = 'http://3.39.234.93:8000'; 

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default apiClient;
