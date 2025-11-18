import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';
import { useAuthStore } from '../store/authStore';
import { Modal } from '../components/Modal';
import { ToggleSwitch } from '../components/ToggleSwitch';

type Item = {
  id: number;
  name: string;
  description: string;
  active: boolean;
};

// 물품 관리 탭 컴포넌트
export function ItemManagementTab() {
  const user = useAuthStore((state) => state.user);
  
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 모달 상태
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemDesc, setNewItemDesc] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 물품 목록 불러오기
  const fetchItems = async () => {
    setIsLoading(true);
    // user 객체가 있는지 확인 (user.id를 사용해야 하므로)
    if (!user) {
        setError("로그인 정보가 없습니다. 다시 로그인해주세요.");
        setIsLoading(false);
        return;
    }

    try {
    // API 호출 시 adminId 쿼리 파라미터를 추가
        const data = await apiClient.get<Item[]>(`/api/admin/items/all?adminId=${user.id}`);
        setItems(data);
        setError(null);
    } catch (err: any) {
        setError(`물품 목록 로딩 실패: ${err.message}.`);
        setItems([]);
    } finally {
        setIsLoading(false);
    }
  };


  useEffect(() => {
    fetchItems();
  }, []);

  // 물품 활성/비활성 토글
  const handleToggleActive = async (item: Item) => {
    if (!user) return;
    const newActiveState = !item.active;
    
    // 낙관적 업데이트 (UI 먼저 변경)
    setItems(prevItems => 
      prevItems.map(it => 
        it.id === item.id ? { ...it, active: newActiveState } : it
      )
    );

    try {
      // 백엔드에 /api/admin/items/{id}/active API가 필요합니다.
      await apiClient.patch(`/api/admin/items/${item.id}/active?active=${newActiveState}&adminId=${user.id}`);
    } catch (err: any) {
      alert(`상태 변경 실패: ${err.message}`);
      // 실패 시 롤백
      setItems(prevItems => 
        prevItems.map(it => 
          it.id === item.id ? { ...it, active: item.active } : it
        )
      );
    }
  };

  // 새 물품 등록
  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newItemName.trim()) {
      alert('물품 이름을 입력하세요.');
      return;
    }
    setIsSubmitting(true);
    try {
      // 백엔드 POST /api/item API 활용 [cite]
      await apiClient.post('/api/item', {
        adminUserId: user.id,
        name: newItemName,
        description: newItemDesc,
      });
      alert('새 물품이 등록되었습니다.');
      setIsModalOpen(false);
      setNewItemName('');
      setNewItemDesc('');
      fetchItems(); // 목록 새로고침
    } catch (err: any) {
      alert(`물품 등록 실패: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700 transition"
        >
          + 새 물품 추가
        </button>
      </div>

      <hr className="my-4" />

      {isLoading && <p className="text-center text-gray-500">물품 목록을 불러오는 중...</p>}
      {error && <p className="text-center text-red-500">{error}</p>}

      <div className="space-y-4">
        {!isLoading && items.length === 0 && (
          <p className="text-center text-gray-500">등록된 물품이 없습니다.</p>
        )}
        
        {items.map((item) => (
          <div key={item.id} className="p-4 border border-gray-200 rounded-lg bg-gray-50 flex justify-between items-center gap-4">
            <div className="flex-1">
              <div className="font-bold text-lg text-gray-900">
                {item.name} <span className="text-sm font-medium text-gray-500">(#{item.id})</span>
              </div>
              <p className="text-sm text-gray-700 mt-1">{item.description}</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <ToggleSwitch
                checked={item.active}
                onChange={() => handleToggleActive(item)}
              />
              <span className={`text-xs font-medium ${item.active ? 'text-green-600' : 'text-gray-500'}`}>
                {item.active ? '활성' : '비활성'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* 새 물품 추가 모달 */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="새 물품 추가"
      >
        <form onSubmit={handleCreateItem}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">물품 이름 *</label>
              <input
                type="text"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">물품 설명</label>
              <textarea
                value={newItemDesc}
                onChange={(e) => setNewItemDesc(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="py-2 px-4 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition"
                disabled={isSubmitting}
              >
                취소
              </button>
              <button
                type="submit"
                className="py-2 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                disabled={isSubmitting}
              >
                {isSubmitting ? '등록 중...' : '등록'}
              </button>
            </div>
          </div>
        </form>
      </Modal>
    </>
  );
}