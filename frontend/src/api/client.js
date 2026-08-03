import axios from 'axios';

const baseURL = window.ENV?.API_BASE_URL ? `${window.ENV.API_BASE_URL}/api` : '/api';

const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;
