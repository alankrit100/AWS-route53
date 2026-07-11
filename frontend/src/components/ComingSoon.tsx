"use client";

export function ComingSoon({ title }: { title: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "60vh",
        color: "#545b64",
      }}
    >
      <div style={{ fontSize: "48px", marginBottom: "16px" }}>🚧</div>
      <h1 style={{ fontSize: "24px", fontWeight: 700, marginBottom: "8px" }}>
        {title}
      </h1>
      <p style={{ fontSize: "14px" }}>Coming soon</p>
    </div>
  );
}
