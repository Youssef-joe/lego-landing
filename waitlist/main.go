// BricoWerx waitlist: one static binary, one data file, zero dependencies.
//
//	POST /api/waitlist            {"email": "...", "source": "hero|launch|...", "company": ""}   (company is a honeypot)
//	GET  /api/waitlist/count      {"count": 123}
//	GET  /admin/export.csv        Authorization: Bearer $ADMIN_TOKEN   (or ?token=)
//	GET  /healthz
//
// If STATIC_DIR is set the binary also serves the landing page from that folder,
// so the page and the API share one origin and no CORS is needed.
//
// Storage is an append-only JSON Lines file (DB_PATH, default waitlist.jsonl): one
// signup per line, loaded into memory at start, deduplicated by email. It needs no
// driver and survives crashes (each line is fsynced). Swap the Store interface for
// SQLite or Postgres when the list outgrows a file.
package main

import (
	"bufio"
	"context"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/csv"
	"encoding/hex"
	"encoding/json"
	"errors"
	"log"
	"net"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"
)

var emailRe = regexp.MustCompile(`^[^\s@]+@[^\s@]+\.[^\s@]{2,}$`)

type server struct {
	db      Store
	token   string
	origin  string
	salt    string
	limiter *ipLimiter
}

func main() {
	addr := env("ADDR", ":8080")
	dbPath := env("DB_PATH", "waitlist.jsonl")
	token := os.Getenv("ADMIN_TOKEN")
	if token == "" {
		log.Println("warning: ADMIN_TOKEN is empty, /admin routes are disabled")
	}

	db, err := openFileStore(dbPath)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	s := &server{
		db:      db,
		token:   token,
		origin:  os.Getenv("ALLOWED_ORIGIN"), // e.g. https://bricowerx.dev ; empty = same origin only
		salt:    env("IP_SALT", "bwx"),
		limiter: newIPLimiter(5, time.Minute),
	}

	mux := http.NewServeMux()
	mux.HandleFunc("POST /api/waitlist", s.cors(s.join))
	mux.HandleFunc("OPTIONS /api/waitlist", s.cors(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusNoContent) }))
	mux.HandleFunc("GET /api/waitlist/count", s.cors(s.count))
	mux.HandleFunc("GET /admin/export.csv", s.auth(s.exportCSV))
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, r *http.Request) { w.Write([]byte("ok")) })
	if dir := os.Getenv("STATIC_DIR"); dir != "" {
		mux.Handle("/", staticHandler(dir))
		log.Printf("serving static site from %s", dir)
	}

	srv := &http.Server{
		Addr:              addr,
		Handler:           logRequests(secureHeaders(mux)),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       10 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	go func() {
		log.Printf("waitlist listening on %s (db %s)", addr, dbPath)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatal(err)
		}
	}()

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt)
	defer stop()
	<-ctx.Done()
	shutdown, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_ = srv.Shutdown(shutdown)
}

// ---------- handlers ----------

type joinReq struct {
	Email   string `json:"email"`
	Source  string `json:"source"`
	Company string `json:"company"` // honeypot: real people never fill it
}

