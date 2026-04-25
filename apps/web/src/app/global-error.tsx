"use client";

/**
 * Global Error Handler
 * Catches errors from root layout and all routes
 * This is a special Next.js component that wraps the entire app
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Log error in development
  if (process.env.NODE_ENV === "development") {
    console.error("Global Error:", error);
  }

  return (
    <html lang="vi">
      <body>
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="w-20 h-20 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
              <svg
                className="w-10 h-10 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>

            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Lỗi Hệ Thống
            </h1>

            <p className="text-gray-600 mb-6">
              Rất tiếc, ứng dụng gặp sự cố nghiêm trọng. Vui lòng thử tải lại
              trang.
            </p>

            {process.env.NODE_ENV === "development" && error && (
              <div className="mb-6 p-4 bg-gray-100 rounded text-left text-xs font-mono overflow-auto max-h-32">
                <p className="text-red-600 font-bold">{error.message}</p>
                {error.digest && (
                  <p className="mt-1 text-gray-500">Digest: {error.digest}</p>
                )}
              </div>
            )}

            <div className="flex gap-4 justify-center">
              <button
                onClick={() => reset()}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Thử lại
              </button>
              <button
                onClick={() => (window.location.href = "/")}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
              >
                Trang chủ
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
