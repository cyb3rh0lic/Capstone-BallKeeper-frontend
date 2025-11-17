import React from 'react';

// --- 🛑 여기에 본인의 카카오 앱 정보를 입력하세요 🛑 ---
const KAKAO_REST_API_KEY = "7656d5f2b81d96f0788b4a597929a34f";
const KAKAO_REDIRECT_URI = "http://localhost:5173/auth/kakao"; // ⬅️ 백엔드와 일치해야 함
// ---------------------------------------------------

const KAKAO_AUTH_URL = `https://kauth.kakao.com/oauth/authorize?client_id=${KAKAO_REST_API_KEY}&redirect_uri=${KAKAO_REDIRECT_URI}&response_type=code`;

// 카카오 로고 SVG (index.html의 public 폴더에 두거나 여기서 직접 사용)
const KakaoSymbol = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2C6.477 2 2 6.028 2 11.001C2 14.168 3.824 16.92 6.5 18.591L5.196 22.388C5.122 22.613 5.385 22.816 5.589 22.716L9.623 20.627C10.407 20.865 11.198 20.999 12 20.999C17.523 20.999 22 17.021 22 12C22 6.477 17.523 2 12 2Z" fill="#3A1D1D"/>
  </svg>
);

export default function LoginPage() {
  const handleLogin = () => {
    window.location.href = KAKAO_AUTH_URL;
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-sm p-8 space-y-8 bg-white shadow-xl rounded-2xl">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">BallKeeper</h1>
          <p className="mt-2 text-gray-600">AI 챗봇으로 간편하게 예약하세요.</p>
        </div>
        <button
          onClick={handleLogin}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[#FEE500] text-[#3A1D1D] font-semibold rounded-lg shadow-md hover:opacity-90 transition-opacity"
        >
          <KakaoSymbol />
          카카오로 3초 만에 시작하기
        </button>
      </div>
    </div>
  );
}