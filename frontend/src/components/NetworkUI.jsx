//frontend/src/components/NetworkUI.jsx
import React from 'react';
import NetworkCard from './NetworkCard';

const NetworkUI = ({ data }) => {
  return (
    <div className="flex flex-wrap justify-center">
      {data.map((iface, idx) => (
        <NetworkCard
          key={idx}
          name={iface.name}
          received={iface.received}
          sent={iface.sent}
        />
      ))}
    </div>
  );
};

export default NetworkUI;