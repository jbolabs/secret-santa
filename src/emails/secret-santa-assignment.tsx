import { SITE_URL } from "../lib/seo";

interface SecretSantaAssignmentProps {
  giverName: string;
  receiverName: string;
  partyName?: string;
  budget?: string;
}

export default function SecretSantaAssignment({
  giverName,
  receiverName,
  partyName,
  budget,
}: SecretSantaAssignmentProps) {
  return (
    <html lang="en">
      <head>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&display=swap');
        `}</style>
      </head>
      <body
        style={{
          backgroundColor: "#faf9f7",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
          margin: 0,
          padding: 0,
        }}
      >
        <table
          width="100%"
          cellPadding="0"
          cellSpacing="0"
          style={{ backgroundColor: "#faf9f7" }}
        >
          <tr>
            <td align="center" style={{ padding: "40px 20px" }}>
              <table
                width="600"
                cellPadding="0"
                cellSpacing="0"
                style={{
                  backgroundColor: "#ffffff",
                  borderRadius: "10px",
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
                }}
              >
                {/* Header */}
                <tr>
                  <td align="center" style={{ padding: "50px 40px 30px" }}>
                    {partyName && (
                      <p
                        style={{
                          color: "#331a0d",
                          fontFamily: "'Instrument Serif', Georgia, serif",
                          fontSize: "24px",
                          fontWeight: "normal",
                          letterSpacing: "-0.5px",
                          margin: "0 0 8px",
                          textDecoration: "underline",
                          textDecorationColor: "#8c3e2b",
                          textDecorationThickness: "4px",
                        }}
                      >
                        {partyName}:
                      </p>
                    )}
                    <h1
                      style={{
                        color: "#331a0d",
                        fontFamily: "'Instrument Serif', Georgia, serif",
                        fontSize: "38px",
                        fontWeight: "normal",
                        letterSpacing: "-0.5px",
                        margin: 0,
                      }}
                    >
                      Your Secret Santa Assignment
                    </h1>
                  </td>
                </tr>

                {/* Greeting */}
                <tr>
                  <td align="center" style={{ padding: "0 40px 30px" }}>
                    <p
                      style={{
                        color: "#331a0d",
                        fontSize: "22px",
                        fontWeight: "500",
                        lineHeight: "1.5",
                        margin: 0,
                      }}
                    >
                      Hi {giverName}!
                    </p>
                  </td>
                </tr>

                {/* Main content */}
                <tr>
                  <td align="center" style={{ padding: "0 40px 40px" }}>
                    <p
                      style={{
                        color: "#806656",
                        fontSize: "18px",
                        lineHeight: "1.7",
                        margin: 0,
                        maxWidth: "520px",
                      }}
                    >
                      The Secret Santa assignments have been revealed! You’ve
                      been matched with...
                    </p>
                  </td>
                </tr>

                {/* Receiver reveal box */}
                <tr>
                  <td align="center" style={{ padding: "0 40px 40px" }}>
                    <div
                      style={{
                        backgroundColor: "#fff9f0",
                        border: "3px solid #8c3e2b",
                        borderRadius: "12px",
                        boxShadow: "0 4px 12px rgba(140, 62, 43, 0.15)",
                        margin: "0 auto",
                        maxWidth: "480px",
                        padding: "40px 30px",
                      }}
                    >
                      <p
                        style={{
                          color: "#806656",
                          fontSize: "14px",
                          fontWeight: "600",
                          letterSpacing: "2px",
                          margin: "0 0 16px",
                          textTransform: "uppercase",
                        }}
                      >
                        You’re giving a gift to
                      </p>
                      <div
                        style={{
                          borderTop: "2px solid #e5ddd0",
                          marginTop: "20px",
                          paddingTop: "20px",
                        }}
                      >
                        <p
                          style={{
                            color: "#8c3e2b",
                            fontFamily: "'Instrument Serif', Georgia, serif",
                            fontSize: "42px",
                            fontWeight: "normal",
                            letterSpacing: "-0.5px",
                            lineHeight: "1.2",
                            margin: 0,
                          }}
                        >
                          {receiverName}
                        </p>
                        {budget && (
                          <p
                            style={{
                              color: "#806656",
                              fontSize: "16px",
                              margin: "16px 0 0",
                            }}
                          >
                            Budget: {budget}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>

                {/* Reminder */}
                <tr>
                  <td align="center" style={{ padding: "0 40px 40px" }}>
                    <p
                      style={{
                        color: "#806656",
                        fontSize: "16px",
                        fontStyle: "italic",
                        lineHeight: "1.7",
                        margin: 0,
                        maxWidth: "520px",
                      }}
                    >
                      Remember, this is a secret! Don’t let them know you’re
                      their Secret Santa until the big reveal!
                    </p>
                  </td>
                </tr>

                {/* Footer */}
                <tr>
                  <td
                    align="center"
                    style={{
                      borderTop: "1px solid #e5ddd0",
                      padding: "30px 40px 40px",
                    }}
                  >
                    <p
                      style={{
                        color: "#806656",
                        fontSize: "14px",
                        margin: 0,
                      }}
                    >
                      Happy gift giving! 🎄✨
                    </p>
                    <p
                      style={{
                        color: "#a08f84",
                        fontSize: "12px",
                        margin: "16px 0 0",
                      }}
                    >
                      Drawn with{" "}
                      <a
                        href={SITE_URL}
                        style={{
                          color: "#8c3e2b",
                          textDecoration: "underline",
                        }}
                      >
                        Super Simple Secret Santa
                      </a>
                      , free with no sign-up.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  );
}
