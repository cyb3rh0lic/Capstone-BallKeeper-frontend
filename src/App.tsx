import React, { useEffect, useMemo, useState } from "react";

/** 타입: 탭 키 */
type Tab = "diag" | "auth" | "items" | "userResv" | "adminResv" | "chat";

/** 초기 백엔드 URL */
function defaultBaseUrl() {
  if (typeof window !== "undefined") {
    const { hostname } = window.location;
    if (hostname === "localhost" || hostname === "127.0.0.1")
      return "http://localhost:8080";
  }
  return "";
}
function joinUrl(base: string, path: string) {
  if (!base) return path;
  if (base.endsWith("/") && path.startsWith("/")) return base + path.slice(1);
  if (!base.endsWith("/") && !path.startsWith("/")) return base + "/" + path;
  return base + path;
}
function isLocalhostUrl(url: string) {
  try {
    const u = new URL(url);
    return u.hostname === "localhost" || u.hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

/** 공통 API 래퍼 */
async function api(baseUrl: string, path: string, options: RequestInit = {}) {
  const isGetLike = !options.method || options.method.toUpperCase() === "GET";
  const headers = new Headers(options.headers || {});
  if (!isGetLike && !headers.has("Content-Type"))
    headers.set("Content-Type", "application/json");

  let res: Response;
  try {
    res = await fetch(joinUrl(baseUrl, path), {
      mode: "cors",
      ...options,
      headers,
    });
  } catch (e: any) {
    const help =
      "네트워크/CORS 오류로 요청을 보내지 못했습니다. 서버 실행 여부와 CORS 설정, 그리고 Base URL을 확인하세요.";
    const reason = e?.message || String(e);
    throw new Error(`${help} (원인: ${reason})`);
  }

  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const msg =
      (data && (data.message || data.error || data.title)) ||
      `${res.status} ${res.statusText}`;
    throw new Error(msg);
  }
  return data;
}

/** 섹션 & JSON 출력 */
function Section({
  title,
  children,
  extra,
}: {
  title: string;
  children: React.ReactNode;
  extra?: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl shadow p-5 mb-6">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="text-xl font-semibold">{title}</h2>
        {extra}
      </div>
      {children}
    </div>
  );
}
function JsonBlock({ data }: { data: any }) {
  return (
    <pre className="bg-gray-50 rounded-lg p-3 text-sm overflow-auto max-h-64">
      {typeof data === "string" ? data : JSON.stringify(data, null, 2)}
    </pre>
  );
}

export default function App() {
  const [tab, setTab] = useState<Tab>("diag");

  // Base URL
  const [baseUrl, _setBaseUrl] = useState<string>(
    () => localStorage.getItem("bk_base_url") || defaultBaseUrl()
  );
  const setBaseUrl = (v: string) => {
    _setBaseUrl(v);
    localStorage.setItem("bk_base_url", v);
  };

  // 연결 상태
  const [serverOk, setServerOk] = useState<boolean | null>(null);
  const [serverMsg, setServerMsg] = useState<string>("");

  const connectivityCheck = async () => {
    if (typeof window !== "undefined" && baseUrl && isLocalhostUrl(baseUrl)) {
      const uiHost = window.location.hostname;
      if (uiHost !== "localhost" && uiHost !== "127.0.0.1") {
        setServerOk(false);
        setServerMsg(
          "이 UI는 원격에서 실행 중이라 사용자의 localhost:8080에 접속할 수 없습니다. 공개 URL 또는 로컬 실행이 필요합니다."
        );
        return;
      }
    }
    setServerMsg("서버 확인 중...");
    try {
      const doc = await api(baseUrl, "/v3/api-docs");
      setServerOk(true);
      setServerMsg(
        doc?.openapi
          ? "연결 성공: OpenAPI 문서 확인됨."
          : "연결 성공: /v3/api-docs 응답 수신."
      );
    } catch (e1: any) {
      try {
        await api(baseUrl, "/api/items");
        setServerOk(true);
        setServerMsg("연결 성공: /api/items 응답 수신.");
      } catch (e2: any) {
        setServerOk(false);
        setServerMsg(String(e2.message || e2));
      }
    }
  };
  useEffect(() => {
    connectivityCheck();
  }, [baseUrl]);

  // 의사 세션
  const [userId, setUserId] = useState<number | null>(null);
  const [adminId, setAdminId] = useState<number | null>(null);
  const isAuthed = useMemo(() => userId != null, [userId]);
  const isAdmin = useMemo(() => adminId != null, [adminId]);

  // 글로벌 알림
  const [notice, setNotice] = useState<{
    type: "error" | "info";
    msg: string;
  } | null>(null);
  const handle = async (fn: () => Promise<any>) => {
    try {
      await fn();
      setNotice(null);
    } catch (e: any) {
      setNotice({ type: "error", msg: String(e.message || e) });
    }
  };

  // 공통 데이터
  const [items, setItems] = useState<any[]>([]);
  const loadActiveItems = async () =>
    setItems(await api(baseUrl, "/api/items"));
  useEffect(() => {
    handle(loadActiveItems);
  }, [baseUrl]);

  // AUTH
  const [signupForm, setSignupForm] = useState({
    email: "",
    password: "",
    name: "",
    admin: false,
  });
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [authOut, setAuthOut] = useState<any>(null);
  const signup = async () => {
    const data = await api(baseUrl, "/api/users/signup", {
      method: "POST",
      body: JSON.stringify(signupForm),
    });
    setAuthOut(data);
    if (data.admin) setAdminId(data.id);
    setUserId(data.id);
  };
  const login = async () => {
    const data = await api(baseUrl, "/api/users/login", {
      method: "POST",
      body: JSON.stringify(loginForm),
    });
    setAuthOut(data);
    if (data.admin) setAdminId(data.id);
    setUserId(data.id);
  };

  // ITEM (ADMIN)
  const [newItem, setNewItem] = useState({ name: "", description: "" });
  const [itemOut, setItemOut] = useState<any>(null);
  const createItem = async () => {
    if (!adminId) throw new Error("관리자 로그인 필요");
    const data = await api(baseUrl, "/api/item", {
      method: "POST",
      body: JSON.stringify({ adminUserId: adminId, ...newItem }),
    });
    setItemOut(data);
    await loadActiveItems();
  };
  const toggleActive = async (id: number, active: boolean) => {
    if (!adminId) throw new Error("관리자 로그인 필요");
    await api(baseUrl, `/api/admin/items/${id}/active?active=${active}`, {
      method: "PATCH",
    });
    await loadActiveItems();
  };

  // USER RESERVATIONS
  const [resvForm, setResvForm] = useState({
    itemId: "",
    startTime: "",
    endTime: "",
  });
  const [myResv, setMyResv] = useState<any[]>([]);
  const [resvOut, setResvOut] = useState<any>(null);
  const createReservation = async () => {
    if (!userId) throw new Error("사용자 로그인 필요");
    const payload = {
      userId,
      itemId: Number(resvForm.itemId),
      startTime: resvForm.startTime,
      endTime: resvForm.endTime,
    };
    const data = await api(baseUrl, "/api/reservations", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    setResvOut(data);
  };
  const loadMyReservations = async () => {
    if (!userId) return;
    const data = await api(baseUrl, `/api/reservations/my?userId=${userId}`);
    setMyResv(data);
  };
  const cancelReservation = async (id: number) => {
    if (!userId) return;
    await api(baseUrl, `/api/reservations/${id}/cancel?userId=${userId}`, {
      method: "POST",
    });
    await loadMyReservations();
  };
  useEffect(() => {
    if (userId) handle(loadMyReservations);
  }, [userId, baseUrl]);

  // ADMIN RESERVATIONS
  const [pending, setPending] = useState<any[]>([]);
  const loadPending = async () =>
    setPending(await api(baseUrl, "/api/admin/reservations/pending"));
  const approve = async (id: number) => {
    if (!adminId) return;
    await api(
      baseUrl,
      `/api/admin/reservations/${id}/approve?adminId=${adminId}`,
      { method: "POST" }
    );
    await loadPending();
    await loadMyReservations();
  };
  const [rejectReason, setRejectReason] = useState("");
  const reject = async (id: number) => {
    if (!adminId) return;
    const params = new URLSearchParams({
      adminId: String(adminId),
      reason: rejectReason,
    });
    await api(
      baseUrl,
      `/api/admin/reservations/${id}/reject?${params.toString()}`,
      { method: "POST" }
    );
    setRejectReason("");
    await loadPending();
  };
  useEffect(() => {
    if (adminId) handle(loadPending);
  }, [adminId, baseUrl]);

  // CHAT
  const [chatMsg, setChatMsg] = useState("");
  const [chatOut, setChatOut] = useState<any>(null);
  const sendChat = async () => {
    if (!userId) throw new Error("사용자 로그인 필요");
    const data = await api(baseUrl, "/api/chat", {
      method: "POST",
      body: JSON.stringify({ userId, message: chatMsg }),
    });
    setChatOut(data);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-indigo-600 text-white p-5 shadow">
        <h1 className="text-2xl font-bold">BallKeeper Mini Console</h1>
        <p className="opacity-90 text-sm">
          간단한 UI로 회원/물품/예약/관리자/챗봇 플로우를 검증합니다.
        </p>
      </header>

      {/* Base URL + Connectivity */}
      <div className="p-4 bg-white border-b flex gap-2 items-center flex-wrap">
        <label className="text-sm font-medium">Backend Base URL</label>
        <input
          className="input w-80"
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          placeholder="http://localhost:8080"
        />
        <button className="btn" onClick={() => handle(connectivityCheck)}>
          연결 확인
        </button>
        {serverOk === true && <span className="badge ok">연결됨</span>}
        {serverOk === false && <span className="badge bad">연결 실패</span>}
        <span
          className="text-sm text-gray-700 truncate max-w-[40ch]"
          title={serverMsg}
        >
          {serverMsg}
        </span>
      </div>

      {/* CORS 가이드(연결 실패 시) */}
      {serverOk === false && (
        <div className="mx-4 mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm leading-relaxed">
          <b>요청 실패 원인 추정:</b> 백엔드가 꺼져 있거나 <b>CORS 미허용</b>{" "}
          상태일 수 있습니다.
          <br />
          백엔드를 <code>{baseUrl || "(Base URL 미설정)"}</code>에서 실행 중인지
          확인하고, 필요하면 아래 중 하나를 적용하세요:
          <ol className="list-decimal ml-5 mt-1">
            <li>
              스프링 컨트롤러에 <code>@CrossOrigin(origins = "*")</code> (또는
              정확한 Origin) 추가
            </li>
            <li>
              전역 CORS 설정(WebMvcConfigurer)에서 <code>addCorsMappings</code>
              로 <code>/**</code> 허용
            </li>
            <li>
              이 UI를 스프링 정적 리소스로 서빙(동일 오리진)하여 CORS 회피
            </li>
          </ol>
          {typeof window !== "undefined" &&
            baseUrl &&
            isLocalhostUrl(baseUrl) &&
            window.location.hostname !== "localhost" &&
            window.location.hostname !== "127.0.0.1" && (
              <div className="mt-2 p-2 bg-white border rounded-lg">
                <b>중요:</b> 현재 UI는 원격(예: 클라우드/에디터)에서 실행
                중입니다. 로컬 백엔드에 접근하려면:
                <ul className="list-decimal ml-5 mt-1">
                  <li>
                    이 React 앱을 로컬에서 실행(vite dev server)하고 Base URL을
                    http://localhost:8080 으로 사용
                  </li>
                  <li>
                    백엔드를 ngrok 등으로 공개 HTTPS URL로 노출 후 해당 URL을
                    Base URL에 입력
                  </li>
                  <li>
                    React 번들을 스프링 resources/static에 넣어 동일 오리진으로
                    서비스
                  </li>
                </ul>
              </div>
            )}
        </div>
      )}

      {/* 탭 네비게이션 */}
      <nav className="p-4 flex gap-2 flex-wrap">
        {[
          { k: "diag", t: "⓪ 진단" },
          { k: "auth", t: "① 회원/로그인" },
          { k: "items", t: "② 물품(관리자)" },
          { k: "userResv", t: "③ 내 예약" },
          { k: "adminResv", t: "④ 관리자 승인" },
          { k: "chat", t: "⑤ 챗봇" },
        ].map(({ k, t }) => (
          <button
            key={k}
            onClick={() => setTab(k as Tab)}
            className={`tab ${tab === (k as Tab) ? "tab-active" : "tab-idle"}`}
          >
            {t}
          </button>
        ))}
        <div className="ml-auto text-sm">
          <span className="mr-3">
            👤 사용자: {isAuthed ? `#${userId}` : "-"}
          </span>
          <span>🛡️ 관리자: {isAdmin ? `#${adminId}` : "-"}</span>
        </div>
      </nav>

      {/* 본문 */}
      <main className="max-w-6xl mx-auto p-4">
        {notice && (
          <div
            className={`mb-4 p-3 rounded-xl text-sm ${
              notice.type === "error"
                ? "bg-red-50 border border-red-200 text-red-800"
                : "bg-blue-50 border border-blue-200 text-blue-800"
            }`}
          >
            {notice.msg}
          </div>
        )}

        {tab === "diag" && (
          <Section
            title="연결 진단(읽기 테스트)"
            extra={
              <button
                className="btn btn-sm"
                onClick={() => handle(connectivityCheck)}
              >
                다시 확인
              </button>
            }
          >
            <p className="mb-2 text-sm text-gray-700">
              아래 버튼으로 가벼운 호출을 해보세요. (테스트 케이스 역할)
            </p>
            <div className="flex gap-2 flex-wrap">
              <button
                className="btn"
                onClick={() =>
                  handle(async () => {
                    const r = await api(baseUrl, "/v3/api-docs");
                    setNotice({
                      type: "info",
                      msg: `OpenAPI ok. title: ${
                        r?.info?.title || "(unknown)"
                      }`,
                    });
                  })
                }
              >
                /v3/api-docs
              </button>
              <button
                className="btn"
                onClick={() =>
                  handle(async () => {
                    const r = await api(baseUrl, "/api/items");
                    setNotice({
                      type: "info",
                      msg: `활성 물품 ${
                        Array.isArray(r) ? r.length : 0
                      }건 조회 성공`,
                    });
                  })
                }
              >
                GET /api/items
              </button>
            </div>
            <div className="mt-3 text-xs text-gray-600">
              실패 시 <b>서버 실행</b>, <b>포트/주소</b>, <b>CORS 허용</b>을
              확인하세요.
            </div>
          </Section>
        )}

        {tab === "auth" && (
          <>
            <Section title="회원가입">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                <input
                  className="input"
                  placeholder="email"
                  value={signupForm.email}
                  onChange={(e) =>
                    setSignupForm({ ...signupForm, email: e.target.value })
                  }
                />
                <input
                  className="input"
                  placeholder="password"
                  type="password"
                  value={signupForm.password}
                  onChange={(e) =>
                    setSignupForm({ ...signupForm, password: e.target.value })
                  }
                />
                <input
                  className="input"
                  placeholder="name"
                  value={signupForm.name}
                  onChange={(e) =>
                    setSignupForm({ ...signupForm, name: e.target.value })
                  }
                />
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={signupForm.admin}
                    onChange={(e) =>
                      setSignupForm({ ...signupForm, admin: e.target.checked })
                    }
                  />
                  관리자
                </label>
                <button className="btn" onClick={() => handle(signup)}>
                  회원가입
                </button>
              </div>
            </Section>

            <Section title="로그인">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <input
                  className="input"
                  placeholder="email"
                  value={loginForm.email}
                  onChange={(e) =>
                    setLoginForm({ ...loginForm, email: e.target.value })
                  }
                />
                <input
                  className="input"
                  placeholder="password"
                  type="password"
                  value={loginForm.password}
                  onChange={(e) =>
                    setLoginForm({ ...loginForm, password: e.target.value })
                  }
                />
                <button className="btn" onClick={() => handle(login)}>
                  로그인
                </button>
                <button
                  className="btn btn-ghost"
                  onClick={() => {
                    setUserId(null);
                    setAdminId(null);
                    setAuthOut(null);
                    setNotice({ type: "info", msg: "로그아웃되었습니다." });
                  }}
                >
                  로그아웃
                </button>
              </div>
            </Section>

            <Section title="응답">
              <JsonBlock data={authOut} />
            </Section>
          </>
        )}

        {tab === "items" && (
          <>
            <Section
              title="활성 물품 목록"
              extra={
                <button
                  className="btn btn-sm"
                  onClick={() => handle(loadActiveItems)}
                >
                  새로고침
                </button>
              }
            >
              <div className="space-y-2">
                {items.map((it: any) => (
                  <div
                    key={it.id}
                    className="p-3 bg-gray-50 rounded-lg flex items-center justify-between"
                  >
                    <div>
                      <div className="font-medium">
                        #{it.id} {it.name}
                      </div>
                      <div className="text-sm text-gray-600">
                        {it.description}
                      </div>
                    </div>
                    <div className="flex gap-2 items-center">
                      <span className={`chip ${it.active ? "ok" : "bad"}`}>
                        {it.active ? "ACTIVE" : "INACTIVE"}
                      </span>
                      <button
                        className="btn btn-warn"
                        onClick={() =>
                          handle(() => toggleActive(it.id, !it.active))
                        }
                      >
                        {it.active ? "비활성화" : "활성화"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </Section>

            <Section title="물품 등록 (관리자)">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <input
                  className="input"
                  placeholder="name"
                  value={newItem.name}
                  onChange={(e) =>
                    setNewItem({ ...newItem, name: e.target.value })
                  }
                />
                <input
                  className="input"
                  placeholder="description"
                  value={newItem.description}
                  onChange={(e) =>
                    setNewItem({ ...newItem, description: e.target.value })
                  }
                />
                <button className="btn" onClick={() => handle(createItem)}>
                  등록
                </button>
                <div className="text-sm text-gray-600 flex items-center">
                  관리자 로그인 필요
                </div>
              </div>
              <div className="mt-3">
                <JsonBlock data={itemOut} />
              </div>
            </Section>
          </>
        )}

        {tab === "userResv" && (
          <>
            <Section title="예약 생성">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                <select
                  className="input"
                  value={resvForm.itemId}
                  onChange={(e) =>
                    setResvForm({ ...resvForm, itemId: e.target.value })
                  }
                >
                  <option value="">물품 선택</option>
                  {items.map((it: any) => (
                    <option key={it.id} value={it.id}>
                      #{it.id} {it.name}
                    </option>
                  ))}
                </select>
                <input
                  className="input"
                  type="datetime-local"
                  value={resvForm.startTime}
                  onChange={(e) =>
                    setResvForm({ ...resvForm, startTime: e.target.value })
                  }
                />
                <input
                  className="input"
                  type="datetime-local"
                  value={resvForm.endTime}
                  onChange={(e) =>
                    setResvForm({ ...resvForm, endTime: e.target.value })
                  }
                />
                <button
                  className="btn"
                  onClick={() => handle(createReservation)}
                >
                  예약
                </button>
                <button
                  className="btn btn-ghost"
                  onClick={() => setResvOut(null)}
                >
                  초기화
                </button>
              </div>
              <div className="mt-3">
                <JsonBlock data={resvOut} />
              </div>
            </Section>

            <Section
              title="내 예약 목록"
              extra={
                <button
                  className="btn btn-sm"
                  onClick={() => handle(loadMyReservations)}
                >
                  새로고침
                </button>
              }
            >
              <div className="space-y-2">
                {myResv.map((r: any) => (
                  <div
                    key={r.id}
                    className="p-3 bg-gray-50 rounded-lg flex items-center justify-between"
                  >
                    <div>
                      <div className="font-medium">
                        #{r.id} {r.itemName}{" "}
                        <span className="text-xs text-gray-600">
                          (item {r.itemId})
                        </span>
                      </div>
                      <div className="text-sm text-gray-700">
                        {r.startTime} ~ {r.endTime}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`chip ${
                          r.status === "APPROVED"
                            ? "ok"
                            : r.status === "PENDING"
                            ? "warn"
                            : r.status === "REJECTED"
                            ? "bad"
                            : "muted"
                        }`}
                      >
                        {r.status}
                      </span>
                      {r.status !== "CANCELLED" && (
                        <button
                          className="btn btn-warn"
                          onClick={() => handle(() => cancelReservation(r.id))}
                        >
                          취소
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          </>
        )}

        {tab === "adminResv" && (
          <>
            <Section
              title="대기중 예약 (관리자)"
              extra={
                <button
                  className="btn btn-sm"
                  onClick={() => handle(loadPending)}
                >
                  새로고침
                </button>
              }
            >
              <div className="mb-2 flex gap-2">
                <input
                  className="input max-w-xs"
                  placeholder="반려 사유"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                {pending.map((p: any) => (
                  <div key={p.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium">
                          예약 #{p.id} / 사용자 {p.userName} (#{p.userId})
                        </div>
                        <div className="text-sm text-gray-700">
                          아이템 {p.itemName} (#{p.itemId}) / {p.startTime} ~{" "}
                          {p.endTime}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          className="btn"
                          onClick={() => handle(() => approve(p.id))}
                        >
                          승인
                        </button>
                        <button
                          className="btn btn-warn"
                          onClick={() => handle(() => reject(p.id))}
                        >
                          반려
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          </>
        )}

        {tab === "chat" && (
          <Section title="예약 챗봇">
            <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
              <input
                className="input md:col-span-5"
                placeholder="메시지를 입력하세요. 예: 내일 10~11시, 아이템 1 예약"
                value={chatMsg}
                onChange={(e) => setChatMsg(e.target.value)}
              />
              <button className="btn" onClick={() => handle(sendChat)}>
                전송
              </button>
            </div>
            <div className="mt-3">
              <JsonBlock data={chatOut} />
            </div>
          </Section>
        )}
      </main>

      {/* 스타일 */}
      <style>{`
      html, body { color:#111827; }
        :root { --indigo:#4f46e5; --indigo-700:#4338ca; --red:#ef4444; --amber:#f59e0b; --green:#16a34a; --gray-100:#f5f5f5; --gray-200:#e5e7eb; --gray-600:#4b5563; }
        body { margin:0; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Noto Sans, Ubuntu, Cantarell, Helvetica Neue, Arial, "Apple Color Emoji", "Segoe UI Emoji"; }
        .bg-gray-100 { background:#f3f4f6; }
        .bg-white { background:#fff; }
        .rounded-2xl { border-radius: 1rem; } .rounded-xl { border-radius: 0.75rem; } .rounded-lg { border-radius: 0.5rem; }
        .shadow { box-shadow: 0 10px 15px -3px rgba(0,0,0,.1), 0 4px 6px -2px rgba(0,0,0,.05); }
        .p-5 { padding:1.25rem; } .p-4{padding:1rem;} .p-3{padding:.75rem;} .py-2{padding:.5rem 0;} .px-3{padding:0 .75rem;}
        .mb-6{margin-bottom:1.5rem;} .mb-4{margin-bottom:1rem;} .mb-3{margin-bottom:.75rem;} .mt-3{margin-top:.75rem;}
        .text-xl{font-size:1.25rem;} .text-2xl{font-size:1.5rem;} .text-sm{font-size:.875rem;} .text-xs{font-size:.75rem;}
        .font-semibold{font-weight:600;} .font-medium{font-weight:500;}
        .bg-indigo-600 { background: var(--indigo); } .text-white{ color:#fff; }
        .opacity-90 { opacity:.9; }
        .border { border:1px solid var(--gray-200); } .border-b{ border-bottom:1px solid var(--gray-200); }
        .max-w-6xl{ max-width:72rem; } .mx-auto{ margin-left:auto; margin-right:auto; }
        .flex{display:flex;} .items-center{align-items:center;} .justify-between{justify-content:space-between;} .justify-center{justify-content:center;}
        .gap-2{gap:.5rem;} .gap-3{gap:.75rem;} .flex-wrap{flex-wrap:wrap;} .ml-auto{margin-left:auto;}
        .grid{display:grid;} .grid-cols-1{grid-template-columns:repeat(1,minmax(0,1fr));}
        @media (min-width:768px){ .md\\:grid-cols-4{grid-template-columns:repeat(4,minmax(0,1fr));} .md\\:grid-cols-5{grid-template-columns:repeat(5,minmax(0,1fr));} .md\\:grid-cols-6{grid-template-columns:repeat(6,minmax(0,1fr));} .md\\:col-span-5{grid-column:span 5 / span 5;} }
        .bg-gray-50{ background:#f9fafb; }
        .text-gray-600{ color:#4b5563; } .text-gray-700{ color:#374151; }

        .truncate{ overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .list-decimal{ list-style:decimal; }
        .ml-5{ margin-left:1.25rem; }
        .max-w-\\[40ch\\]{ max-width:40ch; }
        .w-80{ width:20rem; }

        .input { background:#fff; border:1px solid var(--gray-200); border-radius:.75rem; padding:.5rem .75rem; color:#111827; 
  caret-color:#111827;}
        .btn { background: var(--indigo); color:#fff; border:none; border-radius:.75rem; padding:.5rem .75rem; cursor:pointer; }
        .btn:hover { background: var(--indigo-700); }
        .btn:disabled{
          background:#e5e7eb; color:#6b7280; border:1px solid #d1d5db; opacity:1; cursor:not-allowed; box-shadow:none;
        }
        .btn-sm { padding:.35rem .6rem; font-size:.8rem; }
        .btn-ghost { background:#e5e7eb; color:#1f2937; }
        .btn-ghost:hover { filter:brightness(.95); }
        .btn-warn { background:#fde68a; color:#78350f; }
        .btn-warn:hover { filter:brightness(.95); }

        .badge { padding:.2rem .5rem; border-radius:9999px; font-size:.75rem; }
        .badge.ok { background:#dcfce7; color:#166534; }
        .badge.bad { background:#fee2e2; color:#991b1b; }

        .chip { font-size:.75rem; padding:.2rem .5rem; border-radius:9999px; }
        .chip.ok { background:#dcfce7; color:#166534; }
        .chip.warn { background:#fef9c3; color:#854d0e; }
        .chip.bad { background:#fee2e2; color:#991b1b; }
        .chip.muted { background:#e5e7eb; color:#374151; }

        /* 탭 버튼 스타일 (비활성도 선명하게) */
        .tab{
          padding:.5rem .9rem;
          border-radius:.75rem;
          font-size:.9rem;
          font-weight:600;
          border:1px solid #e5e7eb;
          background:#fff;
          color:#1f2937;
          box-shadow:0 1px 2px rgba(0,0,0,.04);
        }
        .tab:hover{ filter:brightness(.98); }
        .tab-active{
          background:var(--indigo);
          color:#fff;
          border-color:transparent;
          box-shadow:0 2px 8px rgba(79,70,229,.35);
        }
        .tab-idle{ /* base 스타일 그대로 사용 */ }
      `}</style>
    </div>
  );
}
