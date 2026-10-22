import {createClient} from '@supabase/supabase-js';
const url=import.meta.env.VITE_SUPABASE_URL || 'https://zwwvlkokiwkyzyuzucxe.supabase.co';
const key=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const supabase=key?createClient(url,key):null;
export async function request<T>(path:string,body?:unknown):Promise<T>{
 if(!supabase)throw Error('Configure VITE_SUPABASE_PUBLISHABLE_KEY');
 const {data:{session}}=await supabase.auth.getSession();
 if(!session)throw Error('Sign in first');
 const response=await fetch('/api/mao'+path,{method:body===undefined?'GET':'POST',headers:{Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
 const raw=await response.text();
 let payload:unknown;
 try{payload=raw?JSON.parse(raw):null}catch{throw Error('Mao API returned invalid JSON (HTTP '+response.status+'). Check Vercel function logs and routing.');}
 if(!response.ok)throw Error((payload&&typeof payload==='object'&&'error' in payload?String(payload.error):'Mao API failed')+' (HTTP '+response.status+')');
 if(payload===null)throw Error('Mao API returned an empty response (HTTP '+response.status+').');
 return payload as T;
}
