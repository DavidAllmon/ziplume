import React, { useState, useEffect } from "react";

interface WiFiInputProps {
  onWiFiGenerated: (wifiString: string) => void;
}

const WiFiInput: React.FC<WiFiInputProps> = ({ onWiFiGenerated }) => {
  const [ssid, setSSID] = useState("");
  const [password, setPassword] = useState("");
  const [encryption, setEncryption] = useState("WPA");

  useEffect(() => {
    const wifiString = `WIFI:T:${encryption};S:${ssid};P:${password};;`;
    onWiFiGenerated(wifiString);
  }, [ssid, password, encryption, onWiFiGenerated]);

  return (
    <div className="space-y-4">
      <input
        type="text"
        placeholder="Network Name (SSID)"
        value={ssid}
        onChange={(e) => setSSID(e.target.value)}
        className="w-full rounded-lg border border-gray-600 bg-gray-700 px-4 py-2 text-white"
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full rounded-lg border border-gray-600 bg-gray-700 px-4 py-2 text-white"
      />
      <select
        value={encryption}
        onChange={(e) => setEncryption(e.target.value)}
        className="w-full rounded-lg border border-gray-600 bg-gray-700 px-4 py-2 text-white"
      >
        <option value="WPA">WPA/WPA2</option>
        <option value="WEP">WEP</option>
        <option value="nopass">No Encryption</option>
      </select>
    </div>
  );
};

export default WiFiInput;
