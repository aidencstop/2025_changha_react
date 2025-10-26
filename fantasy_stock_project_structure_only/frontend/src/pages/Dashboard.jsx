// frontend/src/pages/Dashboard.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import './Dashboard.css';

function money(n = 0) {
  return Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function pct(n = 0) {
  // n은 비율(예: 0.0345)을 기대함 → 3.45%
  return `${(Number(n || 0) * 100).toFixed(2)}%`;
}
function fmtDateYmd(d) {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '—';
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${y}.${m}.${day}.`;
}
function toNum(n, fallback = null) {
  const v = Number(n);
  return Number.isFinite(v) ? v : fallback;
}
// Balance는 "총자산"을 우선으로 표기 (total_asset → cash → cash_balance → available_cash)
function getBalance(obj) {
  return (
    toNum(obj?.total_asset) ??
    toNum(obj?.cash) ??
    toNum(obj?.cash_balance) ??
    toNum(obj?.available_cash) ??
    null
  );
}

export default function Dashboard() {
  const navigate = useNavigate();

  // ── 티커바/뉴스 ────────────────────────────────────────────────────────────
  const [tickers, setTickers] = useState([]);
  const [news, setNews] = useState({
    title: '',
    url: '',
    summary: '',
    image: '',
    loading: true,
    error: '',
  });

  // ── 내 포트폴리오 요약 & 상위3 ─────────────────────────────────────────────
  const [loadingPortfolio, setLoadingPortfolio] = useState(true);
  const [summary, setSummary] = useState({
    starting_cash: 0,
    cash: 0,
    total_stock_value: 0,
    total_asset: 0,
    return_pct: 0, // (%) 값
  });
  const [portfolioTop, setPortfolioTop] = useState([]); // 수익률 상위 3

  // ── 시즌 리더보드(실제값) ─────────────────────────────────────────────────
  const [lbUsers, setLbUsers] = useState([]);
  const [lbLoading, setLbLoading] = useState(true);
  const [lbError, setLbError] = useState('');

  // ── 최신 거래 목록(실제값) ─────────────────────────────────────────────────
  const [txItems, setTxItems] = useState([]);
  const [txLoading, setTxLoading] = useState(true);
  const [txError, setTxError] = useState('');

  // ── 진행 중(Active) 리그 존재 여부/ID ──────────────────────────────────────
  const [activeLeagueId, setActiveLeagueId] = useState(null);
  const [hasActiveLeague, setHasActiveLeague] = useState(null); // null=초기/로딩, true/false 확정

  // ── 진행 중(Active) 리그 id 조회 헬퍼 ──────────────────────────────────────
  const getActiveLeagueId = async () => {
    try {
      const { data } = await api.get('/leagues/my/');
      const lg = data?.league;
      const st = (lg?.status || lg?.state || '').toUpperCase();
      if (lg?.id && st === 'ACTIVE') return lg.id;
    } catch (_) {
      // ignore
    }
    return null;
  };

  // ── 데이터 로드 ─────────────────────────────────────────────────────────────
  useEffect(() => {
    let alive = true;

    const loadTickerbar = async () => {
      try {
        const { data } = await api.get('/stocks/tickerbar/');
        if (!alive) return;
        const items = Array.isArray(data?.items) ? data.items : [];
        setTickers(items.filter(it => it && typeof it.sym === 'string'));
      } catch {
        if (!alive) return;
        setTickers([]);
      }
    };

    const loadNews = async () => {
      try {
        const { data } = await api.get('/stocks/news/yahoo-top/', { params: { limit: 3, fetch_og: 0 } });
        if (!alive) return;
        const desc = data?.description || '';
        setNews({
          title: data?.title || '',
          url: data?.url || 'https://finance.yahoo.com/news/',
          summary: desc.slice(0, 220) + (desc.length > 220 ? '…' : ''),
          image: data?.image || '',
          loading: false,
          error: '',
        });
      } catch {
        if (!alive) return;
        setNews({
          title: 'Top stories on Yahoo Finance',
          url: 'https://finance.yahoo.com/news/',
          summary: 'Check out the latest financial headlines.',
          image: '',
          loading: false,
          error: 'unavailable',
        });
      }
    };

    // MyPortfolioView 방식: /stocks/my-portfolio/
    const loadPortfolio = async () => {
      setLoadingPortfolio(true);
      try {
        const { data } = await api.get('/stocks/my-portfolio/');
        if (!alive) return;

        const nextSummary = {
          starting_cash: Number(data?.starting_cash ?? 0),
          cash: Number(data?.cash ?? 0),
          total_stock_value: Number(data?.total_stock_value ?? 0),
          total_asset: Number(data?.total_asset ?? 0),
          return_pct: Number(data?.return_pct ?? 0), // ex) 3.45 (percent)
        };
        setSummary(nextSummary);

        const holdings = Array.isArray(data?.holdings) ? data.holdings : [];

        // 수익률 기준 상위 최대 3개 (p.pnl_pct = %값 → 비율로 변환)
        const top3 = [...holdings]
          .map(r => ({
            sym: r.symbol,
            name: r.symbol, // 종목명 없으면 심볼로
            market_value: Number(r.evaluation ?? 0),
            return_pct: Number(r.pnl_pct ?? 0) / 100,
          }))
          .sort((a, b) => b.return_pct - a.return_pct)
          .slice(0, 3);

        setPortfolioTop(top3);
      } catch {
        if (!alive) return;
        setSummary({
          starting_cash: 0,
          cash: 0,
          total_stock_value: 0,
          total_asset: 0,
          return_pct: 0,
        });
        setPortfolioTop([]);
      } finally {
        if (alive) setLoadingPortfolio(false);
      }
    };

    // 시즌 유저 목록 → user-portfolio로 보강 후 정렬
    const loadLeaderboard = async () => {
      setLbLoading(true);
      setLbError('');
      try {
        // 1) 시즌 유저
        const { data } = await api.get('/stocks/season-users/');
        const baseList = Array.isArray(data) ? data : [];

        // 2) 병렬 보강 (user-portfolio)
        const tasks = baseList.map((u) =>
          api
            .get(`/stocks/user-portfolio/${u.user_id}/`)
            .then((res) => ({ id: u.user_id, data: res.data }))
            .catch(() => ({ id: u.user_id, data: null }))
        );
        const results = await Promise.all(tasks);

        const merged = baseList.map((u) => {
          const m = results.find((r) => r.id === u.user_id)?.data;
          const out = { ...u };

          // 수익/총자산/수익률/초기자금 보강
          if ((out.total_asset ?? 0) === 0 && m?.total_asset != null) out.total_asset = m.total_asset;
          if ((out.pnl ?? 0) === 0 && m?.pnl != null) out.pnl = m.pnl; // 참고값
          if ((out.return_pct ?? 0) === 0 && m?.return_pct != null) out.return_pct = m.return_pct; // %값
          if (out.starting_cash == null && m?.starting_cash != null) out.starting_cash = m.starting_cash;

          // 🔸 Balance 보강(최우선)
          const balFromM = getBalance(m);
          const balFromU = getBalance(out);
          if (balFromM != null) out.balance = balFromM;
          else if (balFromU != null) out.balance = balFromU;

          return out;
        });

        // 3) 정렬: 수익률(%) 내림차순 → 동률 시 규칙 PNL(=balance - starting_cash) 절대액 내림차순
        const sorted = [...merged].sort((a, b) => {
          const aPct = Number(a.return_pct ?? 0);
          const bPct = Number(b.return_pct ?? 0);
          if (bPct !== aPct) return bPct - aPct;
          const aBal = getBalance(a) ?? 0;
          const bBal = getBalance(b) ?? 0;
          const aSC = Number(a.starting_cash ?? summary.starting_cash ?? 0);
          const bSC = Number(b.starting_cash ?? summary.starting_cash ?? 0);
          const aRulePnl = aBal - aSC;
          const bRulePnl = bBal - bSC;
          return Math.abs(bRulePnl) - Math.abs(aRulePnl);
        });

        if (!alive) return;
        setLbUsers(sorted);
      } catch (e) {
        if (!alive) return;
        setLbError(e?.response?.data?.detail || 'Could not load leaderboard.');
        setLbUsers([]);
      } finally {
        if (alive) setLbLoading(false);
      }
    };

    // 최신 거래 최대 5건 (진행 중인 리그 한정)
    const loadLatestTx = async (forceLeagueId = null) => {
      setTxLoading(true);
      setTxError('');
      try {
        // 1) 내 Active 리그 id 조회(전달되면 우선 사용)
        const leagueId = forceLeagueId ?? await getActiveLeagueId();

        // 2) 서버가 지원하면 league_id 또는 league 로 필터링 (둘 다 넣어서 호환성 확보)
        const params = { page: 1, page_size: 5 };
        if (leagueId != null) {
          params.league_id = leagueId;
          params.league = leagueId;
        }

        const { data } = await api.get('/stocks/trade-history/', { params });
        const raw = Array.isArray(data?.results || data) ? (data.results || data) : [];

        // 3) 클라이언트 보정 필터 (서버가 필터 못 했을 경우 대비)
        const filtered = leagueId != null
          ? raw.filter(t => {
              // 서버 응답 형태별 모든 케이스 방어
              const lid =
                t?.league_id ??
                t?.league ??                // 숫자 ID 직접 제공되는 케이스
                t?.leagueId ??
                t?.league?.id;
              const a = Number(lid);
              const b = Number(leagueId);
              return Number.isFinite(a) && Number.isFinite(b) && a === b;
            })
          : raw;

        // 4) 최대 5개로 제한
        const items = filtered.slice(0, 5);

        // 5) 표시에 맞게 매핑
        const mapped = items
          .map((t) => {
            const who = t.symbol || t.ticker || t.name || '';
            const sideRaw = t.side || t.action || '';
            const side = String(sideRaw || '').toLowerCase();
            const isBuy = side.startsWith('b');   // buy
            const isSell = side.startsWith('s');  // sell

            const price = Number(t.price ?? t.fill_price ?? t.executed_price ?? 0);
            const qty = Number(t.quantity ?? t.qty ?? 0);
            const amt = price * qty;
            const signedAmt = (isBuy ? -1 : 1) * amt;

            return {
              who,
              side: sideRaw || '',
              amt: Number.isFinite(signedAmt) ? signedAmt : 0,
              cur: t.currency || t.ccy || 'USD',
              when: fmtDateYmd(t.timestamp || t.created_at || t.date),
            };
          })
          .filter(x => x.who || x.side || x.amt || x.when);

        setTxItems(mapped);
      } catch (e) {
        setTxError(e?.response?.data?.detail || 'Failed to load recent transactions.');
        setTxItems([]);
      } finally {
        setTxLoading(false);
      }
    };

    // ── 초기화: Active 리그 확인 후 섹션 로딩 제어 ───────────────────────────
    const init = async () => {
      const id = await getActiveLeagueId();
      if (!alive) return;
      setActiveLeagueId(id);
      setHasActiveLeague(!!id);

      // 티커바/뉴스는 리그와 무관 → 항상 로드(기존 동작 유지)
      loadTickerbar();
      loadNews();

      if (id) {
        await Promise.all([
          loadPortfolio(),
          loadLeaderboard(),
          loadLatestTx(id),
        ]);
      } else {
        // 리그가 없을 때: 각 섹션을 안내문이 바로 보이도록 로딩 해제/초기화
        setLoadingPortfolio(false);
        setSummary({
          starting_cash: 0,
          cash: 0,
          total_stock_value: 0,
          total_asset: 0,
          return_pct: 0,
        });
        setPortfolioTop([]);

        setLbLoading(false);
        setLbUsers([]);
        setLbError('');

        setTxLoading(false);
        setTxItems([]);
        setTxError('');
      }
    };

    init();
    return () => { alive = false; };
  }, []);

  // ── 파생 표시값 ─────────────────────────────────────────────────────────────
  const pnlAbs = Number(summary.total_asset) - Number(summary.starting_cash);
  const pnlPctForChip = Number(summary.return_pct) / 100; // % → 비율

  // ── UI ──────────────────────────────────────────────────────────────────────
  return (
    <div id="fs-dashboard" className="fs-page fs-dashboard">
      {/* 헤더 */}
      <header className="fs-dash-head">
        <div>
          <h1 className="fs-dash-title">Dashboard</h1>
          <div className="fs-dash-sub">Check your investment performance at a glance</div>
        </div>
      </header>

      {/* 티커바 */}
      <div className="fs-tickerbar">
        <div className="fs-tickerbar__track">
          {(tickers.length ? tickers.concat(tickers) : []).map((t, i) => (
            <div className="fs-ticker" key={`${t.sym}-${i}`}>
              <span className="dot" />
              <span className="sym">{t.sym}</span>
              <span className="price">${Number(t.price ?? 0).toFixed(2)}</span>
              <span className={`chg ${Number(t.chg ?? 0) >= 0 ? 'up' : 'dn'}`}>
                {Number(t.chg ?? 0) >= 0 ? '▲' : '▼'} {pct(Number(t.chg ?? 0))}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 상단 2열 — 1:2 비율 */}
      <section className="fs-grid fs-grid--top fs-grid--1to2">
        {/* 좌: 총 잔고 & P/L */}
        <div className="fs-card fs-balance">
          <div className="fs-card__title">Total Balance</div>

          {hasActiveLeague === false ? (
            <div className="fs-empty">
              There is no active league at the moment.{' '}Visit
<button className="fs-link" onClick={() => navigate('/leagues')}>Leagues</button>
{' '}page and join a new league!
            </div>
          ) : (
            <>
              <div className="fs-balance__value">
                {loadingPortfolio ? '—' : `$${money(summary.total_asset)}`}
              </div>

              <div className={`fs-chip fs-chip--pnl ${pnlAbs >= 0 ? 'is-pos' : 'is-neg'}`}>
                {loadingPortfolio ? '—' : (
                  <>
                    {pnlAbs >= 0 ? '+' : '-'}${money(Math.abs(pnlAbs))} ({pnlAbs >= 0 ? '+' : ''}{pct(pnlPctForChip)})
                  </>
                )}
              </div>
            </>
          )}
        </div>

        {/* 우: 수익률 상위 3 종목 */}
        <div className="fs-card fs-portfolio">
          <div className="fs-card__row">
            <div className="fs-card__title">Your Portfolio</div>
            <button className="fs-link" onClick={() => navigate('/portfolio')} aria-label="Go to Portfolio">→</button>
          </div>

          {hasActiveLeague === false ? (
            <div className="fs-empty">
              There is no active league at the moment.{' '}Visit
<button className="fs-link" onClick={() => navigate('/leagues')}>Leagues</button>
{' '}page and join a new league!
            </div>
          ) : (
            <div className="fs-portfolio__row">
              {loadingPortfolio ? (
                <>
                  <div className="fs-asset fs-asset--tile sk" />
                  <div className="fs-asset fs-asset--tile sk" />
                  <div className="fs-asset fs-asset--tile sk" />
                </>
              ) : (
                (portfolioTop.length ? portfolioTop : []).map((p) => (
                  <div className="fs-asset fs-asset--tile" key={p.sym}>
                    <div className="fs-asset__meta">
                      <div className="name">{p.sym}</div>
                      <div className="sub">{p.name}</div>
                    </div>
                    <div className="fs-asset__val">
                      <div className="val">${money(p.market_value ?? 0)}</div>
                      <div className={`chg ${Number(p.return_pct) >= 0 ? 'up' : 'dn'}`}>
                        {Number(p.return_pct) >= 0 ? '▲' : '▼'} {pct(Number(p.return_pct))}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {!loadingPortfolio && hasActiveLeague !== false && portfolioTop.length === 0 && (
            <div className="fs-empty">There are no holdings.</div>
          )}
        </div>
      </section>

      {/* 하단 2열 */}
      <section className="fs-grid fs-grid--bottom">
        {/* 좌: 실제 리더보드 */}
        <div className="fs-card fs-leader">
          {hasActiveLeague === false ? (
            <div className="fs-leader__hero">
              <div className="fs-leader__head">
                <div className="fs-card__title">Leaderboard</div>
              </div>
              <div className="fs-empty" style={{ paddingTop: 8 }}>
                There is no active league at the moment.{' '}Visit
<button className="fs-link" onClick={() => navigate('/leagues')}>Leagues</button>
{' '}page and join a new league!
              </div>
            </div>
          ) : (
            <>
              {/* 제목 & #1 영역 (히어로) */}
              {lbLoading ? (
                <div className="fs-leader__hero">
                  <div className="fs-leader__head">
                    <div className="fs-card__title">Leaderboard</div>
                    <div className="fs-leader__topuser">#1 —</div>
                  </div>
                  <div className="fs-leader__amount">—</div>
                </div>
              ) : lbError ? (
                <div className="fs-leader__hero">
                  <div className="fs-leader__head">
                    <div className="fs-card__title">Leaderboard</div>
                    <div className="fs-leader__topuser text-danger">—</div>
                  </div>
                  <div className="fs-leader__amount text-danger" style={{ fontWeight: 700 }}>{lbError}</div>
                </div>
              ) : lbUsers.length ? (
                <div className="fs-leader__hero">
                  <div className="fs-leader__head">
                    <div className="fs-card__title">Leaderboard</div>
                    <div className="fs-leader__topuser">#{String(1)} {lbUsers[0]?.username ?? '—'}</div>
                  </div>
                  <div className="fs-leader__amount">
                    ${money(lbUsers[0]?.total_asset ?? 0)}
                  </div>
                </div>
              ) : (
                <div className="fs-leader__hero">
                  <div className="fs-leader__head">
                    <div className="fs-card__title">Leaderboard</div>
                    <div className="fs-leader__topuser">—</div>
                  </div>
                  <div className="fs-leader__amount">—</div>
                </div>
              )}

              {/* 표: 수익 순서 (Balance/PNL 규칙 적용) */}
              <div className="table-wrap">
                <table className="fs-table">
                  <thead>
                    <tr>
                      <th>POS</th>
                      <th>Player</th>
                      <th>Balance</th>
                      <th>PNL</th>
                      <th>Return</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(lbLoading
                      ? Array.from({ length: 8 }).map((_, i) => ({
                          pos: i + 1,
                          user_id: `sk-${i}`,
                          username: '—',
                          balance: null,
                          starting_cash: null,
                          pnl: null,
                          return_pct: null,
                        }))
                      : lbUsers
                    ).map((u, idx) => {
                      const pos = idx + 1;
                      const bal = getBalance(u) ?? 0;
                      const rowStartingCash = Number(u.starting_cash ?? summary.starting_cash ?? 0); // 리그 공통 초기자금 fallback
                      const rulePnl = bal - rowStartingCash; // 규칙: PNL = balance - initial cash
                      const isUp = rulePnl >= 0;
                      const retPctRatio = Number(u.return_pct ?? 0) / 100; // % → 비율

                      return (
                        <tr key={u.user_id ?? `sk-${idx}`}>
                          <td>{String(pos).padStart(2, '0')}</td>
                          <td className="player"><span className="avatar" />{u.username}</td>
                          <td className="num">{bal != null ? `$${money(bal)}` : ''}</td>
                          <td className={`num ${isUp ? 'chg up' : 'chg dn'}`}>
                            {isUp ? '+' : '-'}${money(Math.abs(rulePnl))}
                          </td>
                          <td className={`num ${retPctRatio >= 0 ? 'chg up' : 'chg dn'}`}>
                            {pct(retPctRatio)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* 우: 최신 거래(실제값) */}
        <div className="fs-col-right">
          <div className="fs-card fs-latest">
            <div className="fs-card__row">
              <div className="fs-card__title">Latest Transactions</div>
              <button className="fs-link" onClick={() => navigate('/history')} aria-label="Go to History">→</button>
            </div>

            {hasActiveLeague === false ? (
              <div className="fs-empty">
                There is no active league at the moment.{' '}Visit
<button className="fs-link" onClick={() => navigate('/leagues')}>Leagues</button>
{' '}page and join a new league!
              </div>
            ) : txLoading ? (
              <ul className="fs-tx-list">
                {Array.from({ length: 5 }).map((_, i) => (
                  <li key={`sk-${i}`}>
                    <div className="who">
                      <div className="dot" />
                      <div className="name">—</div>
                      <div className="side">—</div>
                    </div>
                    <div className="amt">—</div>
                    <div className="when">—</div>
                  </li>
                ))}
              </ul>
            ) : txError ? (
              <div className="text-danger" style={{ padding: '8px 0' }}>{txError}</div>
            ) : txItems.length ? (
              <ul className="fs-tx-list">
                {txItems.map((t, i) => (
                  <li key={`${t.who || 'tx'}-${i}`}>
                    <div className="who">
                      <div className="dot" />
                      <div className="name">{t.who}</div>
                      <div className="side">{t.side}</div>
                    </div>
                    <div className={`amt ${t.amt >= 0 ? 'up' : 'dn'}`}>
                      {t.amt >= 0 ? '+' : '-'}{money(Math.abs(t.amt))} {t.cur}
                    </div>
                    <div className="when">{t.when}</div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="fs-empty">There are no recent transactions.</div>
            )}
          </div>

          {/* 뉴스 */}
          <div className="fs-card fs-news">
            {news.loading ? (
              <div className="fs-news__skeleton">
                <div className="thumb sk" />
                <div className="news-body">
                  <div className="fs-card__title">News</div>
                  <div className="sk sk-line" />
                  <div className="sk sk-line" />
                  <div className="sk sk-line short" />
                </div>
              </div>
            ) : (
              <>
                {news.image ? <div className="thumb" style={{ backgroundImage: `url(${news.image})` }} /> : <div className="thumb" />}
                <div className="news-body">
                  <div className="fs-card__title">News</div>
                  <h4 className="headline">{news.title}</h4>
                  <p className="summary">{news.summary}</p>
                  <a className="fs-btn" href={news.url} target="_blank" rel="noreferrer">Read more</a>
                </div>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