func (s *server) join(w http.ResponseWriter, r *http.Request) {
	ip := clientIP(r)
	if !s.limiter.allow(ip) {
		writeJSON(w, http.StatusTooManyRequests, map[string]any{"ok": false, "error": "Too many attempts. Try again in a minute."})
		return
	}

	var req joinReq
	ct := r.Header.Get("Content-Type")
	switch {
	case strings.HasPrefix(ct, "application/json"):
		if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 4<<10)).Decode(&req); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]any{"ok": false, "error": "Bad request."})
			return
		}
	default: // classic form post, works with JavaScript disabled
		r.Body = http.MaxBytesReader(w, r.Body, 4<<10)
		if err := r.ParseForm(); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]any{"ok": false, "error": "Bad request."})
			return
		}
		req.Email, req.Source, req.Company = r.Form.Get("email"), r.Form.Get("source"), r.Form.Get("company")
	}

	// honeypot filled: say yes, store nothing
	if strings.TrimSpace(req.Company) != "" {
		writeJSON(w, http.StatusOK, map[string]any{"ok": true})
		return
	}

	email := strings.ToLower(strings.TrimSpace(req.Email))
	if len(email) > 254 || !emailRe.MatchString(email) {
		writeJSON(w, http.StatusUnprocessableEntity, map[string]any{"ok": false, "error": "Please enter a valid email address."})
		return
	}
	source := trunc(strings.TrimSpace(req.Source), 40)

	added, err := s.db.Add(Entry{
		Email: email, Source: source, Referer: trunc(r.Referer(), 200),
		UserAgent: trunc(r.UserAgent(), 200), IPHash: s.hash(ip),
		CreatedAt: time.Now().UTC().Format(time.RFC3339),
	})
	if err != nil {
		log.Printf("store: %v", err)
		writeJSON(w, http.StatusInternalServerError, map[string]any{"ok": false, "error": "Something went wrong. Please try again."})
		return
	}
	count := s.db.Count()

	if wantsHTML(r) { // no-JS fallback
		http.Redirect(w, r, "/?joined=1#launch", http.StatusSeeOther)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "already": !added, "count": count})
}

func (s *server) count(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Cache-Control", "public, max-age=60")
	writeJSON(w, http.StatusOK, map[string]any{"count": s.db.Count()})
}

func (s *server) exportCSV(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/csv; charset=utf-8")
	w.Header().Set("Content-Disposition", `attachment; filename="bwx-waitlist-`+time.Now().UTC().Format("2006-01-02")+`.csv"`)
	cw := csv.NewWriter(w)
	_ = cw.Write([]string{"id", "email", "source", "referer", "user_agent", "created_at"})
	for i, e := range s.db.All() {
		_ = cw.Write([]string{strconv.Itoa(i + 1), e.Email, e.Source, e.Referer, e.UserAgent, e.CreatedAt})
	}
	cw.Flush()
}

// ---------- middleware ----------

func (s *server) auth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if s.token == "" {
			http.NotFound(w, r)
			return
		}
		got := strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")
		if got == "" {
			got = r.URL.Query().Get("token")
		}
		if subtle.ConstantTimeCompare([]byte(got), []byte(s.token)) != 1 {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}
		next(w, r)
	}
}

func (s *server) cors(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if s.origin != "" {
			w.Header().Set("Access-Control-Allow-Origin", s.origin)
			w.Header().Set("Vary", "Origin")
			w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
			w.Header().Set("Access-Control-Max-Age", "600")
		}
		next(w, r)
	}
}

func secureHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")
		w.Header().Set("X-Frame-Options", "DENY")
		next.ServeHTTP(w, r)
	})
}

func logRequests(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t := time.Now()
		next.ServeHTTP(w, r)
		if strings.HasPrefix(r.URL.Path, "/api/") || strings.HasPrefix(r.URL.Path, "/admin/") {
			log.Printf("%s %s %s", r.Method, r.URL.Path, time.Since(t).Round(time.Millisecond))
		}
	})
}

// staticHandler serves the landing page; unknown paths fall back to index.html.
func staticHandler(dir string) http.Handler {
	fs := http.FileServer(http.Dir(dir))
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		p := filepath.Join(dir, filepath.Clean("/"+r.URL.Path))
		if _, err := os.Stat(p); err != nil && filepath.Ext(r.URL.Path) == "" {
			r.URL.Path = "/" // pretty URLs fall back to the page; missing files stay 404
		}
		if strings.HasPrefix(r.URL.Path, "/media/") {
			w.Header().Set("Cache-Control", "public, max-age=604800, immutable")
		}
		fs.ServeHTTP(w, r)
	})
}

// ---------- storage ----------

type Entry struct {
	Email     string `json:"email"`
	Source    string `json:"source,omitempty"`
	Referer   string `json:"referer,omitempty"`
	UserAgent string `json:"user_agent,omitempty"`
	IPHash    string `json:"ip_hash,omitempty"`
	CreatedAt string `json:"created_at"`
}

// Store is the only thing to reimplement to move to SQLite or Postgres.
type Store interface {
	Add(e Entry) (added bool, err error)
	Count() int
	All() []Entry
	Close() error
}

