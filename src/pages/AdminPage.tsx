import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ReservationManagementTab, TabButton } from './ReservationManagementTab';
import { ItemManagementTab } from './ItemManagementTab';

type AdminTab = 'reservations' | 'items';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>('reservations');

  return (
    <div className="min-h-screen bg-gray-100 p-8 font-sans">
      <header className="max-w-6xl mx-auto mb-8 flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">관리자 대시보드</h1>
        <Link to="/chat" className="text-sm text-indigo-600 hover:text-indigo-800 font-semibold">
          &larr; 챗봇 페이지로 돌아가기
        </Link>
      </header>

      <main className="max-w-6xl mx-auto">
        <div className="bg-white p-6 rounded-2xl shadow-lg">
          
          {/* --- 메인 탭 네비게이션 --- */}
          <div className="flex border-b border-gray-300 mb-4">
            <TabButton 
              label="예약 관리" 
              tabName="reservations" 
              activeTab={activeTab} 
              onClick={setActiveTab} 
            />
            <TabButton 
              label="물품 관리" 
              tabName="items" 
              activeTab={activeTab} 
              onClick={setActiveTab} 
            />
          </div>

          {/* --- 탭 컨텐츠 렌더링 --- */}
          {activeTab === 'reservations' && (
            <ReservationManagementTab />
          )}
          {activeTab === 'items' && (
            <ItemManagementTab />
          )}
          
        </div>
      </main>
    </div>
  );
}