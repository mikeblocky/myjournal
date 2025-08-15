import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { Link, useNavigate } from "react-router-dom";

export default function Signup(){
  const { signup, loading } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [err, setErr] = useState("");
  const [validationErrors, setValidationErrors] = useState({});
  const [showAnnouncement, setShowAnnouncement] = useState(true);

  function validateForm() {
    const errors = {};
    
    if (!email.trim()) {
      errors.email = "Email is required";
    } else if (!email.includes('@')) {
      errors.email = "Please enter a valid email address";
    }
    
    if (!password) {
      errors.password = "Password is required";
    } else if (password.length < 8) {
      errors.password = "Password must be at least 8 characters long";
    }
    
    if (!name.trim()) {
      errors.name = "Name is required";
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setValidationErrors({});
    
    if (!validateForm()) {
      return;
    }
    
    try {
      await signup(email, password, name);
      nav("/digest");
    } catch (e) {
      // Handle different error types
      if (e.message.includes("JWT_SECRET") || e.message.includes("Server configuration")) {
        setErr("Server configuration error. Please try again later or contact support.");
      } else if (e.message.includes("Email already registered")) {
        setErr("An account with this email already exists. Please log in instead.");
      } else {
        setErr(e.message);
      }
    }
  }

  return (
    <div className="panel main fade-in" style={{padding:24}}>
      {/* Announcement Banner */}
      {showAnnouncement && (
        <div 
          className="announcement-banner"
          style={{
            background: "#f0f9ff",
            color: "#0369a1",
            padding: "12px 16px",
            borderRadius: "6px",
            marginBottom: "20px",
            textAlign: "center",
            border: "1px solid #bae6fd",
            position: "relative"
          }}
        >
          <button
            onClick={() => setShowAnnouncement(false)}
            aria-label="Dismiss announcement"
            style={{
              position: "absolute",
              top: "8px",
              right: "8px",
              background: "transparent",
              border: "none",
              color: "#0369a1",
              cursor: "pointer",
              fontSize: "16px",
              padding: "0",
              width: "20px",
              height: "20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            ×
          </button>
          <span style={{fontSize: "14px"}}>
            ✅ Signup errors have been fixed - everything should work smoothly now!
          </span>
        </div>
      )}

      <h2 className="ui-mono" style={{marginTop:0}}>Sign up</h2>
      {err && <p style={{color:"crimson"}}>{err}</p>}
      <form onSubmit={onSubmit} style={{maxWidth:420, display:"grid", gap:12}}>
        <div>
          <label>Name</label>
          <input 
            value={name} 
            onChange={e=>setName(e.target.value)} 
            className={validationErrors.name ? "error" : ""}
          />
          {validationErrors.name && <span style={{color:"crimson", fontSize:"0.9em"}}>{validationErrors.name}</span>}
        </div>
        
        <div>
          <label>Email</label>
          <input 
            value={email} 
            onChange={e=>setEmail(e.target.value)} 
            className={validationErrors.email ? "error" : ""}
          />
          {validationErrors.email && <span style={{color:"crimson", fontSize:"0.9em"}}>{validationErrors.email}</span>}
        </div>
        
        <div>
          <label>Password</label>
          <input 
            type="password" 
            value={password} 
            onChange={e=>setPassword(e.target.value)} 
            className={validationErrors.password ? "error" : ""}
          />
          {validationErrors.password && <span style={{color:"crimson", fontSize:"0.9em"}}>{validationErrors.password}</span>}
        </div>
        
        <button className="btn primary" disabled={loading}>
          {loading ? "Creating account..." : "Create account"}
        </button>
      </form>
      <p className="prose" style={{marginTop:12}}>Have an account? <Link to="/login">Log in</Link></p>
    </div>
  );
}
