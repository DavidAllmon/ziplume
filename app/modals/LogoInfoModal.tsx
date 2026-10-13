import React from "react";
import { Dialog } from "@headlessui/react";

interface LogoInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const LogoInfoModal: React.FC<LogoInfoModalProps> = ({ isOpen, onClose }) => {
  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="max-h-[90vh] w-full max-w-md overflow-hidden rounded-2xl bg-gray-800 shadow-xl transition-all">
          <div className="max-h-[calc(90vh-4rem)] overflow-y-auto p-6">
            <Dialog.Title as="h3" className="mb-4 text-lg leading-6 font-medium text-purple-300">
              Logo Upload Information
            </Dialog.Title>
            <div className="mt-2 space-y-4 text-sm text-gray-300">
              <p>
                Adding a logo to your QR code can make it more visually appealing and branded.
                However, there are some considerations to keep in mind:
              </p>
              <ul className="list-inside list-disc space-y-2">
                <li>
                  <strong>File Type:</strong> While all image types are accepted, PNG or SVG are
                  recommended for best results due to their support for transparency and
                  scalability.
                </li>
                <li>
                  <strong>Size:</strong> The logo will be resized to approximately 20% of the QR
                  code&apos;s size. For best results, use a square image.
                </li>
                <li>
                  <strong>Resolution:</strong> Use a high enough resolution for clarity, but be
                  mindful that very large files may affect the QR code&apos;s scannability.
                </li>
                <li>
                  <strong>Color:</strong> Ensure your logo has good contrast with the QR code colors
                  for best visibility.
                </li>
                <li>
                  <strong>Placement:</strong> The logo will always be centered in the QR code.
                </li>
              </ul>
              <p>
                Remember that adding a logo reduces the error correction capacity of your QR code.
                Consider using a higher error correction level when adding a logo.
              </p>
            </div>
          </div>
          <div className="flex justify-end bg-gray-700 px-6 py-4">
            <button
              type="button"
              className="inline-flex justify-center rounded-md border border-transparent bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2"
              onClick={onClose}
            >
              Got it, thanks!
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default LogoInfoModal;
