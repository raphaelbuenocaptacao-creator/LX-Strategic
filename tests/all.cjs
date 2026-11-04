const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
(async () => {
 const browser = await chromium.launch({headless:true,args:['--no-sandbox']});
 let checks=0;
 async function check(label,fn){await fn();checks++;console.log('PASS',label)}
 for(const width of [1440,390]){
  const context=await browser.newContext({viewport:{width,height:860},acceptDownloads:true});
  const page=await context.newPage();const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('file://'+path.resolve('index.html'));
  await check(width+' dashboard',async()=>{await assert.equal(await page.locator('#dashboard.active').count(),1);assert.match(await page.locator('#sRooms').innerText(),/2/)});
  for(const view of ['mapa','salas','pessoas','planos','liderancas','dashboard']){
   await page.locator('#nav [data-view="'+view+'"]').click();
   await check(width+' navegação '+view,async()=>assert.equal(await page.locator('#'+view+'.active').count(),1));
  }
  await page.locator('[data-view="salas"]').click();
  await page.locator('[data-add="room"]').click();
  await page.locator('#editor [name="name"]').fill('SALA QA');
  await page.locator('#editor [name="capacity"]').fill('12');
  await page.locator('#editor button[type="submit"]').click();
  await check(width+' criar sala',async()=>assert.equal(await page.locator('#allRooms .room h3', {hasText:'SALA QA'}).count(),1));
  await page.locator('#allRooms .room', {hasText:'SALA QA'}).locator('[data-open-room]').click();
  await check(width+' espaço individual da sala',async()=>assert.equal(await page.locator('#workspace.active').count(),1));
  await page.locator('#workspacePerson').click();
  await page.locator('#editor [name="name"]').fill('Teste Silva');
  await page.locator('#editor [name="role"]').selectOption('Líder');
  await page.locator('#editor [name="start"]').fill('08:00');
  await page.locator('#editor [name="end"]').fill('17:00');
  await page.locator('#editor button[type="submit"]').click();
  await check(width+' pessoa vinculada à sala',async()=>{assert.match(await page.locator('#workspacePeople').innerText(),/Teste Silva/);assert.match(await page.locator('#workspacePeople').innerText(),/08:00/)});
  await page.locator('#workspaceNote').click();
  await page.locator('#editor [name="name"]').fill('Nota operacional QA');
  await page.locator('#editor [name="body"]').fill('Alinhamento de equipe');
  await page.locator('#editor button[type="submit"]').click();
  await check(width+' anotação isolada',async()=>assert.match(await page.locator('#workspaceNotes').innerText(),/Alinhamento de equipe/));
  await page.locator('#workspacePlan').click();
  await page.locator('#editor [name="name"]').fill('Meta QA');
  await page.locator('#editor button[type="submit"]').click();
  await check(width+' meta na sala',async()=>assert.match(await page.locator('#workspacePlans').innerText(),/Meta QA/));
  await page.locator('#nav [data-view="liderancas"]').click();
  await page.locator('[data-add="feedback"]').click();
  await page.locator('#editor [name="name"]').fill('Comunicação das folgas');
  await page.locator('#editor [name="leader"]').fill('Felipe QA');
  await page.locator('#editor [name="category"]').selectOption('Organização de folgas');
  await page.locator('#editor [name="facts"]').fill('Não informou a escala');
  await page.locator('#editor [name="action"]').fill('Confirmar escala semanal');
  await page.locator('#editor button[type="submit"]').click();
  await check(width+' feedback salvo',async()=>assert.match(await page.locator('#feedbackList').innerText(),/Felipe QA/));
  await page.locator('#feedbackList [data-edit-feedback]').click();
  await page.locator('#editor [name="status"]').selectOption('Resolvido');
  await page.locator('#editor [name="result"]').fill('Informou a escala');
  await page.locator('#editor button[type="submit"]').click();
  await check(width+' atualizar feedback',async()=>assert.match(await page.locator('#feedbackList').innerText(),/Informou a escala/));
  await check(width+' status resolvido',async()=>assert.equal(await page.locator('#feedbackDone').innerText(),'1'));
  await page.reload();
  await page.locator('#nav [data-view="liderancas"]').click();
  await check(width+' persistência local',async()=>assert.match(await page.locator('#feedbackList').innerText(),/Felipe QA/));
  const downloadPromise=page.waitForEvent('download');await page.locator('#exportBtn').click();const download=await downloadPromise;
  await check(width+' exportar JSON',async()=>assert.match(download.suggestedFilename(),/LX-Strategic-backup/));
  page.once('dialog',d=>d.accept());
  await page.locator('#feedbackList [data-delete-feedback]').click();
  await check(width+' excluir feedback',async()=>assert.equal(await page.locator('#feedbackTotal').innerText(),'0'));
  await check(width+' sem erros JS',async()=>assert.deepEqual(errors,[]));
  await context.close();
 }
 await browser.close();console.log('PASSED CHECKS:',checks);
})().catch(e=>{console.error(e);process.exitCode=1});