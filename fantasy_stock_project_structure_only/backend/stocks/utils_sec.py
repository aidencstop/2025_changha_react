# backend/stocks/utils_sec.py
import re
import time
import json
from datetime import datetime, timedelta
from typing import Optional, Tuple
import requests
from bs4 import BeautifulSoup
from django.conf import settings
import warnings
from bs4 import XMLParsedAsHTMLWarning
warnings.filterwarnings("ignore", category=XMLParsedAsHTMLWarning)

# 아주 단순한 메모리 캐시 (프로덕션에선 DB/파일캐시 권장)
_CACHE = {"profile": {}}
_TTL = timedelta(days=7)

HEADERS = {
    "User-Agent": f"FantasyStockApp/1.0 ({getattr(settings, 'SEC_CONTACT_EMAIL', 'noreply@example.com')})"
}

# Ticker → CIK 매핑
def _get_cik(ticker: str) -> Optional[str]:
    """
    EDGAR 제공 티커→CIK JSON 사용 (sec가 제공하는 정적 맵).
    """
    url = "https://www.sec.gov/files/company_tickers.json"
    r = requests.get(url, headers=HEADERS, timeout=20)
    r.raise_for_status()
    data = r.json()  # { "0": {"ticker":"A", "cik_str":..., "title":"..."}, ... }
    t = ticker.upper()
    for _, v in data.items():
        if v.get("ticker", "").upper() == t:
            return str(v.get("cik_str")).zfill(10)
    return None

def _latest_10k_primary_doc_url(cik: str) -> Optional[str]:
    """
    회사 제출 목록에서 최신 10-K의 메인 문서 URL을 찾는다.
    """
    # 회사 제출 요약
    sub_url = f"https://data.sec.gov/submissions/CIK{cik}.json"
    r = requests.get(sub_url, headers=HEADERS, timeout=20)
    r.raise_for_status()
    sub = r.json()
    forms = sub.get("filings", {}).get("recent", {})
    for i, form in enumerate(forms.get("form", [])):
        if form == "10-K":
            accno = forms["accessionNumber"][i].replace("-", "")
            primary = forms["primaryDocument"][i]
            filing_date = forms["filingDate"][i]
            # EDGAR 아카이브 경로 구성
            url = f"https://www.sec.gov/Archives/edgar/data/{int(cik)}/{accno}/{primary}"
            return url
    return None

_RE_ITEM1 = re.compile(r"(?:Item\s*1\.*\s*Business)(.*?)(?:Item\s*1A\.*\s*Risk\s*Factors|Item\s*2\.*)", re.IGNORECASE | re.DOTALL)

def _extract_item1_business(html_text: str) -> Optional[str]:
    """
    10-K HTML/TXT에서 'Item 1. Business' 섹션 본문 추출.
    우선 regex → 실패 시 h1/h2 헤딩 기반 추출.
    """
    # 1) 정규식 시도
    m = _RE_ITEM1.search(html_text)
    if m:
        raw = m.group(1)
        soup = BeautifulSoup(raw, "lxml")
        # 텍스트 정리
        text = soup.get_text("\n", strip=True)
        return text

    # 2) 헤더 기반 (fallback)
    soup = BeautifulSoup(html_text, "lxml")
    headers = soup.find_all(re.compile("^h[1-3]$"))
    start_idx, end_idx = -1, -1
    for idx, h in enumerate(headers):
        if "item" in h.get_text().lower() and "1" in h.get_text().lower() and "business" in h.get_text().lower():
            start_idx = idx
            break
    if start_idx >= 0:
        for j in range(start_idx + 1, len(headers)):
            t = headers[j].get_text().lower()
            if ("item" in t and ("1a" in t or "2" in t)):
                end_idx = j
                break
        content_nodes = []
        p = headers[start_idx].find_next_sibling()
        while p and (end_idx < 0 or p != headers[end_idx]):
            content_nodes.append(p.get_text(" ", strip=True))
            p = p.find_next_sibling()
        text = "\n".join([c for c in content_nodes if c])
        return text or None

    return None

def fetch_company_profile_from_sec(ticker: str) -> Tuple[Optional[str], Optional[str]]:
    """
    최신 10-K의 Item 1. Business를 가져와 (본문, 원문 URL) 반환.
    캐시 TTL 7일.
    """
    key = ticker.upper()
    now = datetime.utcnow()
    cached = _CACHE["profile"].get(key)
    if cached and now - cached["ts"] < _TTL:
        return cached["text"], cached["url"]

    try:
        cik = _get_cik(ticker)
        if not cik:
            return None, None
        doc_url = _latest_10k_primary_doc_url(cik)
        if not doc_url:
            return None, None

        r = requests.get(doc_url, headers=HEADERS, timeout=30)
        r.raise_for_status()
        html_text = r.text

        text = _extract_item1_business(html_text)
        if text:
            print(text)
            # 너무 길면 적당히 자름
            trimmed = text[:5000].strip()
            _CACHE["profile"][key] = {"ts": now, "text": trimmed, "url": doc_url}
            return trimmed, doc_url
        return None, doc_url
    except Exception:
        return None, None
