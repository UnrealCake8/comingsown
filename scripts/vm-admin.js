// Run locally on the Mac: node scripts/vm-admin.js list|unassign USERNAME|assign USERNAME VM_NUMBER
// Stop Mao first, and back up data/state.json before changing assignments.
import {readFile,writeFile,rename,copyFile} from 'node:fs/promises';
const file=(process.env.DATA_DIR||'data')+'/state.json';
const [cmd,name,num]=process.argv.slice(2);
if(!['list','unassign','assign'].includes(cmd)){console.error('Usage: node scripts/vm-admin.js list|unassign USERNAME|assign USERNAME VM_NUMBER');process.exit(1)}
const db=JSON.parse(await readFile(file,'utf8'));
if(cmd==='list'){console.table(db.users.map(u=>({username:u.username,vm:u.vm??'none'})));process.exit(0)}
const u=db.users.find(u=>u.username===name?.toLowerCase());if(!u){console.error('User not found');process.exit(1)}
if(cmd==='unassign'){if(u.vm==null){console.log('Already unassigned');process.exit(0)}console.log('Releasing VM'+u.vm+' from '+u.username+' (VM files are NOT erased)');u.vm=null}
if(cmd==='assign'){const vm=Number(num),max=Number(process.env.VM_COUNT||19);if(!Number.isInteger(vm)||vm<1||vm>max){console.error('Invalid VM number');process.exit(1)}if(db.users.some(x=>x.id!==u.id&&x.vm===vm)){console.error('VM is already assigned');process.exit(1)}u.vm=vm;console.log('Assigned VM'+vm+' to '+u.username)}
await copyFile(file,file+'.backup-'+Date.now());const tmp=file+'.admin.tmp';await writeFile(tmp,JSON.stringify(db,null,2),{mode:0o600});await rename(tmp,file);console.log('Saved. Restart Mao. Note: direct VM access must be revoked separately before reuse.');
