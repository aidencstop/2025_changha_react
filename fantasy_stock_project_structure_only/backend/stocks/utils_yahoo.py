# backend/stocks/utils_yahoo.py
from __future__ import annotations
from typing import Optional, Dict, Any
from datetime import datetime, timezone
import math
import yfinance as yf

def _num(x):
    try:
        if x is None:
            return None
        if isinstance(x, (int, float)):
            return float(x)
        return float(str(x).replace(',', ''))
    except Exception:
        return None

def _ts_to_ymd(ts: Optional[int | float]) -> Optional[str]:
    if not ts or not math.isfinite(float(ts)):
        return None
    try:
        dt = datetime.fromtimestamp(float(ts), tz=timezone.utc)
        return dt.date().isoformat()
    except Exception:
        return None

def fetch_yahoo_key_stats(symbol: str) -> Dict[str, Any]:
    """
    Detail Stock 카드에서 쓰는 키를 yfinance로 채워 반환.
    프론트 스키마:
      previousClose, open, bid, ask, volume, avgVolume, marketCap,
      peRatioTTM, epsTTM, dividendRate, exDividendDate, targetEst
    """
    t = yf.Ticker(symbol)

    # info는 느릴 수 있어 fast_info를 먼저 시도
    fast = getattr(t, "fast_info", {}) or {}
    info = {}
    try:
        # 일부 환경에서 info 접근이 느리거나 None일 수 있음 -> 예외 안전
        info = t.info or {}
    except Exception:
        info = {}

    # 우선순위: info -> fast_info
    previous_close = info.get("previousClose", fast.get("previous_close"))
    open_ = info.get("open", fast.get("open"))
    bid = info.get("bid", fast.get("bid"))
    ask = info.get("ask", fast.get("ask"))
    volume = info.get("volume", fast.get("volume"))
    avg_vol = info.get("averageVolume", info.get("averageVolume10days"))
    market_cap = info.get("marketCap", fast.get("market_cap"))
    pe_ttm = info.get("trailingPE", fast.get("trailing_pe"))
    eps_ttm = info.get("trailingEps")
    div_rate = info.get("dividendRate")
    ex_div_ts = info.get("exDividendDate")
    target_mean = info.get("targetMeanPrice", info.get("targetMedianPrice"))

    return {
        "previousClose": _num(previous_close),
        "open": _num(open_),
        "bid": _num(bid),
        "ask": _num(ask),
        "volume": _num(volume),
        "avgVolume": _num(avg_vol),
        "marketCap": _num(market_cap),
        "peRatioTTM": _num(pe_ttm),
        "epsTTM": _num(eps_ttm),
        "dividendRate": _num(div_rate),
        "exDividendDate": _ts_to_ymd(ex_div_ts),
        "targetEst": _num(target_mean),
    }

def fetch_yahoo_profile(symbol: str) -> Dict[str, Any]:
    """
    Overview 카드용: longBusinessSummary/sector/industry/fullTimeEmployees/fiscalYearEnd
    프론트 기대 스키마 {profile, source} 유지 + 메타 필드 함께 반환
    """
    t = yf.Ticker(symbol)
    info = {}
    try:
        info = t.info or {}
    except Exception:
        info = {}

    profile_text = (info.get("longBusinessSummary") or "").strip()
    sector = info.get("sector")
    industry = info.get("industry")
    fte = info.get("fullTimeEmployees")
    fiscal_year_end = info.get("fiscalYearEnd")  # 종종 없음(그대로 전달)

    return {
        "profile": profile_text,
        "source": f"https://finance.yahoo.com/quote/{symbol}/profile",
        "sector": sector,
        "industry": industry,
        "fullTimeEmployees": fte,
        "fiscalYearEnd": fiscal_year_end,
    }
