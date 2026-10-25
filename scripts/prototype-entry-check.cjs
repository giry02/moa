'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'C:/Users/Giry/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright-core');
const workspace=path.resolve(__dirname,'..'),artifact=path.join(workspace,'artifacts');
const userAgents={
 iphone:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
 android:'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36',
 desktop:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'
};
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml'};
const checks=[],results=[],errors=[],badRequests=[];
function staticServer(){return http.createServer((req,res)=>{
 try{
  let pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(pathname==='/moa')pathname='/moa/';if(pathname.startsWith('/moa/'))pathname=pathname.slice(4);
  let file=path.resolve(workspace,'.'+pathname);if(file!==workspace&&!file.startsWith(workspace+path.sep)){res.writeHead(403);res.end();return;}
  if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');
  if(!fs.existsSync(file)){res.writeHead(404);res.end();return;}
  res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});fs.createReadStream(file).pipe(res);
 }catch(e){res.writeHead(500);res.end(String(e));}
});}
async function runCase(browser,base,test){
 const context=await browser.newContext({viewport:{width:test.width||390,height:844},userAgent:userAgents[test.ua||'desktop'],isMobile:test.ua==='iphone'||test.ua==='android',hasTouch:test.ua==='iphone'||test.ua==='android',locale:'ko-KR'}),p=await context.newPage();
 p.on('pageerror',e=>errors.push({case:test.name,message:e.message}));p.on('response',r=>{if(r.status()>=400&&!r.url().includes('favicon'))badRequests.push({case:test.name,status:r.status(),url:r.url()});});p.on('requestfailed',r=>{if(r.failure()?.errorText!=='net::ERR_ABORTED')badRequests.push({case:test.name,url:r.url(),failure:r.failure()});});
 await p.goto(base+test.path);await p.waitForFunction(()=>!!window.Moyobom);const url=new URL(p.url());assert.equal(url.pathname,test.expected,'redirect '+test.name);
 const layout=await p.evaluate(()=>({mobile:document.body.classList.contains('force-mobile'),web:document.body.classList.contains('force-web'),width:document.querySelector('.app-shell').getBoundingClientRect().width,sidebar:getComputedStyle(document.querySelector('.sidebar')).display,base:document.baseURI}));
 if(test.mode==='mobile'){assert.ok(layout.mobile,test.name+' force-mobile');assert.ok(layout.width<=430.5,test.name+' mobile shell');}
 else {assert.ok(layout.web,test.name+' force-web');assert.notEqual(layout.sidebar,'none');assert.ok(layout.width>=1120,test.name+' desktop min width');}
 if(test.cache){const assets=await p.locator('script[src],link[rel="stylesheet"]').evaluateAll(es=>es.map(e=>e.src||e.href));assert.ok(assets.length>=11);assert.ok(assets.every(url=>new URL(url).pathname.startsWith('/prototype/')&&/^\?v=[a-f0-9]{12}$/.test(new URL(url).search)));}
 if(test.screenshot){await p.waitForFunction(()=>[...document.querySelectorAll('img')].every(x=>x.complete&&x.naturalWidth),null,{timeout:30000});await p.screenshot({path:path.join(artifact,test.screenshot)});}
 if(test.navigate){
  await p.locator((test.mode==='mobile'?'#mobile-nav':'#side-nav')+' [data-page="chats"]').click();await p.locator('[data-room="group:walk"]').first().click();assert.equal(await p.locator('.message').count(),511);assert.equal(await p.evaluate(()=>window.Moyobom.state.page),'chat');
  await p.waitForFunction(()=>[...document.querySelectorAll('.message img')].every(x=>x.complete&&x.naturalWidth),null,{timeout:30000});
  const missing=await p.locator('.message img').evaluateAll(images=>images.filter(x=>!x.complete||!x.naturalWidth).map(x=>x.src));assert.deepEqual(missing,[]);
  await p.locator('.chat-header [data-action="group-home"]').click();
  if(test.mode==='mobile')await p.locator('.group-context-header [data-page="mygroups"]').click();else await p.locator('#side-nav .group-side-back').click();
  const switcher=p.locator('#view-switch'),target=new URL(await switcher.getAttribute('href'),await p.evaluate(()=>document.baseURI));assert.equal(target.pathname,test.switchExpected,'switch path '+test.name);await switcher.click();await p.waitForFunction(()=>!!window.Moyobom);assert.equal(new URL(p.url()).pathname,test.switchExpected);
 }
 results.push({name:test.name,finalPath:url.pathname,...layout});process.stdout.write('PASS '+test.name+'\n');await context.close();
}
(async()=>{let server,browser;try{
 const publicBase=process.env.PROTOTYPE_ENTRY_BASE;
 let base=publicBase;if(!base){server=staticServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));base='http://127.0.0.1:'+server.address().port;}
 browser=await chromium.launch({headless:true});
 const prefix=process.env.PROTOTYPE_ENTRY_PREFIX||'';
 const cacheOnly=process.env.PROTOTYPE_ENTRY_SCOPE==='cache';
 const cases=cacheOnly?[
  {name:'Generated root HTML fingerprint assets',ua:'iphone',path:'/mobile.html',expected:'/mobile.html',mode:'mobile',cache:true}
 ]:publicBase?[
  {name:'Live iPhone auto + chat + root switch',ua:'iphone',path:prefix+'/',expected:prefix+'/mobile.html',mode:'mobile',navigate:true,switchExpected:prefix+'/web.html',screenshot:'prototype-pages-live-mobile.png'},
  {name:'Live desktop auto + root switch',width:1440,path:prefix+'/',expected:prefix+'/web.html',mode:'web',navigate:true,switchExpected:prefix+'/mobile.html',screenshot:'prototype-pages-live-web.png'},
  {name:'Live direct mobile',width:1440,path:prefix+'/mobile.html',expected:prefix+'/mobile.html',mode:'mobile'},
  {name:'Live direct web',width:1440,path:prefix+'/web.html',expected:prefix+'/web.html',mode:'web'}
 ]:[
  {name:'iPhone root auto',ua:'iphone',path:prefix+'/',expected:prefix+'/mobile.html',mode:'mobile',navigate:true,switchExpected:prefix+'/web.html'},
  {name:'Android root auto',ua:'android',path:prefix+'/',expected:prefix+'/mobile.html',mode:'mobile'},
  {name:'Desktop root auto',width:1440,path:prefix+'/',expected:prefix+'/web.html',mode:'web',navigate:true,switchExpected:prefix+'/mobile.html'},
  {name:'Narrow PC remains web',path:prefix+'/',expected:prefix+'/web.html',mode:'web'},
  {name:'Explicit web on iPhone',ua:'iphone',path:prefix+'/web.html',expected:prefix+'/web.html',mode:'web'},
  {name:'Explicit mobile on desktop',width:1440,path:prefix+'/mobile.html',expected:prefix+'/mobile.html',mode:'mobile'},
  {name:'Mobile entry explicit web query',ua:'iphone',path:prefix+'/mobile.html?view=web',expected:prefix+'/mobile.html',mode:'web'},
  {name:'Web entry explicit mobile query',width:1440,path:prefix+'/web.html?view=mobile',expected:prefix+'/web.html',mode:'mobile'},
  {name:'Prototype iPhone auto',ua:'iphone',path:prefix+'/prototype/',expected:prefix+'/prototype/mobile.html',mode:'mobile'},
  {name:'Prototype desktop auto',width:1440,path:prefix+'/prototype/',expected:prefix+'/prototype/web.html',mode:'web'}
 ];
 if(!publicBase&&!cacheOnly){cases.push(
  {name:'Project subpath iPhone',ua:'iphone',path:'/moa/',expected:'/moa/mobile.html',mode:'mobile',navigate:true,switchExpected:'/moa/web.html'},
  {name:'Project subpath desktop',width:1440,path:'/moa/',expected:'/moa/web.html',mode:'web',navigate:true,switchExpected:'/moa/mobile.html'}
 );}
 for(const test of cases)await runCase(browser,base,test);
 assert.deepEqual(errors,[]);assert.deepEqual(badRequests,[]);checks.push('UA auto routing, explicit modes, 511-message navigation, avatar assets, project-relative mode switch, no HTTP asset errors');
 fs.writeFileSync(path.join(artifact,cacheOnly?'prototype-entry-cache-qa.json':publicBase?'prototype-entry-public-qa.json':'prototype-entry-local-qa.json'),JSON.stringify({ok:true,base,prefix,results,checks,errors,badRequests},null,2));
 }finally{if(browser)await browser.close();if(server)await new Promise(r=>server.close(r));}})().catch(e=>{process.stderr.write(e.stack+'\n');process.exitCode=1;});
