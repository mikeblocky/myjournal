import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { Link, useNavigate } from "react-router-dom";

export default function Signup(){
  const { signup, loading } = useAuth();
  const nav = useNavigate();
  const [email,setEmail]=useState(""); const [password,setPassword]=useState(""); const [name,setName]=useState("");
  const [err,setErr]=useState("");

  async function onSubmit(e){ e.preventDefault(); setErr("");
    try{ await signup(email,password,name); nav("/digest"); } catch(e){ setErr(e.message); } }

  return (
    <div className="panel main fade-in" style={{padding:24}}>
      <h2 className="ui-mono" style={{marginTop:0}}>Sign up</h2>
      {err && <p style={{color:"crimson"}}>{err}</p>}
      <form onSubmit={onSubmit} style={{maxWidth:420, display:"grid", gap:12}}>
        <label>Name</label><input value={name} onChange={e=>setName(e.target.value)} />
        <label>Email</label><input value={email} onChange={e=>setEmail(e.target.value)} />
        <label>Password</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} />
        <button className="btn primary" disabled={loading}>{loading?"…":"Create account"}</button>
      </form>
      <p className="prose" style={{marginTop:12}}>Have an account? <Link to="/login">Log in</Link></p>
    </div>
  );
}
