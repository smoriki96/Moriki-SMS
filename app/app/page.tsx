export default function Home() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#020617",
        color: "#ffffff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <div
        style={{
          textAlign: "center",
          padding: "40px",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "24px",
          background: "rgba(255,255,255,0.04)",
        }}
      >
        <h1
          style={{
            fontSize: "42px",
            fontWeight: 800,
            margin: 0,
          }}
        >
          <span>Moriki </span>
          <span style={{ color: "#22d3ee" }}>SMS</span>
        </h1>

        <p
          style={{
            marginTop: "12px",
            color: "#94a3b8",
            fontSize: "18px",
          }}
        >
          Virtual numbers made simple
        </p>

        <div
          style={{
            marginTop: "28px",
            display: "flex",
            gap: "12px",
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <a
            href="/numbers"
            style={{
              background: "#06b6d4",
              color: "#020617",
              padding: "12px 22px",
              borderRadius: "12px",
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            Get a Number
          </a>

          <a
            href="/admin/dashboard"
            style={{
              border: "1px solid rgba(255,255,255,0.15)",
              color: "#ffffff",
              padding: "12px 22px",
              borderRadius: "12px",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Dashboard
          </a>
        </div>
      </div>
    </main>
  );
}