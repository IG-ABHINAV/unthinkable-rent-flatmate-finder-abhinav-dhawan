import { FormEvent, useEffect, useState } from "react";
import { NavLink, Navigate, Route, Routes, useNavigate, useParams } from "react-router-dom";
import { io } from "socket.io-client";
import { api, clearToken, getToken, saveToken, type User, API_URL } from "./api";

type Listing = {
  id: string;
  title: string;
  description: string;
  location: string;
  rent: number;
  availableFrom: string;
  roomType: string;
  furnishingStatus: string;
  photos: string[];
  genderPreference: string;
  smokingAllowed: boolean;
  petsAllowed: boolean;
  dietaryPolicy: string;
  sleepHabitAllowed: string;
  amenities: string[];
  roommateInterests: string[];
  status: string;
  match?: { score: number; explanation: string; scoringMethod: string };
};

type Interest = { id: string; status: string; listing: Listing; tenant: { id: string; name: string; email: string }; message?: string; moveInDate?: string; stayDuration?: number; quickNotes?: string[] };
const money = (n: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

function Auth({ mode, onAuth }: { mode: "login" | "register"; onAuth: (user: User) => void }) {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const result = await api<{ user: User; token: string }>(`/auth/${mode}`, { method: "POST", body: JSON.stringify(values) });
      saveToken(result.token);
      onAuth(result.user);
      navigate("/");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth">
      {/* ── Left panel ─────────────────────────────────── */}
      <section className="auth-copy">
        <span className="eyebrow">SMARTER RENTING · PAN-INDIA</span>
        <h1>A room is only right when the fit feels right.</h1>
        <p>Roomly matches homes and people using budget, location, lifestyle and timing — not endless scrolling.</p>

        {/* Stats row */}
        <div className="auth-stats">
          <div className="auth-stat">
            <strong>12,000+</strong>
            <span>Active listings</span>
          </div>
          <div className="auth-stat">
            <strong>85,000+</strong>
            <span>Happy tenants</span>
          </div>
          <div className="auth-stat">
            <strong>94%</strong>
            <span>Match accuracy</span>
          </div>
          <div className="auth-stat">
            <strong>8 days</strong>
            <span>Avg. to fill</span>
          </div>
        </div>

        {/* Feature highlights */}
        <ul className="auth-features">
          <li>
            <span className="auth-feat-icon">🤖</span>
            <div>
              <strong>AI-powered match scores</strong>
              <span>Every listing ranked with a clear explanation</span>
            </div>
          </li>
          <li>
            <span className="auth-feat-icon">📍</span>
            <div>
              <strong>Neighbourhood-first search</strong>
              <span>Filter by micro-location across 20+ cities</span>
            </div>
          </li>
          <li>
            <span className="auth-feat-icon">💬</span>
            <div>
              <strong>Private real-time chat</strong>
              <span>Connect directly once interest is accepted</span>
            </div>
          </li>
          <li>
            <span className="auth-feat-icon">🔒</span>
            <div>
              <strong>Zero brokerage</strong>
              <span>No middlemen, no hidden fees</span>
            </div>
          </li>
        </ul>

        {/* Mini testimonial */}
        <div className="auth-testimonial">
          <p>"Found my perfect 1BHK in Koramangala in 3 days. The AI score was spot on."</p>
          <div className="auth-testimonial-author">
            <div className="auth-avatar">RM</div>
            <div>
              <strong>Riya Menon</strong>
              <span>Software Engineer, Bangalore · ★★★★★</span>
            </div>
          </div>
        </div>

        {/* Trust badges */}
        <div className="auth-trust">
          <span>✅ Verified listings</span>
          <span>🏙️ Bangalore · Mumbai · Delhi</span>
          <span>🆓 Free to join</span>
        </div>
      </section>

      {/* ── Right panel (form) ─────────────────────────── */}
      <form className="card form" onSubmit={submit}>
        <div>
          <h2>{mode === "login" ? "Welcome back" : "Create your account"}</h2>
          <p style={{ color: "#65716c", fontSize: ".9rem", marginTop: ".25rem" }}>
            {mode === "login"
              ? "Sign in to see your personalised matches."
              : "Join 85,000+ tenants finding their perfect room."}
          </p>
        </div>

        {mode === "register" && (
          <>
            <label>
              Full name
              <input name="name" required minLength={2} placeholder="e.g. Priya Sharma" />
            </label>
            <label>
              I am a
              <select name="role">
                <option value="TENANT">Tenant – looking for a room</option>
                <option value="OWNER">Owner – listing my room</option>
              </select>
            </label>
          </>
        )}

        <label>
          Email address
          <input name="email" type="email" required placeholder="you@example.com" />
        </label>
        <label>
          Password
          <input name="password" type="password" minLength={8} required placeholder="Min. 8 characters" />
        </label>

        {error && <p className="error">⚠ {error}</p>}

        <button disabled={busy} style={{ marginTop: ".25rem" }}>
          {busy ? "Please wait…" : mode === "login" ? "Sign in →" : "Join Roomly →"}
        </button>

        <p style={{ textAlign: "center", fontSize: ".88rem" }}>
          {mode === "login"
            ? <><span style={{ color: "#65716c" }}>New here?</span> <NavLink to="/register">Create a free account</NavLink></>
            : <><span style={{ color: "#65716c" }}>Already a member?</span> <NavLink to="/login">Sign in</NavLink></>}
        </p>

        {mode === "register" && (
          <p style={{ fontSize: ".78rem", color: "#8a9990", textAlign: "center", borderTop: "1px solid var(--line)", paddingTop: ".75rem", marginTop: ".25rem" }}>
            By creating an account you agree to our Terms of Service and Privacy Policy.
          </p>
        )}
      </form>
    </main>
  );
}

