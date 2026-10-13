import React, { useState, useEffect } from "react";

interface VCardInputProps {
  onVCardGenerated: (vcard: string) => void;
}

const VCardInput: React.FC<VCardInputProps> = ({ onVCardGenerated }) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");

  useEffect(() => {
    if (name || email || phone || company) {
      const vcard = `BEGIN:VCARD
VERSION:3.0
FN:${name}
EMAIL:${email}
TEL:${phone}
ORG:${company}
END:VCARD`;
      onVCardGenerated(vcard);
    } else {
      onVCardGenerated("");
    }
  }, [name, email, phone, company, onVCardGenerated]);

  return (
    <div className="space-y-4">
      <input
        type="text"
        placeholder="Full Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full rounded-lg border border-gray-600 bg-gray-700 px-4 py-2 text-white"
      />
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full rounded-lg border border-gray-600 bg-gray-700 px-4 py-2 text-white"
      />
      <input
        type="tel"
        placeholder="Phone"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        className="w-full rounded-lg border border-gray-600 bg-gray-700 px-4 py-2 text-white"
      />
      <input
        type="text"
        placeholder="Company"
        value={company}
        onChange={(e) => setCompany(e.target.value)}
        className="w-full rounded-lg border border-gray-600 bg-gray-700 px-4 py-2 text-white"
      />
    </div>
  );
};

export default VCardInput;
