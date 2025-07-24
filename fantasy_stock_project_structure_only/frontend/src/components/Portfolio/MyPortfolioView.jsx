import React, { useEffect, useState } from 'react'
import axios from 'axios'

const MyPortfolioView = () => {
  const [data, setData] = useState(null)

  useEffect(() => {
    const fetchPortfolio = async () => {
      try {
        const token = localStorage.getItem('token')
        const res = await axios.get('/api/stocks/my-portfolio/', {
          headers: { Authorization: `Token ${token}` }
        })
        setData(res.data)
      } catch (err) {
        console.error(err)
      }
    }

    fetchPortfolio()
  }, [])

  if (!data) return <div>로딩 중...</div>

  return (
    <div>
      <div className="row text-center mb-4">
        <div className="col-md-3"><strong>총 자산:</strong><br />{data.total_asset.toLocaleString()}원</div>
        <div className="col-md-3"><strong>투자 원금:</strong><br />{data.starting_cash.toLocaleString()}원</div>
        <div className="col-md-3"><strong>수익률:</strong><br />{data.return_pct}%</div>
        <div className="col-md-3"><strong>수익금:</strong><br />{(data.total_asset - data.starting_cash).toLocaleString()}원</div>
      </div>

      <table className="table table-bordered table-hover text-center">
        <thead className="table-light">
          <tr>
            <th>종목명</th>
            <th>보유 수량</th>
            <th>평균 매입가</th>
            <th>현재가</th>
            <th>평가금액</th>
            <th>손익</th>
            <th>수익률</th>
          </tr>
        </thead>
        <tbody>
          {data.holdings.map((h, idx) => (
            <tr key={idx}>
              <td>{h.name} ({h.symbol})</td>
              <td>{h.quantity}</td>
              <td>{h.avg_price.toLocaleString()}</td>
              <td>{h.current_price.toLocaleString()}</td>
              <td>{h.evaluation.toLocaleString()}</td>
              <td className={h.pnl >= 0 ? 'text-success' : 'text-danger'}>
                {h.pnl.toLocaleString()}
              </td>
              <td className={h.pnl_pct >= 0 ? 'text-success' : 'text-danger'}>
                {h.pnl_pct}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default MyPortfolioView
