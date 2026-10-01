const toolCardStyle = {
  background: 'rgba(255,255,255,0.06)',
  borderRadius: '20px',
  padding: '24px',
} as React.CSSProperties;

const toolSigStyle = {
  color: 'var(--code-accent)',
  fontSize: '15px',
  display: 'block',
  marginBottom: '8px',
} as React.CSSProperties;

const TOOLS = [
  ['search_pieces(query, kind?)', 'Meaning-based search across the Vault.'],
  ['get_piece(name, level)', 'Card, surface, summary or source — the caller picks.'],
  ['plan_reuse(task)', 'What to reuse for a task, and what is genuinely new.'],
  ['get_relations(name, kind?)', 'What this piece depends on, and what depends on it.'],
];

const traceRowStyle = { display: 'flex', gap: '16px' } as React.CSSProperties;
const labelStyle = (color: string) => ({ color, minWidth: '56px' }) as React.CSSProperties;
const tokStyle = { color: 'var(--on-dark-3)' } as React.CSSProperties;

const statCardStyle = {
  background: 'rgba(255,255,255,0.06)',
  borderRadius: '20px',
  padding: '24px',
  textAlign: 'center',
} as React.CSSProperties;

export default function ForAI() {
  return (
    <>
      <section id="ai" className="section-gap">
        <div className="container">
          <div className="band-dark reveal">
            <div style={{ textAlign: 'center', marginBottom: '48px' } as React.CSSProperties}>
              <span className="chip">For AI assistants</span>
            </div>
            <h2 style={{ textAlign: 'center', maxWidth: '22ch', margin: '0 auto' } as React.CSSProperties}>
              Your assistant gets a librarian instead of the whole library.
            </h2>
            <p style={{ textAlign: 'center', margin: '24px auto 0', fontSize: '20px', lineHeight: '1.5', maxWidth: '60ch' } as React.CSSProperties}>
              <code style={{ color: 'var(--code-accent)', fontSize: '16px' } as React.CSSProperties}>brico mcp</code> exposes
              the Vault over the Model Context Protocol. Claude, Cursor, IDE agents, internal copilots — any MCP-capable
              assistant can search your pieces and recommend reuse before writing anything new.
            </p>

            {/* 4 tool cards */}
            <div className="ai-tools" style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '16px', marginTop: '48px' } as React.CSSProperties}>
              {TOOLS.map(([sig, desc]) => (
                <div key={sig} className="tool-card" style={toolCardStyle}>
                  <code className="tool-sig" style={toolSigStyle}>{sig}</code>
                  <p style={{ fontSize: '15px' } as React.CSSProperties}>{desc}</p>
                </div>
              ))}
            </div>

            {/* Conversation trace */}
            <div style={{ marginTop: '48px' } as React.CSSProperties}>
              <p style={{ fontFamily: 'var(--ff-head)', fontWeight: '500', fontSize: '20px', color: 'var(--on-dark)', marginBottom: '24px' } as React.CSSProperties}>
                One exchange
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontFamily: 'var(--ff-mono)', fontSize: '14px', lineHeight: '1.7' } as React.CSSProperties}>
                <div className="trace-row" style={traceRowStyle}>
                  <span style={labelStyle('var(--on-dark-3)')}>DEV →</span>
                  <span style={{ color: 'var(--on-dark)' } as React.CSSProperties}>&quot;add jwt auth to the billing service&quot;</span>
                </div>
                <div className="trace-row" style={traceRowStyle}>
                  <span style={labelStyle('var(--code-accent)')}>TOOL →</span>
                  <span style={{ color: 'var(--on-dark-3)' } as React.CSSProperties}>plan_reuse(&quot;jwt auth, nest&quot;)</span>
                  <span className="trace-tok" style={tokStyle}>· 38 tok</span>
                </div>
                <div className="trace-row" style={traceRowStyle}>
                  <span style={labelStyle('var(--terracotta)')}>VAULT →</span>
                  <span style={{ color: 'var(--on-dark-3)' } as React.CSSProperties}>auth@0.2.0 · card + surface</span>
                  <span className="trace-tok" style={tokStyle}>· 244 tok</span>
                </div>
                <div className="trace-row" style={traceRowStyle}>
                  <span style={labelStyle('var(--code-accent)')}>TOOL →</span>
                  <span style={{ color: 'var(--on-dark-3)' } as React.CSSProperties}>&quot;reuse auth@0.2.0; new: billing webhooks&quot;</span>
                </div>
              </div>
            </div>

            {/* Comparison */}
            <div className="ai-compare" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginTop: '48px' } as React.CSSProperties}>
              <div style={statCardStyle}>
                <p style={{ fontFamily: 'var(--ff-head)', fontWeight: '500', fontSize: '28px', color: 'var(--on-dark)' } as React.CSSProperties}>~300</p>
                <p style={{ fontSize: '15px', marginTop: '8px' } as React.CSSProperties}>tokens · Vault answer</p>
              </div>
              <div style={statCardStyle}>
                <p style={{ fontFamily: 'var(--ff-head)', fontWeight: '500', fontSize: '18px', color: 'var(--on-dark)' } as React.CSSProperties}>Full repo scan</p>
                <p style={{ fontSize: '15px', marginTop: '8px' } as React.CSSProperties}>Repo-indexing assistant</p>
              </div>
            </div>

            <p style={{ textAlign: 'center', marginTop: '32px', fontSize: '16px', color: 'var(--on-dark-3)' } as React.CSSProperties}>
              A 10,000-piece Vault carries about 40 MB of vectors — it fits on the laptop that asks the question.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
