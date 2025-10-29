// frontend/src/pages/InitializeSeason.jsx
import React, { useState } from "react";
import axios from "axios";

function InitializeSeason() {
  const [message, setMessage] = useState("");
  const [created, setCreated] = useState([]);
  const [skipped, setSkipped] = useState([]);
  const [error, setError] = useState("");

  const handleInit = async () => {
    setMessage("Requesting...");
    setError("");
    try {
      const res = await axios.post("/api/stocks/admin/init-season/", {}, {
        headers: {
          Authorization: `Token ${localStorage.getItem("token")}`
        }
      });
      setMessage(res.data.message);
      setCreated(res.data.created_users);
      setSkipped(res.data.skipped_users);
    } catch (err) {
      setError("failed:" + (err.response?.data?.detail || "unknown error"));
    }
  };

  return (
    <div className="container mt-5">
      <h2>📆 시즌 초기화 (관리자용)</h2>
      <button className="btn btn-primary mt-3" onClick={handleInit}>
        시즌 초기화 실행
      </button>

      {message && <div className="alert alert-success mt-4">{message}</div>}
      {error && <div className="alert alert-danger mt-4">{error}</div>}

      {created.length > 0 && (
        <div className="mt-3">
          <h5>✅ 생성된 유저:</h5>
          <ul>{created.map((u, i) => <li key={i}>{u}</li>)}</ul>
        </div>
      )}

      {skipped.length > 0 && (
        <div className="mt-3">
          <h5>⏭️ 건너뛴 유저 (이미 있음):</h5>
          <ul>{skipped.map((u, i) => <li key={i}>{u}</li>)}</ul>
        </div>
      )}
    </div>
  );
}

export default InitializeSeason;