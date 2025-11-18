import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../api/client';
import { useAuthStore } from '../store/authStore';

type Reservation = {
  id: number;
  userId: number;
  userName: string;
  itemId: number;
  itemName: string;
  startTime: string;
  endTime: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
};

type Tab = 'PENDING' | 'APPROVED' | 'ALL';

const formatDateTime = (dateTimeString: string) => {
  try {
    const date = new Date(dateTimeString);
    return date.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
  } catch (e) {
    return dateTimeString;
  }
};

const StatusChip = ({ status }: { status: Reservation['status'] }) => {
  const colors = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    APPROVED: 'bg-green-100 text-green-800',
    REJECTED: 'bg-red-100 text-red-800',
    CANCELLED: 'bg-gray-100 text-gray-800',
  };
  return (
    <span
      className={`px-2 py-1 text-xs font-medium rounded-full ${colors[status] || 'bg-gray-100'}`}
    >
      {status}
    </span>
  );
};

export const TabButton = ({
  label,
  tabName,
  activeTab,
  onClick,
}: {
  label: string;
  tabName: any;
  activeTab: any;
  onClick: (tab: any) => void;
}) => {
  const isActive = activeTab === tabName;
  return (
    <button
      onClick={() => onClick(tabName)}
      className={`py-2 px-4 font-semibold rounded-t-lg transition-colors duration-200 ${
        isActive
          ? 'border-b-2 border-indigo-600 text-indigo-600'
          : 'text-gray-500 hover:text-gray-700'
      }`}
    >
      {label}
    </button>
  );
};


// 예약 관리 탭 컴포넌트
export function ReservationManagementTab() {
  const user = useAuthStore((state) => state.user);
  
  const [activeTab, setActiveTab] = useState<Tab>('PENDING');
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const fetchReservations = useCallback(async () => {
    setIsLoading(true);
    let endpoint = '/api/admin/reservations/pending';
    if (activeTab === 'APPROVED') {
      endpoint = '/api/admin/reservations/approved';
    } else if (activeTab === 'ALL') {
      endpoint = '/api/admin/reservations/all';
    }
    
    try {
      const data = await apiClient.get<Reservation[]>(endpoint);
      setReservations(data);
      setError(null);
    } catch (err: any) {
      setError(`[${activeTab}] 목록 로딩 실패: ${err.message}.`);
      setReservations([]);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab]); 

  useEffect(() => {
    fetchReservations();
  }, [fetchReservations]); 

  const handleApprove = async (reservationId: number) => {
    if (!user) return;
    try {
      await apiClient.post(`/api/admin/reservations/${reservationId}/approve?adminId=${user.id}`);
      alert('예약이 승인되었습니다.');
      fetchReservations(); 
    } catch (err: any) {
      alert(`승인 실패: ${err.message}`);
    }
  };

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
      setRejectReason(''); 
      fetchReservations(); 
    } catch (err: any) {
      alert(`반려 실패: ${err.message}`);
    }
  };

  return (
    <>
      {/* --- 탭 네비게이션 --- */}
      <div className="flex border-b border-gray-300 mb-4">
        <TabButton label="승인 대기 중" tabName="PENDING" activeTab={activeTab} onClick={setActiveTab} />
        <TabButton label="승인 완료" tabName="APPROVED" activeTab={activeTab} onClick={setActiveTab} />
        <TabButton label="전체 내역" tabName="ALL" activeTab={activeTab} onClick={setActiveTab} />
      </div>

      {/* --- 현재 탭 컨텐츠 --- */}
      <div>
        {activeTab === 'PENDING' && (
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
        )}
        
        <hr className="my-4" />

        {isLoading && <p className="text-center text-gray-500">목록을 불러오는 중...</p>}
        {error && <p className="text-center text-red-500">{error}</p>}

        <div className="space-y-4">
          {!isLoading && reservations.length === 0 && (
            <p className="text-center text-gray-500">해당하는 예약 내역이 없습니다.</p>
          )}

          {reservations.map((reservation) => (
            <div key={reservation.id} className="p-4 border border-gray-200 rounded-lg bg-gray-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex-1">
                <div className="font-bold text-lg text-gray-900">
                  {reservation.itemName} <span className="text-sm font-medium text-gray-500">(#{reservation.id})</span>
                </div>
                <div className="text-sm text-gray-700 mt-1">
                  <span className="font-medium">사용자:</span> {reservation.userName} (ID: {reservation.userId})
                </div>
                <div className="text-sm text-gray-700">
                  <span className="font-medium">시간:</span> {formatDateTime(reservation.startTime)} ~ {formatDateTime(reservation.endTime)}
                </div>
              </div>
              
              <div className="flex gap-2 flex-shrink-0 w-full sm:w-auto">
                {reservation.status === 'PENDING' && activeTab === 'PENDING' && (
                  <>
                    <button
                      onClick={() => handleApprove(reservation.id)}
                      className="flex-1 sm:flex-none bg-green-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-600 transition"
                    >
                      승인
                    </button>
                    <button
                      onClick={() => handleReject(reservation.id)}
                      className="flex-1 sm:flex-none bg-red-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-600 transition"
                    >
                      반려
                    </button>
                  </>
                )}
                {activeTab !== 'PENDING' && (
                  <StatusChip status={reservation.status} />
                )}
              </div>

            </div>
          ))}
        </div>
      </div>
    </>
  );
}