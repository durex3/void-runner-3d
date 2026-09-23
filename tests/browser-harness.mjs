import {spawn} from 'node:child_process';
import {createConnection} from 'node:net';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

const ROOT=fileURLToPath(new URL('..',import.meta.url));
const VITE_BIN=fileURLToPath(new URL('../node_modules/vite/bin/vite.js',import.meta.url));
const HOST=process.env.TEST_HOST||'127.0.0.1';
const PORT=Number(process.env.TEST_PORT||5188);
export const BASE_URL=`http://${HOST}:${PORT}`;
const DEFAULT_ARGS=['--use-angle=swiftshader','--enable-unsafe-swiftshader','--enable-webgl'];
let ownedServer=null;
let serverReady=null;

export function testUrl(path='/'){
  return new URL(path,BASE_URL).toString();
}

function portOpen(){return new Promise(resolve=>{const socket=createConnection({host:HOST,port:PORT});socket.once('connect',()=>{socket.destroy();resolve(true)});socket.once('error',()=>resolve(false))})}

async function waitForServer(timeout=15000){
  const deadline=Date.now()+timeout;
  while(Date.now()<deadline){
    try{const response=await fetch(`${BASE_URL}/`);if(response.ok)return}
    catch{}
    await new Promise(resolve=>setTimeout(resolve,100));
  }
  throw new Error(`Vite did not become ready at ${BASE_URL} within ${timeout}ms`);
}

export async function ensureDevServer(){
  if(serverReady)return serverReady;
  serverReady=(async()=>{
    if(!await portOpen()){
      ownedServer=spawn(process.execPath,[VITE_BIN,'--host',HOST,'--port',String(PORT),'--strictPort'],{cwd:ROOT,stdio:['ignore','ignore','pipe']});
      const stderr=[];
      ownedServer.stderr.on('data',chunk=>stderr.push(String(chunk)));
      ownedServer.unref();
      ownedServer.stderr.unref?.();
      const startupFailure=new Promise((_,reject)=>{
        ownedServer.once('error',reject);
        ownedServer.once('exit',(code,signal)=>{
          if(code!==0)reject(new Error(`Vite exited before becoming ready (${code??signal}): ${stderr.join('').trim()}`));
        });
      });
      await Promise.race([waitForServer(),startupFailure]);
      return BASE_URL;
    }
    await waitForServer();
    return BASE_URL;
  })();
  return serverReady;
}

export async function launchBrowser(options={}){
  await ensureDevServer();
  const {channel:_ignoredChannel,args=[],...rest}=options;
  if(process.env.TEST_HEADLESS!==undefined)rest.headless=process.env.TEST_HEADLESS!=='false';
  return chromium.launch({channel:process.env.TEST_BROWSER_CHANNEL||'chrome',...rest,args:[...new Set([...DEFAULT_ARGS,...args])]});
}

function cleanup(){if(ownedServer&&!ownedServer.killed)ownedServer.kill('SIGTERM')}
process.once('exit',cleanup);
process.once('SIGINT',()=>{cleanup();process.exit(130)});
process.once('SIGTERM',()=>{cleanup();process.exit(143)});
