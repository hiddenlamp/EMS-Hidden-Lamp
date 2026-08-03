import axios from 'axios';

// Automatically detect local vs production Render API URL
let baseURL = '/api';

if (typeof window !== 'undefined') {
  if (window.ENV?.API_BASE_URL) {
    baseURL = `${window.ENV.API_BASE_URL.replace(/\/$/, '')}/api`;
  } else if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    // Exact Live Production Render API URL
    baseURL = 'https://ems-hidden-lamp-1.onrender.com/api';
  }
}

const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;
