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
    <div className="bg-white shadow-lg rounded-2xl p-4 w-full max-w-md m-2">
      <h2 className="text-xl font-semibold text-gray-800 mb-3">{name}</h2>
      <div className="flex justify-between items-center">
        <div className="text-left">
          <p className="text-sm text-gray-500">📥 들어오는 데이터</p>
          <p className="text-lg font-bold text-blue-600">{formatBytes(received)}</p>
        </div>
        <div className="text-left">
          <p className="text-sm text-gray-500">📤 나가는 데이터</p>
          <p className="text-lg font-bold text-red-500">{formatBytes(sent)}</p>
        </div>
      </div>
    </div>
  );
};

export default NetworkCard;