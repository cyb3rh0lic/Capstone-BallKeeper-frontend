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

export function ItemManagementTab() {
  const user = useAuthStore((state) => state.user);
  
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 모달 상태 (생성/수정 공용)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create'); // 모드 구분
  const [editTargetId, setEditTargetId] = useState<number | null>(null);   // 수정할 아이템 ID
  
  const [itemName, setItemName] = useState('');
  const [itemDesc, setItemDesc] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 물품 목록 불러오기
  const fetchItems = async () => {
    setIsLoading(true);
    if (!user) return;
    try {
      const data = await apiClient.get<Item[]>(`/api/admin/items/all?adminId=${user.id}`);
      setItems(data);
      setError(null);
    } catch (err: any) {
      setError(`물품 목록 로딩 실패: ${err.message}`);
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  // 토글 핸들러 (기존 동일)
  const handleToggleActive = async (item: Item) => {
    if (!user) return;
    const newActiveState = !item.active;
    setItems(prevItems => prevItems.map(it => it.id === item.id ? { ...it, active: newActiveState } : it));
    try {
      await apiClient.patch(`/api/admin/items/${item.id}/active?active=${newActiveState}&adminId=${user.id}`);
    } catch (err: any) {
      alert(`상태 변경 실패: ${err.message}`);
      setItems(prevItems => prevItems.map(it => it.id === item.id ? { ...it, active: item.active } : it));
    }
  };

  // 모달 열기 (생성 모드)
  const openCreateModal = () => {
    setModalMode('create');
    setItemName('');
    setItemDesc('');
    setIsModalOpen(true);
  };

  // 모달 열기 (수정 모드)
  const openEditModal = (item: Item) => {
    setModalMode('edit');
    setEditTargetId(item.id);
    setItemName(item.name);
    setItemDesc(item.description);
    setIsModalOpen(true);
  };

  // 폼 제출 핸들러 (생성/수정 분기)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !itemName.trim()) return;
    
    setIsSubmitting(true);
    try {
      if (modalMode === 'create') {
        // 생성
        await apiClient.post('/api/item', {
          adminUserId: user.id,
          name: itemName,
          description: itemDesc,
        });
        alert('새 물품이 등록되었습니다.');
      } else {
        // 수정
        if (editTargetId === null) return;
        await apiClient.put(`/api/admin/items/${editTargetId}?adminId=${user.id}`, {
          name: itemName,
          description: itemDesc,
        });
        alert('물품 정보가 수정되었습니다.');
      }
      
      setIsModalOpen(false);
      fetchItems(); // 목록 새로고침
    } catch (err: any) {
      alert(`요청 실패: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="flex justify-end mb-4">
        <button
          onClick={openCreateModal}
          className="bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700 transition"
        >
          + 새 물품 추가
        </button>
      </div>

      <hr className="my-4" />

      {isLoading && <p className="text-center text-gray-500">로딩 중...</p>}
      {error && <p className="text-center text-red-500">{error}</p>}

      <div className="space-y-4">
        {!isLoading && items.length === 0 && (
          <p className="text-center text-gray-500">등록된 물품이 없습니다.</p>
        )}
        
        {items.map((item) => (
          <div key={item.id} className="p-4 border border-gray-200 rounded-lg bg-gray-50 flex justify-between items-center gap-4">
            <div className="flex-1">
              <div className="font-bold text-lg text-gray-900 flex items-center gap-2">
                {item.name}
                <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded">ID: {item.id}</span>
              </div>
              <p className="text-sm text-gray-700 mt-1">{item.description}</p>
            </div>
            
            <div className="flex items-center gap-4">
              {/* 수정 버튼 */}
              <button
                onClick={() => openEditModal(item)}
                className="text-sm text-gray-500 hover:text-indigo-600 font-medium underline"
              >
                수정
              </button>

              {/* 토글 스위치 */}
              <div className="flex flex-col items-end gap-1 w-16">
                <ToggleSwitch
                  checked={item.active}
                  onChange={() => handleToggleActive(item)}
                />
                <span className={`text-[10px] font-bold ${item.active ? 'text-green-600' : 'text-gray-400'}`}>
                  {item.active ? 'ACTIVE' : 'INACTIVE'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 생성/수정 모달 */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modalMode === 'create' ? "새 물품 추가" : "물품 정보 수정"}
      >
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">물품 이름 *</label>
              <input
                type="text"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">물품 설명</label>
              <textarea
                value={itemDesc}
                onChange={(e) => setItemDesc(e.target.value)}
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
                {isSubmitting ? '처리 중...' : (modalMode === 'create' ? '등록' : '수정 완료')}
              </button>
            </div>
          </div>
        </form>
      </Modal>
    </>
  );
}

// 기본(default) 내보내기: 편의상 default export도 추가
export default ItemManagementTab;