function Profile() {
  const [message, setMessage] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const availableInterests = ["gaming", "music", "cooking", "yoga", "reading", "travel", "movies", "art", "sports", "gym", "coding", "gardening", "photography", "pets", "hiking", "fitness", "dancing", "podcasts"];

  useEffect(() => {
    api<any>("/profile").then(p => {
      if (!p) return;
      const form = document.querySelector<HTMLFormElement>("#profile-form")!;
      Object.entries(p).forEach(([k, v]) => {
        if (k === "interests" && Array.isArray(v)) {
          setInterests(v);
          return;
        }
        const field = form.elements.namedItem(k) as HTMLInputElement | HTMLSelectElement | null;
        if (field) {
          if (field.type === "checkbox") {
            (field as HTMLInputElement).checked = Boolean(v);
          } else {
            field.value = k === "moveInDate" ? String(v).slice(0, 10) : String(v);
          }
        }
      });
    });
  }, []);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const raw = Object.fromEntries(new FormData(form));
    
    const smoking = form.querySelector<HTMLSelectElement>("[name=smoking]")?.value === "true";
    const pets = form.querySelector<HTMLSelectElement>("[name=pets]")?.value === "true";

    const body = {
      ...raw,
      budgetMin: Number(raw.budgetMin),
      budgetMax: Number(raw.budgetMax),
      smoking,
      pets,
      interests
    };

    await api("/profile", {
      method: "PUT",
      body: JSON.stringify(body)
    });
    setMessage("Preferences saved. Your scores will refresh automatically.");
  }

  const toggleInterest = (interest: string) => {
    setInterests(prev => prev.includes(interest) ? prev.filter(x => x !== interest) : [...prev, interest]);
  };

  return (
    <Page title="Your preferences" intro="Tell us what a good roommate fit looks like.">
      <form id="profile-form" className="card form grid" onSubmit={submit}>
        <h3 className="wide section-title" style={{ gridColumn: "1/-1", margin: "1rem 0 0.5rem", borderBottom: "1px solid var(--line)", paddingBottom: "0.25rem" }}>Basics</h3>
        <label>Preferred area<input name="preferredLocation" required /></label>
        <label>Minimum budget<input name="budgetMin" type="number" min="0" required /></label>
        <label>Maximum budget<input name="budgetMax" type="number" min="1" required /></label>
        <label>Move-in date<input name="moveInDate" type="date" required /></label>
        <label>Your Gender
          <select name="gender" required>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
            <option value="OTHER">Other</option>
          </select>
        </label>
        <label>Roommate Gender Preference
          <select name="genderPreference" required>
            <option value="ANY">Any</option>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
          </select>
        </label>

        <h3 className="wide section-title" style={{ gridColumn: "1/-1", margin: "1.5rem 0 0.5rem", borderBottom: "1px solid var(--line)", paddingBottom: "0.25rem" }}>Lifestyle Habits</h3>
        <label>Do you smoke?
          <select name="smoking" required>
            <option value="false">No</option>
            <option value="true">Yes</option>
          </select>
        </label>
        <label>Do you have pets?
          <select name="pets" required>
            <option value="false">No</option>
            <option value="true">Yes</option>
          </select>
        </label>
        <label>Diet preference
          <select name="diet" required>
            <option value="ANY">Any</option>
            <option value="VEG">Veg only</option>
            <option value="NON_VEG">Non-veg</option>
          </select>
        </label>
        <label>Sleeping cycle
          <select name="sleepHabit" required>
            <option value="ANY">Any</option>
            <option value="EARLY_BIRD">Early bird</option>
            <option value="NIGHT_OWL">Night owl</option>
          </select>
        </label>

        <div className="wide interests-section" style={{ gridColumn: "1/-1", marginTop: "1.5rem" }}>
          <h3 style={{ margin: "0 0 0.25rem" }}>Your Hobbies & Interests</h3>
          <p className="subtext" style={{ fontSize: "0.85rem", color: "#666", margin: "0 0 1rem" }}>Select all that apply to you. We use this to highlight shared interests!</p>
          <div className="interest-tags" style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            {availableInterests.map(tag => (
              <button
                type="button"
                key={tag}
                className={`tag-btn ${interests.includes(tag) ? "active" : ""}`}
                style={{
                  background: interests.includes(tag) ? "var(--green)" : "#e6e9df",
                  color: interests.includes(tag) ? "white" : "var(--ink)",
                  border: "none",
                  borderRadius: "20px",
                  padding: "0.4rem 1rem",
                  cursor: "pointer",
                  fontWeight: 600,
                  transition: "all 0.2s"
                }}
                onClick={() => toggleInterest(tag)}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        <button className="wide" style={{ gridColumn: "1/-1", marginTop: "2rem" }}>Save preferences</button>
        {message && <p className="success wide" style={{ gridColumn: "1/-1" }}>{message}</p>}
      </form>
    </Page>
  );
}

function Browse() {
  const [items, setItems] = useState<Listing[]>([]);
  const [myProfile, setMyProfile] = useState<any>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  
  const [locFilter, setLocFilter] = useState("");
  const [minBudget, setMinBudget] = useState("");
  const [maxBudget, setMaxBudget] = useState("");
  const [genderFilter, setGenderFilter] = useState("ALL");
  const [smokingFilter, setSmokingFilter] = useState("ALL");
  const [petsFilter, setPetsFilter] = useState("ALL");
  const [dietFilter, setDietFilter] = useState("ALL");
  const [furnishingFilter, setFurnishingFilter] = useState("ALL");

  async function load(location = "", budgetMin = "", budgetMax = "") {
    setLoading(true);
    setError("");
    try {
      const queryParams = new URLSearchParams();
      if (location) queryParams.set("location", location.trim());
      if (budgetMin) queryParams.set("budgetMin", budgetMin);
      if (budgetMax) queryParams.set("budgetMax", budgetMax);
      
      const queryString = queryParams.toString() ? `?${queryParams.toString()}` : "";
      const [listings, profile] = await Promise.all([
        api<Listing[]>(`/listings${queryString}`),
        api<any>("/profile").catch(() => null)
      ]);
      setItems(listings);
      setMyProfile(profile);
    } catch(e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(locFilter, minBudget, maxBudget); }, []);

  const [interestModalListingId, setInterestModalListingId] = useState<string | null>(null);
  const [interestMessage, setInterestMessage] = useState("");
  const [interestMoveInDate, setInterestMoveInDate] = useState("");
  const [interestStayDuration, setInterestStayDuration] = useState("");
  const [interestQuickNotes, setInterestQuickNotes] = useState<string[]>([]);

  const quickNotesOptions = [
    "Ready to move in immediately",
    "Quiet & clean flatmate",
    "Open to shared chores",
    "Pet lover",
    "Vegetarian friendly",
    "Non-smoker",
    "Okay with late night study/work"
  ];

  async function submitInterest(e: React.FormEvent) {
    e.preventDefault();
    if (!interestModalListingId) return;
    try {
      await api("/interests", {
        method: "POST",
        body: JSON.stringify({
          listingId: interestModalListingId,
          message: interestMessage || undefined,
          moveInDate: interestMoveInDate || undefined,
          stayDuration: interestStayDuration ? Number(interestStayDuration) : undefined,
          quickNotes: interestQuickNotes
        })
      });
      alert("Interest sent to the owner!");
      setInterestModalListingId(null);
      setInterestMessage("");
      setInterestMoveInDate("");
      setInterestStayDuration("");
      setInterestQuickNotes([]);
    } catch(e) {
      alert((e as Error).message);
    }
  }

  const filteredItems = items.filter(x => {
    if (genderFilter !== "ALL" && x.genderPreference !== "ANY" && x.genderPreference !== genderFilter) return false;
    if (smokingFilter !== "ALL") {
      const isSmokingAllowed = x.smokingAllowed;
      if (smokingFilter === "YES" && !isSmokingAllowed) return false;
      if (smokingFilter === "NO" && isSmokingAllowed) return false;
    }
    if (petsFilter !== "ALL") {
      const isPetsAllowed = x.petsAllowed;
      if (petsFilter === "YES" && !isPetsAllowed) return false;
      if (petsFilter === "NO" && isPetsAllowed) return false;
    }
    if (dietFilter !== "ALL" && x.dietaryPolicy !== dietFilter) return false;
    if (furnishingFilter !== "ALL" && !x.furnishingStatus.toLowerCase().includes(furnishingFilter.toLowerCase())) return false;
    return true;
  });

  return (
    <Page title="Find your next place" intro="Ranked for you with deep compatibility details.">
      <div className="filters-container card" style={{ padding: "1.5rem", marginBottom: "2rem" }}>
        <h3 style={{ margin: "0 0 1rem" }}>Filter Rooms</h3>
        <div className="filters-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "1rem" }}>
          <label>Location
            <input value={locFilter} onChange={e => setLocFilter(e.target.value)} placeholder="Indiranagar, Koramangala..." />
          </label>
          <label>Min Budget
            <input type="number" value={minBudget} onChange={e => setMinBudget(e.target.value)} placeholder="Min" />
          </label>
          <label>Max Budget
            <input type="number" value={maxBudget} onChange={e => setMaxBudget(e.target.value)} placeholder="Max" />
          </label>
          <label>Gender Preference
            <select value={genderFilter} onChange={e => setGenderFilter(e.target.value)}>
              <option value="ALL">Any</option>
              <option value="MALE">Male only</option>
              <option value="FEMALE">Female only</option>
            </select>
          </label>
          <label>Smoking Allowed?
            <select value={smokingFilter} onChange={e => setSmokingFilter(e.target.value)}>
              <option value="ALL">Any</option>
              <option value="YES">Yes</option>
              <option value="NO">No</option>
            </select>
          </label>
          <label>Pets Allowed?
            <select value={petsFilter} onChange={e => setPetsFilter(e.target.value)}>
              <option value="ALL">Any</option>
              <option value="YES">Yes</option>
              <option value="NO">No</option>
            </select>
          </label>
          <label>Dietary Policy
            <select value={dietFilter} onChange={e => setDietFilter(e.target.value)}>
              <option value="ALL">Any</option>
              <option value="NO_RESTRICTIONS">No restrictions</option>
              <option value="VEG_ONLY">Veg only</option>
            </select>
          </label>
          <label>Furnishing
            <select value={furnishingFilter} onChange={e => setFurnishingFilter(e.target.value)}>
              <option value="ALL">Any</option>
              <option value="fully">Fully furnished</option>
              <option value="semi">Semi furnished</option>
            </select>
          </label>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "1.5rem" }}>
          <button className="secondary" onClick={() => {
            setLocFilter("");
            setMinBudget("");
            setMaxBudget("");
            void load("", "", "");
          }}>Clear Search</button>
          <button onClick={() => void load(locFilter, minBudget, maxBudget)} style={{ background: "var(--green)", color: "white" }}>Search</button>
        </div>
      </div>

      {error && (
        <div className="notice">
          {error === "Tenant profile required" ? (
            <>Create your <NavLink to="/profile">tenant profile</NavLink> before browsing.</>
          ) : error}
        </div>
      )}

      {loading ? (
        <p>Finding compatible rooms...</p>
      ) : filteredItems.length === 0 ? (
        <p className="no-results" style={{ textAlign: "center", color: "#666", padding: "3rem" }}>No compatible rooms found matching your active filters.</p>
      ) : (
        <div className="cards">
          {filteredItems.map(x => {
            const score = x.match?.score ?? 0;
            const scoreClass = score >= 90 ? "high" : score >= 70 ? "medium" : "low";
            
            const matchedTags: string[] = [];
            const mismatchedTags: string[] = [];

            if (myProfile) {
              if (x.location.toLowerCase() === myProfile.preferredLocation.toLowerCase()) {
                matchedTags.push("📍 Location matched");
              }
              if (x.dietaryPolicy === "VEG_ONLY" && myProfile.diet === "VEG") {
                matchedTags.push("🥗 Both Vegetarian");
              } else if (x.dietaryPolicy === "VEG_ONLY" && myProfile.diet === "NON_VEG") {
                mismatchedTags.push("🥩 Veg-only flat (You eat Non-Veg)");
              }
              if (myProfile.smoking && !x.smokingAllowed) {
                mismatchedTags.push("🚭 Non-smoking flat (You smoke)");
              } else if (!myProfile.smoking && !x.smokingAllowed) {
                matchedTags.push("🚭 Non-smoking match");
              }
              if (myProfile.pets && x.petsAllowed) {
                matchedTags.push("🐾 Pet friendly match");
              } else if (myProfile.pets && !x.petsAllowed) {
                mismatchedTags.push("🚫 No pets allowed");
              }
              if (myProfile.sleepHabit !== "ANY" && x.sleepHabitAllowed !== "ANY") {
                if (myProfile.sleepHabit === x.sleepHabitAllowed) {
                  matchedTags.push(`⏰ Both ${myProfile.sleepHabit.toLowerCase().replace('_', ' ')}s`);
                } else {
                  mismatchedTags.push(`⏰ Sleep schedule conflict`);
                }
              }
              const shared = (myProfile.interests || []).filter((i: string) => (x.roommateInterests || []).includes(i));
              shared.forEach((interest: string) => {
                matchedTags.push(`⭐ Shared interest: ${interest}`);
              });
            }

            return (
              <article className="listing card" key={x.id} style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div>
                  {x.photos[0] && <img src={x.photos[0]} alt="" />}
                  
                  <div className={`score ${scoreClass}`} style={{
                    background: score >= 90 ? "var(--lime)" : score >= 70 ? "#fff3cd" : "#f8d7da",
                    border: score >= 90 ? "2px solid var(--green)" : score >= 70 ? "2px solid #ffc107" : "2px solid #dc3545"
                  }}>
                    <strong>{score}%</strong>
                    <span>{x.match?.scoringMethod === "LLM" ? "AI match" : "Smart match"}</span>
                  </div>

                  <h2>{x.title}</h2>
                  <p className="meta">{x.location} · {x.roomType} · {x.furnishingStatus}</p>
                  <p className="description" style={{ margin: "1rem 0" }}>{x.description}</p>
                  
                  {x.amenities && x.amenities.length > 0 && (
                    <div className="amenities-container" style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginBottom: "1rem" }}>
                      {x.amenities.map(am => (
                        <span className="amenity-tag" key={am} style={{ fontSize: "0.75rem", background: "#f0f2eb", padding: "0.2rem 0.6rem", borderRadius: "4px", color: "var(--ink)", fontWeight: 500 }}>{am}</span>
                      ))}
                    </div>
                  )}

                  {myProfile && (matchedTags.length > 0 || mismatchedTags.length > 0) && (
                    <div className="compatibility-badges" style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginBottom: "1rem" }}>
                      {matchedTags.map(tag => (
                        <span className="comp-tag match" key={tag} style={{ fontSize: "0.75rem", background: "#d4edda", color: "#155724", padding: "0.25rem 0.6rem", borderRadius: "12px", fontWeight: 600 }}>{tag}</span>
                      ))}
                      {mismatchedTags.map(tag => (
                        <span className="comp-tag mismatch" key={tag} style={{ fontSize: "0.75rem", background: "#f8d7da", color: "#721c24", padding: "0.25rem 0.6rem", borderRadius: "12px", fontWeight: 600 }}>{tag}</span>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <div className="listing-foot">
                    <strong>{money(x.rent)}<small>/month</small></strong>
                    <button onClick={() => setInterestModalListingId(x.id)}>I'm interested</button>
                  </div>

                  <details style={{ marginTop: "1rem" }}>
                    <summary style={{ cursor: "pointer", fontWeight: 600, color: "var(--green)" }}>Why this score?</summary>
                    <p className="explanation-text" style={{ fontSize: "0.9rem", color: "#444", padding: "0.5rem 0 0", lineHeight: 1.5 }}>{x.match?.explanation}</p>
                  </details>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {interestModalListingId && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0,0,0,0.6)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          padding: "1rem",
          backdropFilter: "blur(4px)"
        }}>
          <div className="card" style={{
            background: "white",
            width: "100%",
            maxWidth: "500px",
            padding: "2rem",
            borderRadius: "12px",
            boxShadow: "0 8px 30px rgba(0,0,0,0.15)",
            display: "flex",
            flexDirection: "column",
            gap: "1.5rem",
            maxHeight: "90vh",
            overflowY: "auto",
            position: "relative"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #eee", paddingBottom: "1rem" }}>
              <h2 style={{ margin: 0, fontSize: "1.5rem" }}>Express Interest</h2>
              <button className="ghost" onClick={() => setInterestModalListingId(null)} style={{ fontSize: "1.75rem", padding: 0, lineHeight: 1, cursor: "pointer", border: "none", background: "none" }}>&times;</button>
            </div>
            
            <form onSubmit={submitInterest} style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
              <label style={{ display: "flex", flexDirection: "column", gap: "0.4rem", fontWeight: 600 }}>
                Proposed Move-in Date
                <input type="date" value={interestMoveInDate} onChange={e => setInterestMoveInDate(e.target.value)} required style={{ padding: "0.5rem", borderRadius: "6px", border: "1px solid #ccc" }} />
              </label>
              
              <label style={{ display: "flex", flexDirection: "column", gap: "0.4rem", fontWeight: 600 }}>
                Proposed Duration (Months)
                <input type="number" min="1" placeholder="e.g. 12" value={interestStayDuration} onChange={e => setInterestStayDuration(e.target.value)} required style={{ padding: "0.5rem", borderRadius: "6px", border: "1px solid #ccc" }} />
              </label>
              
              <div>
                <span style={{ fontSize: "0.9rem", fontWeight: 600, display: "block", marginBottom: "0.5rem" }}>Quick Highlights</span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                  {quickNotesOptions.map(note => {
                    const active = interestQuickNotes.includes(note);
                    return (
                      <button
                        type="button"
                        key={note}
                        onClick={() => setInterestQuickNotes(prev => prev.includes(note) ? prev.filter(x => x !== note) : [...prev, note])}
                        style={{
                          fontSize: "0.75rem",
                          padding: "0.3rem 0.7rem",
                          borderRadius: "20px",
                          border: "1px solid " + (active ? "var(--green)" : "#ccc"),
                          background: active ? "var(--green)" : "#f0f2eb",
                          color: active ? "white" : "var(--ink)",
                          cursor: "pointer",
                          transition: "all 0.2s"
                        }}
                      >
                        {note}
                      </button>
                    );
                  })}
                </div>
              </div>

              <label style={{ display: "flex", flexDirection: "column", gap: "0.4rem", fontWeight: 600 }}>
                Personal Message
                <textarea
                  placeholder="Introduce yourself to the owner..."
                  value={interestMessage}
                  onChange={e => setInterestMessage(e.target.value)}
                  style={{ minHeight: "100px", resize: "vertical", width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid #ccc", boxSizing: "border-box" }}
                  maxLength={1000}
                />
              </label>
              
              <div style={{ display: "flex", gap: "1rem", marginTop: "1rem", borderTop: "1px solid #eee", paddingTop: "1.2rem" }}>
                <button type="button" className="secondary" onClick={() => setInterestModalListingId(null)} style={{ flex: 1 }}>Cancel</button>
                <button type="submit" style={{ flex: 1, background: "var(--green)", color: "white" }}>Send Request</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Page>
  );
}

function OwnerListings() {
  const [items, setItems] = useState<Listing[]>([]);
  const [amenities, setAmenities] = useState<string[]>([]);
  const [roommateInterests, setRoommateInterests] = useState<string[]>([]);
  
  const availableAmenities = ["Wifi", "AC", "Gym", "Parking", "Kitchen", "Laundry"];
  const availableInterests = ["gaming", "music", "cooking", "yoga", "reading", "travel", "movies", "art", "sports", "gym", "coding", "gardening", "photography", "pets", "hiking", "fitness", "dancing", "podcasts"];

  const load = () => api<Listing[]>("/listings/mine").then(setItems);
  useEffect(() => { void load(); }, []);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const raw = Object.fromEntries(new FormData(form));

    const smokingAllowed = form.querySelector<HTMLSelectElement>("[name=smokingAllowed]")?.value === "true";
    const petsAllowed = form.querySelector<HTMLSelectElement>("[name=petsAllowed]")?.value === "true";

    const body = {
      ...raw,
      rent: Number(raw.rent),
      photos: String(raw.photos || "").split(",").map(v => v.trim()).filter(Boolean),
      smokingAllowed,
      petsAllowed,
      amenities,
      roommateInterests
    };

    await api("/listings", {
      method: "POST",
      body: JSON.stringify(body)
    });
    
    form.reset();
    setAmenities([]);
    setRoommateInterests([]);
    await load();
  }

  async function fill(id: string) {
    await api(`/listings/${id}/fill`, { method: "PATCH" });
    await load();
  }

  const toggleAmenity = (item: string) => {
    setAmenities(prev => prev.includes(item) ? prev.filter(x => x !== item) : [...prev, item]);
  };

  const toggleInterest = (item: string) => {
    setRoommateInterests(prev => prev.includes(item) ? prev.filter(x => x !== item) : [...prev, item]);
  };

  return (
    <Page title="Your rooms" intro="Publish availability and manage it from one place.">
      <details className="card create" style={{ marginBottom: "2rem" }}>
        <summary style={{ fontSize: "1.2rem", fontWeight: 700, cursor: "pointer" }}>Add a room</summary>
        <form className="form grid" onSubmit={submit}>
          <h3 className="wide section-title" style={{ gridColumn: "1/-1", margin: "1rem 0 0.5rem", borderBottom: "1px solid var(--line)", paddingBottom: "0.25rem" }}>Basics</h3>
          <label>Title<input name="title" required /></label>
          <label>Location<input name="location" required /></label>
          <label>Monthly rent (Rs.)<input name="rent" type="number" min="1" required /></label>
          <label>Available from<input name="availableFrom" type="date" required /></label>
          <label>Room type<input name="roomType" placeholder="Single room, shared room, 1BHK..." required /></label>
          <label>Furnishing<input name="furnishingStatus" placeholder="Fully, semi, unfurnished" required /></label>
          <label className="wide" style={{ gridColumn: "1/-1" }}>Description<textarea name="description" minLength={10} required /></label>
          <label className="wide" style={{ gridColumn: "1/-1" }}>Photo URLs (comma separated)<input name="photos" /></label>

          <h3 className="wide section-title" style={{ gridColumn: "1/-1", margin: "1.5rem 0 0.5rem", borderBottom: "1px solid var(--line)", paddingBottom: "0.25rem" }}>House Rules & Preferences</h3>
          <label>Gender Preference
            <select name="genderPreference" required>
              <option value="ANY">Any</option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
            </select>
          </label>
          <label>Smoking Allowed?
            <select name="smokingAllowed" required>
              <option value="false">No</option>
              <option value="true">Yes</option>
            </select>
          </label>
          <label>Pets Allowed?
            <select name="petsAllowed" required>
              <option value="false">No</option>
              <option value="true">Yes</option>
            </select>
          </label>
          <label>Dietary Policy
            <select name="dietaryPolicy" required>
              <option value="NO_RESTRICTIONS">No restrictions</option>
              <option value="VEG_ONLY">Veg only</option>
            </select>
          </label>
          <label>Sleeping Habit Allowed
            <select name="sleepHabitAllowed" required>
              <option value="ANY">Any</option>
              <option value="EARLY_BIRD">Early bird</option>
              <option value="NIGHT_OWL">Night owl</option>
            </select>
          </label>

          <div className="wide section-title" style={{ gridColumn: "1/-1", marginTop: "1.5rem" }}>
            <h3 style={{ margin: "0 0 0.5rem" }}>Amenities Included</h3>
            <div className="interest-tags" style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              {availableAmenities.map(am => (
                <button
                  type="button"
                  key={am}
                  className={`tag-btn ${amenities.includes(am) ? "active" : ""}`}
                  style={{
                    background: amenities.includes(am) ? "var(--green)" : "#e6e9df",
                    color: amenities.includes(am) ? "white" : "var(--ink)",
                    border: "none",
                    borderRadius: "20px",
                    padding: "0.4rem 1rem",
                    cursor: "pointer",
                    fontWeight: 600,
                    transition: "all 0.2s"
                  }}
                  onClick={() => toggleAmenity(am)}
                >
                  {am}
                </button>
              ))}
            </div>
          </div>

          <div className="wide section-title" style={{ gridColumn: "1/-1", marginTop: "1.5rem" }}>
            <h3 style={{ margin: "0 0 0.5rem" }}>Preferred Flatmate Hobbies/Interests</h3>
            <div className="interest-tags" style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              {availableInterests.map(tag => (
                <button
                  type="button"
                  key={tag}
                  className={`tag-btn ${roommateInterests.includes(tag) ? "active" : ""}`}
                  style={{
                    background: roommateInterests.includes(tag) ? "var(--green)" : "#e6e9df",
                    color: roommateInterests.includes(tag) ? "white" : "var(--ink)",
                    border: "none",
                    borderRadius: "20px",
                    padding: "0.4rem 1rem",
                    cursor: "pointer",
                    fontWeight: 600,
                    transition: "all 0.2s"
                  }}
                  onClick={() => toggleInterest(tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <button className="wide" style={{ gridColumn: "1/-1", marginTop: "2rem" }}>Publish room</button>
        </form>
      </details>

      <div className="cards">
        {items.map(x => (
          <article className="card listing" key={x.id}>
            <span className={`pill ${x.status.toLowerCase()}`}>{x.status}</span>
            {x.photos[0] && <img src={x.photos[0]} alt="" />}
            <h2>{x.title}</h2>
            <p className="meta">{x.location} · {x.roomType} · {x.furnishingStatus}</p>
            <div className="listing-details-summary" style={{ margin: "1rem 0" }}>
              <span className="detail-tag" style={{ display: "inline-block", background: "#f0f2eb", padding: "0.25rem 0.6rem", borderRadius: "4px", fontSize: "0.85rem", marginRight: "0.5rem" }}>Rent: {money(x.rent)}/mo</span>
              <span className="detail-tag" style={{ display: "inline-block", background: "#f0f2eb", padding: "0.25rem 0.6rem", borderRadius: "4px", fontSize: "0.85rem" }}>Gender: {x.genderPreference.toLowerCase()}</span>
              {x.amenities && x.amenities.length > 0 && (
                <div className="sub-section" style={{ marginTop: "0.8rem", fontSize: "0.9rem" }}>
                  <strong>Amenities:</strong> {x.amenities.join(", ")}
                </div>
              )}
            </div>
            {x.status === "ACTIVE" && (
              <button className="secondary" style={{ width: "100%", marginTop: "0.5rem" }} onClick={() => fill(x.id)}>Mark filled</button>
            )}
          </article>
        ))}
      </div>
    </Page>
  );
}

function Interests({ user }: { user: User }) {
  const [items, setItems] = useState<Interest[]>([]);
  const load = () => api<Interest[]>("/interests/mine").then(setItems);
  useEffect(() => { void load(); }, []);

  async function answer(id: string, status: string) {
    await api(`/interests/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
    await load();
  }

  return (
    <Page
      title="Interests"
      intro={user.role === "OWNER" ? "Review people who like your rooms." : "Track your requests and accepted chats."}
    >
      <div className="stack" style={{ gap: "1.5rem" }}>
        {items.length === 0 ? (
          <p style={{ color: "#666", fontStyle: "italic" }}>No interest requests found yet.</p>
        ) : (
          items.map(x => (
            <article className="card interest" key={x.id} style={{ display: "flex", flexDirection: "column", gap: "1rem", padding: "1.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
                <div>
                  <span className={`pill ${x.status.toLowerCase()}`} style={{ display: "inline-block", marginBottom: "0.5rem" }}>
                    {x.status}
                  </span>
                  <h2 style={{ margin: "0 0 0.25rem", fontSize: "1.3rem" }}>{x.listing.title}</h2>
                  <p style={{ color: "#666", margin: 0, fontSize: "0.9rem" }}>
                    {user.role === "OWNER" ? (
                      <strong>Applicant: {x.tenant.name} ({x.tenant.email})</strong>
                    ) : (
                      <span>Location: {x.listing.location}</span>
                    )}
                  </p>
                </div>
                <div className="actions" style={{ display: "flex", gap: "0.5rem" }}>
                  {user.role === "OWNER" && x.status === "PENDING" && (
                    <>
                      <button onClick={() => answer(x.id, "ACCEPTED")} style={{ background: "var(--green)", color: "white" }}>Accept</button>
                      <button className="secondary" onClick={() => answer(x.id, "DECLINED")}>Decline</button>
                    </>
                  )}
                  {x.status === "ACCEPTED" && (
                    <NavLink className="button" to={`/chat/${x.id}`} style={{ background: "var(--green)", color: "white" }}>Open chat</NavLink>
                  )}
                </div>
              </div>

              <div style={{ background: "#f8f9f6", padding: "1rem", borderRadius: "8px", fontSize: "0.9rem", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.8rem", border: "1px solid #eef0ea" }}>
                <div>
                  <strong>Proposed Move-in:</strong> {x.moveInDate ? new Date(x.moveInDate).toLocaleDateString() : "Not specified"}
                </div>
                <div>
                  <strong>Stay Duration:</strong> {x.stayDuration ? `${x.stayDuration} months` : "Not specified"}
                </div>
              </div>

              {x.quickNotes && x.quickNotes.length > 0 && (
                <div>
                  <strong style={{ fontSize: "0.85rem", color: "#555", display: "block", marginBottom: "0.4rem" }}>Highlights:</strong>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                    {x.quickNotes.map(note => (
                      <span key={note} style={{ fontSize: "0.75rem", background: "#e8ede4", color: "var(--ink)", padding: "0.2rem 0.6rem", borderRadius: "12px", fontWeight: 500 }}>
                        {note}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {x.message && (
                <div style={{ borderLeft: "3px solid var(--green)", paddingLeft: "1rem", margin: "0.5rem 0 0", fontStyle: "italic", color: "#444", fontSize: "0.95rem", lineHeight: 1.5 }}>
                  "{x.message}"
                </div>
              )}
            </article>
          ))
        )}
      </div>
    </Page>
  );
}

function Chat() {
  const {id=""}=useParams(); const [messages,setMessages]=useState<Array<{id:string;content:string;createdAt:string;sender:{name:string}}>>([]); const [error,setError]=useState("");
  useEffect(()=>{api<typeof messages>(`/chat/${id}/messages`).then(setMessages).catch(e=>setError(e.message)); const socket=io(API_URL || undefined, {auth:{token:getToken()}}); socket.emit("join_room",{interestId:id}); socket.on("message_received",m=>setMessages(old=>old.some(x=>x.id===m.id)?old:[...old,m])); return()=>{socket.disconnect()};},[id]);
  function send(e:FormEvent<HTMLFormElement>){e.preventDefault();const form=e.currentTarget;const content=String(new FormData(form).get("content"));const socket=io(API_URL || undefined, {auth:{token:getToken()}});socket.emit("join_room",{interestId:id},()=>socket.emit("send_message",{interestId:id,content},(r:{ok:boolean;error?:string})=>{if(r.ok)form.reset();else setError(r.error||"Could not send");socket.disconnect()}));}
  return <Page title="Conversation" intro="This private chat opened when the interest was accepted.">{error&&<p className="error">{error}</p>}<div className="chat card">{messages.map(m=><div className="message" key={m.id}><strong>{m.sender.name}</strong><p>{m.content}</p><time>{new Date(m.createdAt).toLocaleString()}</time></div>)}</div><form className="composer" onSubmit={send}><input name="content" maxLength={2000} placeholder="Write a message…" required/><button>Send</button></form></Page>;
}

function Admin(){const [stats,setStats]=useState<Record<string,number>>({});const [users,setUsers]=useState<Array<User&{active:boolean}>>([]);useEffect(()=>{void Promise.all([api<Record<string,number>>("/admin/activity").then(setStats),api<typeof users>("/admin/users").then(setUsers)])},[]);return <Page title="Platform activity" intro="A clean view across users, listings and successful connections."><div className="stats">{Object.entries(stats).map(([k,v])=><div className="card" key={k}><strong>{v}</strong><span>{k.replace(/([A-Z])/g," $1")}</span></div>)}</div><div className="card table"><h2>Users</h2>{users.map(u=><div key={u.id}><span>{u.name}<small>{u.email}</small></span><span>{u.role} · {u.active?"Active":"Disabled"}</span></div>)}</div></Page>}

function Page({title,intro,children}:{title:string;intro:string;children:React.ReactNode}){return <main className="page"><header className="page-head"><span className="eyebrow">ROOMLY</span><h1>{title}</h1><p>{intro}</p></header>{children}</main>}
function Shell({user,logout}:{user:User;logout:()=>void}){return <><nav><NavLink className="brand" to="/">roomly<span>.</span></NavLink><div>{user.role==="TENANT"&&<><NavLink to="/">Browse</NavLink><NavLink to="/profile">Preferences</NavLink><NavLink to="/interests">Interests</NavLink></>}{user.role==="OWNER"&&<><NavLink to="/">Listings</NavLink><NavLink to="/interests">Interests</NavLink></>}{user.role==="ADMIN"&&<NavLink to="/">Admin</NavLink>}<button className="ghost" onClick={logout}>Sign out</button></div></nav><Routes><Route path="/" element={user.role==="TENANT"?<Browse/>:user.role==="OWNER"?<OwnerListings/>:<Admin/>}/><Route path="/profile" element={user.role==="TENANT"?<Profile/>:<Navigate to="/"/>}/><Route path="/interests" element={<Interests user={user}/>}/><Route path="/chat/:id" element={<Chat/>}/><Route path="*" element={<Navigate to="/"/>}/></Routes></>}
export function App(){const [user,setUser]=useState<User|null>(null);const [ready,setReady]=useState(false);useEffect(()=>{if(!getToken()){setReady(true);return}api<User>("/auth/me").then(setUser).catch(clearToken).finally(()=>setReady(true))},[]);if(!ready)return <div className="loading">roomly<span>.</span></div>;if(!user)return <Routes><Route path="/register" element={<Auth mode="register" onAuth={setUser}/>}/><Route path="*" element={<Auth mode="login" onAuth={setUser}/>}/></Routes>;return <Shell user={user} logout={()=>{clearToken();setUser(null)}}/>}
