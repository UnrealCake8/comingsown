import {useEffect,useState} from 'react';
import type {Session} from '@supabase/supabase-js';
import {supabase} from './lib/supabase';
import Auth from './components/Auth';
import App from './App';
export default function Entry(){
const [session,setSession]=useState<Session|null>(null);
const [loading,setLoading]=useState(true);
useEffect(()=>{if(!supabase){setLoading(false);return;}supabase.auth.getSession().then(({data})=>{setSession(data.session);setLoading(false)});const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,next)=>setSession(next));return()=>subscription.unsubscribe()},[]);
if(!supabase)return <div className="auth-screen"><div className="auth-card"><h1>Configure Mao</h1><p>Set VITE_SUPABASE_PUBLISHABLE_KEY.</p></div></div>;
if(loading)return <div className="auth-screen">Loading Mao…</div>;
return session?<App userId={session.user.id}/>:<Auth/>;
}
