import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import handler from './api/mao/[...path].js';

const root=path.join(path.dirname(fileURLToPath(import.meta.url)),'dist');
const port=Number(process.env.PORT||4000);
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.ico':'image/x-icon','.json':'application/json','.woff2':'font/woff2'};
const server=http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url||'/', 'http://localhost');
  if(url.pathname.startsWith('/api/mao/')){
   let body='';
   for await(const chunk of req){body+=chunk;if(body.length>1_000_000){res.writeHead(413);res.end('Payload too large');return;}}
   try{req.body=body?JSON.parse(body):{};}catch{res.writeHead(400,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'Invalid JSON body'}));return;}
   res.status=(code)=>{res.statusCode=code;return res;};
   res.json=(data)=>{res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify(data));return res;};
   await handler(req,res);return;
  }
  if(url.pathname.startsWith('/api/')){res.writeHead(404,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'Unknown API endpoint'}));return;}
  const requested=path.resolve(root,'.'+decodeURIComponent(url.pathname));
  if(requested!==root&&!requested.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
  let file=requested;
  try{if(!(await stat(file)).isFile())file=path.join(root,'index.html');}catch{file=path.join(root,'index.html');}
  const data=await readFile(file);
  res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','X-Content-Type-Options':'nosniff'});res.end(data);
 }catch(error){console.error('Mao server',error);if(!res.headersSent)res.writeHead(500,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'Internal server error'}));}
});
server.listen(port,'127.0.0.1',()=>console.log('Mao listening at http://127.0.0.1:'+port));
