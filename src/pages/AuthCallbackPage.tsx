import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import { useAuthStore } from '../store/authStore';

export default function AuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const setUser = useAuthStore((state) => state.setUser);
  const [message, setMessage] = useState('로그인 처리 중입니다...');

  useEffect(() => {
    const code = searchParams.get('code');

    if (code) {
      apiClient.get(`/api/users/auth/kakao?code=${code}`)
        .then((userData) => {
          setUser(userData); // Zustand 스토어에 사용자 정보 저장
          navigate('/chat'); // 챗봇 페이지로a 이동
        })
        .catch((err) => {
          setMessage(`로그인에 실패했습니다: ${err.message}`);
          // 3초 후 로그인 페이지로 복귀
          setTimeout(() => navigate('/login'), 3000);
        });
    } else {
      setMessage('인가 코드를 받지 못했습니다. 로그인 페이지로 돌아갑니다.');
      setTimeout(() => navigate('/login'), 3000);
    }
  }, [searchParams, navigate, setUser]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="p-8 bg-white shadow-xl rounded-2xl text-center">
        <h1 className="text-xl font-semibold mb-4">로그인 중...</h1>
        <p className="text-gray-600">{message}</p>
      </div>
    </div>
  );
}