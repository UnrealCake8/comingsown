import {createClient} from '@supabase/supabase-js';
const url=import.meta.env.VITE_SUPABASE_URL || 'https://zwwvlkokiwkyzyuzucxe.supabase.co';
const key=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const supabase=key?createClient(url,key):null;
export async function request<T>(path:string,body?:unknown):Promise<T>{if(!supabase)throw Error('Configure VITE_SUPABASE_PUBLISHABLE_KEY');const {data:{session}}=await supabase.auth.getSession();if(!session)throw Error('Sign in first');const r=await fetch('/api/mao'+path,{method:body===undefined?'GET':'POST',headers:{Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});const json=await r.json();if(!r.ok)throw Error(json.error||'Request failed');return json as T}
