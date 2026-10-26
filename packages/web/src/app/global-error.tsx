"use client";

// Last-resort boundary for errors thrown by the root layout itself. It
// replaces the whole document, so it can't rely on globals.css or fonts.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#09090b",
          color: "#fafafa",
        }}
      >
        <main style={{ maxWidth: 400, padding: 24, textAlign: "center" }}>
          <h1 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>
            Soko is having trouble
          </h1>
          <p style={{ fontSize: 14, color: "#a1a1aa", marginTop: 8 }}>
            Something went wrong loading the app.
            {error.digest && ` Reference: ${error.digest}`}
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: 20,
              height: 36,
              padding: "0 16px",
              border: 0,
              borderRadius: 4,
              background: "#2563eb",
              color: "#fff",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
