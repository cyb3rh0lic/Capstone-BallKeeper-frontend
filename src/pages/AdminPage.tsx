import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/client';
import { useAuthStore } from '../store/authStore';

// 백엔드에서 받아올 예약 정보 타입 정의
type PendingReservation = {
  id: number;
  userId: number;
  userName: string;
  itemId: number;
  itemName: string;
  startTime: string;
  endTime: string;
  status: 'PENDING';
};

// 날짜 포맷팅 헬퍼 함수
const formatDateTime = (dateTimeString: string) => {
  try {
    const date = new Date(dateTimeString);
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (e) {
    return dateTimeString;
  }
};

export default function AdminPage() {
  const { user } = useAuthStore();
  const [pendingList, setPendingList] = useState<PendingReservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState(''); // 모든 반려에 공통으로 사용할 사유

  // 대기 중인 예약 목록을 불러오는 함수
  const fetchPendingReservations = async () => {
    setIsLoading(true);
    try {
      const data = await apiClient.get<PendingReservation[]>('/api/admin/reservations/pending');
      setPendingList(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || '데이터를 불러오는 데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 컴포넌트 마운트 시 데이터 불러오기
  useEffect(() => {
    fetchPendingReservations();
  }, []);

  // 예약 승인 처리
  const handleApprove = async (reservationId: number) => {
    if (!user) return;
    try {
      await apiClient.post(`/api/admin/reservations/${reservationId}/approve?adminId=${user.id}`);
      alert('예약이 승인되었습니다.');
      fetchPendingReservations(); // 목록 새로고침
    } catch (err: any) {
      alert(`승인 실패: ${err.message}`);
    }
  };

  // 예약 반려 처리
  const handleReject = async (reservationId: number) => {
    if (!user) return;
    if (!rejectReason) {
      alert('반려 사유를 입력해주세요.');
      return;
    }
    try {
      const params = new URLSearchParams({
        adminId: String(user.id),
        reason: rejectReason,
      });
      await apiClient.post(`/api/admin/reservations/${reservationId}/reject?${params.toString()}`);
      alert('예약이 반려되었습니다.');
      setRejectReason(''); // 사유 초기화
      fetchPendingReservations(); // 목록 새로고침
    } catch (err: any) {
      alert(`반려 실패: ${err.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8 font-sans">
      <header className="max-w-6xl mx-auto mb-8 flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">관리자 페이지</h1>
        <Link to="/chat" className="text-sm text-indigo-600 hover:text-indigo-800 font-semibold">
          &larr; 챗봇 페이지로 돌아가기
        </Link>
      </header>

      <main className="max-w-6xl mx-auto">
        <div className="bg-white p-6 rounded-2xl shadow-lg">
          <h2 className="text-xl font-semibold mb-4">예약 승인 대기 목록</h2>
          
          <div className="mb-4 flex items-center gap-2">
            <label htmlFor="rejectReason" className="font-medium text-gray-700">공통 반려 사유:</label>
            <input
              id="rejectReason"
              type="text"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="반려 시 사유를 입력하세요..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          <hr className="my-4" />

          {isLoading && <p className="text-center text-gray-500">대기 목록을 불러오는 중...</p>}
          {error && <p className="text-center text-red-500">{error}</p>}

          <div className="space-y-4">
            {!isLoading && pendingList.length === 0 && (
              <p className="text-center text-gray-500">승인 대기 중인 예약이 없습니다.</p>
            )}

            {pendingList.map((reservation) => (
              <div key={reservation.id} className="p-4 border border-gray-200 rounded-lg bg-gray-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex-1">
                  <div className="font-bold text-lg text-gray-900">
                    {reservation.itemName} <span className="text-sm font-medium text-gray-500">(ID: {reservation.itemId})</span>
                  </div>
                  <div className="text-sm text-gray-700 mt-1">
                    <span className="font-medium">사용자:</span> {reservation.userName} (ID: {reservation.userId})
                  </div>
                  <div className="text-sm text-gray-700">
                    <span className="font-medium">시간:</span> {formatDateTime(reservation.startTime)} ~ {formatDateTime(reservation.endTime)}
                  </div>
                </div>
                
                <div className="flex gap-2 flex-shrink-0 w-full sm:w-auto">
                  <button
                    onClick={() => handleApprove(reservation.id)}
                    className="flex-1 sm:flex-none bg-green-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-600 transition duration-300"
                  >
                    승인
                  </button>
                  <button
                    onClick={() => handleReject(reservation.id)}
                    className="flex-1 sm:flex-none bg-red-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-600 transition duration-300"
                  >
                    반려
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}