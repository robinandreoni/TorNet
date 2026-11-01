import React from "react";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: "40px",
          margin: "20px",
          background: "rgba(239, 68, 68, 0.1)",
          border: "1px solid rgba(239, 68, 68, 0.3)",
          borderRadius: "12px",
          color: "#f8fafc"
        }}>
          <h2 style={{ color: "#ef4444", marginBottom: "12px", fontSize: "1.2rem" }}>
            ⚠️ Interfaccia Ripristinata Automaticamente
          </h2>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "16px" }}>
            Si è verificato un errore temporaneo nel rendering di un componente. La sessione rimane attiva.
          </p>
          <pre style={{
            background: "rgba(0, 0, 0, 0.5)",
            padding: "12px",
            borderRadius: "6px",
            fontSize: "0.75rem",
            color: "#fca5a5",
            overflowX: "auto"
          }}>
            {this.state.error?.toString()}
          </pre>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="btn btn-primary"
            style={{ marginTop: "16px" }}
          >
            Ricarica Componente
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

