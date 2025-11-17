import axios from 'axios';

// 백엔드 API 기본 URL
const apiClient = axios.create({
  baseURL: 'http://localhost:8080',
  headers: {
    'Content-Type': 'application/json',
  },
});

// API 오류를 깔끔하게 처리하기 위한 인터셉터
apiClient.interceptors.response.use(
  (response) => response.data, // 성공 시 data만 반환
  (error) => {
    // 실패 시 서버에서 보낸 오류 메시지를 반환
    const message = error.response?.data?.message || error.message || '알 수 없는 오류가 발생했습니다.';
    return Promise.reject(new Error(message));
  }
);

export default apiClient;