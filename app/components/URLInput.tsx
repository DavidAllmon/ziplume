import React from "react";

interface URLInputProps {
  value: string;
  onChange: (value: string) => void;
}

const URLInput: React.FC<URLInputProps> = ({ value, onChange }) => {
  return (
    <div>
      <label htmlFor="input" className="mb-2 block text-lg font-medium text-purple-300">
        Enter URL or text
      </label>
      <input
        type="text"
        id="input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-gray-600 bg-gray-700 px-4 py-3 text-white transition-all duration-300 focus:ring-2 focus:ring-purple-500 focus:outline-none"
        placeholder="https://example.com"
      />
    </div>
  );
};

export default URLInput;
