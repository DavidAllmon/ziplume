import React from "react";
import { Dialog } from "@headlessui/react";

interface ErrorCorrectionLevelModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ErrorCorrectionLevelModal: React.FC<ErrorCorrectionLevelModalProps> = ({
  isOpen,
  onClose,
}) => {
  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="max-h-[90vh] w-full max-w-md overflow-hidden rounded-2xl bg-gray-800 shadow-xl transition-all">
          <div className="max-h-[calc(90vh-4rem)] overflow-y-auto p-6">
            <Dialog.Title as="h3" className="mb-4 text-lg leading-6 font-medium text-purple-300">
              Error Correction Level
            </Dialog.Title>
            <div className="mt-2 space-y-4 text-sm text-gray-300">
              <p>
                Error correction level is a crucial feature of QR codes that allows them to remain
                readable even if they are partially damaged or obscured. It determines the amount of
                redundant data included in the QR code, which can be used to reconstruct the
                original information if parts of the code are unreadable.
              </p>
              <p>There are four levels of error correction:</p>
              <ul className="list-inside list-disc space-y-2">
                <li>
                  <strong>L (Low)</strong>: 7% of data can be restored. Use this for large QR codes
                  or when you&apos;re confident the code won&apos;t be damaged.
                </li>
                <li>
                  <strong>M (Medium)</strong>: 15% of data can be restored. This is the most common
                  level, suitable for most applications.
                </li>
                <li>
                  <strong>Q (Quartile)</strong>: 25% of data can be restored. Use this if you expect
                  the QR code might get somewhat damaged or dirty.
                </li>
                <li>
                  <strong>H (High)</strong>: 30% of data can be restored. Use this for small QR
                  codes or when you expect significant damage or obstruction.
                </li>
              </ul>
              <p>
                Higher error correction levels increase the QR code&apos;s reliability but also
                increase its complexity and density. This means that for the same amount of data, a
                QR code with high error correction will be larger or have smaller individual squares
                compared to one with low error correction.
              </p>
              <p>When choosing an error correction level, consider:</p>
              <ul className="list-inside list-disc space-y-2">
                <li>
                  The environment where the QR code will be used (e.g., outdoors, on a product
                  label)
                </li>
                <li>The expected lifespan of the QR code</li>
                <li>The importance of the data (e.g., critical information vs. a simple URL)</li>
                <li>The available space for the QR code</li>
              </ul>
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

export default ErrorCorrectionLevelModal;