// fileStore: append-only JSON Lines, deduplicated in memory.
type fileStore struct {
	mu   sync.Mutex
	f    *os.File
	list []Entry
	seen map[string]bool
}

func openFileStore(path string) (*fileStore, error) {
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil && filepath.Dir(path) != "." {
		return nil, err
	}
	f, err := os.OpenFile(path, os.O_CREATE|os.O_RDWR|os.O_APPEND, 0o600)
	if err != nil {
		return nil, err
	}
	st := &fileStore{f: f, seen: map[string]bool{}}
	sc := bufio.NewScanner(f)
	sc.Buffer(make([]byte, 64<<10), 1<<20)
	for sc.Scan() {
		line := strings.TrimSpace(sc.Text())
		if line == "" {
			continue
		}
		var e Entry
		if err := json.Unmarshal([]byte(line), &e); err != nil {
			log.Printf("skipping bad line in %s: %v", path, err)
			continue
		}
		if !st.seen[e.Email] {
			st.seen[e.Email] = true
			st.list = append(st.list, e)
		}
	}
	if err := sc.Err(); err != nil {
		return nil, err
	}
	log.Printf("loaded %d signups from %s", len(st.list), path)
	return st, nil
}

func (s *fileStore) Add(e Entry) (bool, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.seen[e.Email] {
		return false, nil
	}
	b, err := json.Marshal(e)
	if err != nil {
		return false, err
	}
	if _, err := s.f.Write(append(b, '\n')); err != nil {
		return false, err
	}
	if err := s.f.Sync(); err != nil {
		return false, err
	}
	s.seen[e.Email] = true
	s.list = append(s.list, e)
	return true, nil
}

func (s *fileStore) Count() int {
	s.mu.Lock()
	defer s.mu.Unlock()
	return len(s.list)
}

func (s *fileStore) All() []Entry {
	s.mu.Lock()
	defer s.mu.Unlock()
	out := make([]Entry, len(s.list))
	copy(out, s.list)
	return out
}

func (s *fileStore) Close() error { return s.f.Close() }

// ---------- rate limiter (token bucket per IP, in memory) ----------

type ipLimiter struct {
	mu     sync.Mutex
	hits   map[string][]time.Time
	limit  int
	window time.Duration
}

func newIPLimiter(limit int, window time.Duration) *ipLimiter {
	l := &ipLimiter{hits: map[string][]time.Time{}, limit: limit, window: window}
	go func() {
		for range time.Tick(window) {
			l.mu.Lock()
			cut := time.Now().Add(-window)
			for k, v := range l.hits {
				if len(v) == 0 || v[len(v)-1].Before(cut) {
					delete(l.hits, k)
				}
			}
			l.mu.Unlock()
		}
	}()
	return l
}

func (l *ipLimiter) allow(ip string) bool {
	l.mu.Lock()
	defer l.mu.Unlock()
	now, cut := time.Now(), time.Now().Add(-l.window)
	kept := l.hits[ip][:0]
	for _, t := range l.hits[ip] {
		if t.After(cut) {
			kept = append(kept, t)
		}
	}
	if len(kept) >= l.limit {
		l.hits[ip] = kept
		return false
	}
	l.hits[ip] = append(kept, now)
	return true
}

// ---------- helpers ----------

func env(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}

func clientIP(r *http.Request) string {
	if xf := r.Header.Get("X-Forwarded-For"); xf != "" { // behind a reverse proxy
		return strings.TrimSpace(strings.Split(xf, ",")[0])
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}

func (s *server) hash(ip string) string {
	h := sha256.Sum256([]byte(s.salt + ip))
	return hex.EncodeToString(h[:8])
}

func wantsHTML(r *http.Request) bool {
	return !strings.HasPrefix(r.Header.Get("Content-Type"), "application/json") &&
		strings.Contains(r.Header.Get("Accept"), "text/html")
}

func writeJSON(w http.ResponseWriter, code int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(v)
}

func trunc(s string, n int) string {
	if len(s) > n {
		return s[:n]
	}
	return s
}
