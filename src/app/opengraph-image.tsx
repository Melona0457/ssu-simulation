import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "오 나의 교수님! 비밀 에피소드";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          position: "relative",
          overflow: "hidden",
          background:
            "linear-gradient(135deg, #71445e 0%, #c983a6 42%, #f6d7e3 100%)",
          color: "#fff8fb",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.28), transparent 28%), radial-gradient(circle at 82% 18%, rgba(255,224,236,0.24), transparent 24%), radial-gradient(circle at 50% 100%, rgba(115,36,74,0.28), transparent 44%)",
          }}
        />

        <div
          style={{
            position: "absolute",
            left: -60,
            top: -24,
            width: 520,
            height: 220,
            border: "6px solid rgba(135, 70, 98, 0.38)",
            borderRadius: 999,
            transform: "rotate(-8deg)",
            opacity: 0.7,
          }}
        />
        <div
          style={{
            position: "absolute",
            right: -100,
            bottom: -60,
            width: 420,
            height: 220,
            border: "6px solid rgba(135, 70, 98, 0.24)",
            borderRadius: 999,
            transform: "rotate(12deg)",
            opacity: 0.8,
          }}
        />

        <div
          style={{
            display: "flex",
            flex: 1,
            justifyContent: "space-between",
            alignItems: "stretch",
            padding: "52px 58px",
            gap: 28,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              width: "64%",
              padding: "34px 38px",
              borderRadius: 36,
              background: "rgba(255, 247, 250, 0.16)",
              border: "1px solid rgba(255,255,255,0.36)",
              boxShadow: "0 18px 42px rgba(84, 25, 50, 0.18)",
              backdropFilter: "blur(10px)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                fontSize: 30,
                fontWeight: 700,
                color: "#ffe6f0",
              }}
            >
              <div
                style={{
                  display: "flex",
                  width: 58,
                  height: 58,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.22)",
                  fontSize: 34,
                }}
              >
                ♡
              </div>
              SSU SIMULATION
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <div
                style={{
                  fontSize: 72,
                  lineHeight: 1.06,
                  letterSpacing: "-0.04em",
                  fontWeight: 800,
                  color: "#fff9fb",
                }}
              >
                오 나의 교수님!
                <br />
                비밀 에피소드
              </div>
              <div
                style={{
                  fontSize: 28,
                  lineHeight: 1.4,
                  color: "rgba(255, 239, 245, 0.92)",
                }}
              >
                교수님을 커스터마이징하고
                <br />
                시험 전날의 선택지를 따라가는 로맨스 시뮬레이션
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: 12,
                fontSize: 24,
                color: "#fff0f5",
              }}
            >
              <div
                style={{
                  display: "flex",
                  padding: "12px 18px",
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.18)",
                  border: "1px solid rgba(255,255,255,0.28)",
                }}
              >
                분기형 스토리
              </div>
              <div
                style={{
                  display: "flex",
                  padding: "12px 18px",
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.18)",
                  border: "1px solid rgba(255,255,255,0.28)",
                }}
              >
                교수님 커스터마이징
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              width: "36%",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              gap: 18,
              borderRadius: 36,
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.28), rgba(255,240,247,0.14))",
              border: "1px solid rgba(255,255,255,0.38)",
              boxShadow: "0 18px 42px rgba(84, 25, 50, 0.14)",
            }}
          >
            <div
              style={{
                display: "flex",
                width: 232,
                height: 232,
                borderRadius: 999,
                alignItems: "center",
                justifyContent: "center",
                background:
                  "radial-gradient(circle at 50% 38%, rgba(255,255,255,0.92), rgba(255,219,232,0.9) 58%, rgba(235,161,191,0.92) 100%)",
                color: "#9d4f73",
                fontSize: 120,
                fontWeight: 800,
                boxShadow:
                  "inset 0 8px 18px rgba(255,255,255,0.7), 0 14px 24px rgba(120, 46, 78, 0.18)",
              }}
            >
              ?
            </div>
            <div
              style={{
                fontSize: 30,
                fontWeight: 700,
                color: "#7f3558",
              }}
            >
              나만의 교수님 생성
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
