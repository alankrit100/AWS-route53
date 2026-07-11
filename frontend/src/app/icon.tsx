import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#232f3e",
          borderRadius: "15%",
        }}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 64 64"
          fill="none"
          style={{ display: "block" }}
        >
          <path
            d="M8 48 Q32 56 56 48"
            stroke="#FF9900"
            strokeWidth="8"
            strokeLinecap="round"
          />
          <path
            d="M14 36 Q32 44 50 36"
            stroke="#FF9900"
            strokeWidth="5"
            strokeLinecap="round"
          />
        </svg>
      </div>
    ),
    { ...size }
  );
}
