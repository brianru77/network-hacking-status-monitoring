// frontend/src/components/NetworkCard.jsx
import React from 'react';

const formatBytes = (bytes) => {
  if (bytes > 1024 * 1024)
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB/s';
  if (bytes > 1024)
    return (bytes / 1024).toFixed(1) + ' KB/s';
  return bytes + ' B/s';
};

const NetworkCard = ({ name, received, sent }) => {
  return (
    <div className="m-2 p-4 border rounded shadow w-72">
      <h2 className="text-lg font-bold mb-2">{name}</h2>
      <div className="flex justify-between">
        <span>📥 들어오는 데이터</span>
        <span className="text-blue-600">{received?.toFixed(2)} B/s</span>
      </div>
      <div className="flex justify-between">
        <span>📤 나가는 데이터</span>
        <span className="text-red-600">{sent?.toFixed(2)} B/s</span>
      </div>
    </div>
  );
};

export default NetworkCard;