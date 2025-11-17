import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import AuthCallbackPage from './pages/AuthCallbackPage';
import LoginPage from './pages/LoginPage';
import ChatPage from './pages/ChatPage';
import AdminPage from './pages/AdminPage';

function App() {
  const user = useAuthStore((state) => state.user);
  const isAdmin = useAuthStore((state) => state.isAdmin);

  return (
    <BrowserRouter>
      <Routes>
        {/* 로그인한 사용자는 챗봇 페이지로, 아니면 로그인 페이지로 */}
        <Route
          path="/"
          element={user ? <Navigate to="/chat" /> : <Navigate to="/login" />}
        />
        
        {/* 로그인 페이지 */}
        <Route
          path="/login"
          element={user ? <Navigate to="/chat" /> : <LoginPage />}
        />
        
        {/* 카카오 로그인 콜백을 처리할 전용 페이지 */}
        <Route 
          path="/auth/kakao" 
          element={<AuthCallbackPage />} 
        />
        
        {/* 챗봇 페이지 (로그인한 사용자만 접근 가능) */}
        <Route
          path="/chat"
          element={user ? <ChatPage /> : <Navigate to="/login" />}
        />
        
        {/* 관리자 페이지 */}
        <Route
          path="/admin"
          element={isAdmin() ? <AdminPage /> : <Navigate to="/chat" />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;