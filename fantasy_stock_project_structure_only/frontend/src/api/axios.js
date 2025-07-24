// src/api/axios.js
import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

// 요청 보낼 때마다 토큰 자동 삽입
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Token ${token}`;
  }
  return config;
});

export default api;
