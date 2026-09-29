export default function Footer() {
  return (
    <>
      <footer className="site-footer">
        <div className="container">


          <div className="footer-grid">
            <div>
              <a href="#" className="footer-brand" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "8px" } as React.CSSProperties}>
                <svg className="brand-mark" width="30" height="30" aria-hidden="true" focusable="false"><use href="#bwx-mark" /></svg>
                <span>BricoWerx</span>
              </a>
              <p>Building from the parts already at hand.</p>
            </div>
            <div className="footer-col">
              <h4>Product</h4>
              <ul>
                <li><a href="#why">Why BricoWerx</a></li>
                <li><a href="#how">How it works</a></li>
                <li><a href="#ai">For AI assistants</a></li>
                <li><a href="#inside">Architecture</a></li>
              </ul>
            </div>
            <div className="footer-col">
              <h4>Resources</h4>
              <ul>
                <li><a href="/docs">Documentation</a></li>
                <li><a href="/docs/mcp">MCP reference</a></li>
              </ul>
            </div>
            <div className="footer-col">
              <h4>Elsewhere</h4>
              <ul>
                <li><a href="#">GitHub</a></li>
              </ul>
            </div>
          </div>
          
          <div className="footer-bottom">
            <span>© {new Date().getFullYear()} BricoWerx</span>
            <span>Open source · offline-first · git is the source of truth</span>
          </div>
        </div>
      </footer>
    </>
  );
}
