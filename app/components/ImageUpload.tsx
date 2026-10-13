import React, { useCallback, useState } from "react";
import Image from "next/image";

interface ImageUploadProps {
  onImageUpload: (file: File | null) => void;
}

const ImageUpload: React.FC<ImageUploadProps> = ({ onImageUpload }) => {
  const [preview, setPreview] = useState<string | null>(null);

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        onImageUpload(file);
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      }
    },
    [onImageUpload],
  );

  const handleRemove = useCallback(() => {
    setPreview(null);
    onImageUpload(null);
  }, [onImageUpload]);

  return (
    <div>
      <div className="flex items-center space-x-4">
        <label
          htmlFor="logo-upload"
          className="cursor-pointer rounded bg-purple-600 px-4 py-2 font-bold text-white transition-colors duration-300 hover:bg-purple-700"
        >
          Choose Image
          <input
            type="file"
            id="logo-upload"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </label>
        {preview && (
          <div className="relative">
            <Image src={preview} alt="Logo preview" width={50} height={50} className="rounded-md" />
            <button
              onClick={handleRemove}
              className="absolute -top-2 -right-2 flex size-5 items-center justify-center rounded-full bg-red-500 text-xs text-white transition-colors duration-300 hover:bg-red-600"
            >
              ×
            </button>
          </div>
        )}
      </div>
      {!preview && <p className="mt-2 text-sm text-gray-400">No image selected</p>}
    </div>
  );
};

export default ImageUpload;
