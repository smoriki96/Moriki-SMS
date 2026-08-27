export default function Home() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#020617",
        color: "#ffffff",
        fontFamily: "Arial, sans-serif",
      }}
    >
      {/* Header */}
      <header
        style={{
          borderBottom: "1px solid #1e293b",
          background: "#020617",
        }}
      >
        <div
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
            padding: "20px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <h2 style={{ margin: 0, fontSize: "25px" }}>
            Moriki{" "}
            <span style={{ color: "#3b82f6" }}>
              SMS
            </span>
          </h2>

          <nav
            style={{
              display: "flex",
              gap: "25px",
              color: "#cbd5e1",
            }}
          >
            <a
              href="/"
              style={{
                color: "#ffffff",
                textDecoration: "none",
              }}
            >
              Home
            </a>

            <a
              href="/register"
              style={{
                color: "#cbd5e1",
                textDecoration: "none",
              }}
            >
              Get Started
            </a>

            <a
              href="#how-it-works"
              style={{
                color: "#cbd5e1",
                textDecoration: "none",
              }}
            >
              How it works
            </a>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
          padding: "110px 24px 90px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            display: "inline-block",
            background: "rgba(37, 99, 235, 0.15)",
            color: "#60a5fa",
            border: "1px solid #1d4ed8",
            borderRadius: "999px",
            padding: "8px 16px",
            fontSize: "14px",
            marginBottom: "25px",
          }}
        >
          Virtual SMS numbers
        </div>

        <h1
          style={{
            fontSize: "clamp(45px, 8vw, 80px)",
            lineHeight: "1",
            margin: 0,
            fontWeight: "800",
          }}
        >
          Moriki{" "}
          <span style={{ color: "#3b82f6" }}>
            SMS
          </span>
        </h1>

        <p
          style={{
            maxWidth: "650px",
            margin: "25px auto",
            color: "#94a3b8",
            fontSize: "20px",
            lineHeight: "1.7",
          }}
        >
          Virtual numbers made simple. Choose a
          country and service, complete your purchase,
          and manage your SMS session from one place.
        </p>

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "15px",
            flexWrap: "wrap",
            marginTop: "35px",
          }}
        >
          <a
            href="/register"
            style={{
              background: "#2563eb",
              color: "#ffffff",
              padding: "15px 30px",
              borderRadius: "10px",
              textDecoration: "none",
              fontWeight: "700",
              display: "inline-block",
            }}
          >
            Create Account
          </a>

          <a
            href="#how-it-works"
            style={{
              background: "#0f172a",
              color: "#ffffff",
              padding: "15px 30px",
              borderRadius: "10px",
              border: "1px solid #334155",
              textDecoration: "none",
              fontWeight: "700",
              display: "inline-block",
            }}
          >
            How It Works
          </a>
        </div>
      </section>

      {/* Features */}
      <section
        id="how-it-works"
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
          padding: "20px 24px 100px",
        }}
      >
        <h2
          style={{
            textAlign: "center",
            fontSize: "32px",
            marginBottom: "45px",
          }}
        >
          How Moriki SMS Works
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "20px",
          }}
        >
          <Feature
            number="01"
            title="Choose a country"
            text="Select the country you need for your SMS session."
          />

          <Feature
            number="02"
            title="Choose a service"
            text="Select the supported service you want to use."
          />

          <Feature
            number="03"
            title="Complete payment"
            text="Complete your purchase and receive your assigned number."
          />

          <Feature
            number="04"
            title="Receive SMS"
            text="Use the number during your active session and receive the verification SMS."
          />
        </div>
      </section>

      {/* CTA */}
      <section
        style={{
          maxWidth: "900px",
          margin: "0 auto",
          padding: "20px 24px 100px",
        }}
      >
        <div
          style={{
            background:
              "linear-gradient(135deg, #0f172a, #172554)",
            border: "1px solid #1e40af",
            borderRadius: "22px",
            padding: "50px 25px",
            textAlign: "center",
          }}
        >
          <h2 style={{ fontSize: "32px", margin: 0 }}>
            Ready to get started?
          </h2>

          <p
            style={{
              color: "#94a3b8",
              margin: "15px 0 25px",
            }}
          >
            Create your Moriki SMS account and get started.
          </p>

          <a
            href="/register"
            style={{
              display: "inline-block",
              background: "#2563eb",
              color: "#ffffff",
              padding: "14px 28px",
              borderRadius: "10px",
              textDecoration: "none",
              fontWeight: "700",
            }}
          >
            Create Account
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer
        style={{
          borderTop: "1px solid #1e293b",
          padding: "30px 24px",
          textAlign: "center",
          color: "#64748b",
        }}
      >
        © 2026 Moriki SMS. All rights reserved.
      </footer>
    </main>
  );
}

function Feature({
  number,
  title,
  text,
}: {
  number: string;
  title: string;
  text: string;
}) {
  return (
    <div
      style={{
        background: "#0f172a",
        border: "1px solid #1e293b",
        borderRadius: "18px",
        padding: "28px",
      }}
    >
      <div
        style={{
          color: "#3b82f6",
          fontSize: "14px",
          fontWeight: "700",
        }}
      >
        {number}
      </div>

      <h3
        style={{
          fontSize: "20px",
          marginTop: "15px",
        }}
      >
        {title}
      </h3>

      <p
        style={{
          color: "#94a3b8",
          lineHeight: "1.6",
          marginBottom: 0,
        }}
      >
        {text}
      </p>
    </div>
  );
}