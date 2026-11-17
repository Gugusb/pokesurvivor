/* Real mouse or simulated touch-pointer gestures against the local drag component. */
async function dragSquad(page,from,to,touch=false){
 const source=touch?from.locator('.squad-drag-handle'):from;
 await source.scrollIntoViewIfNeeded();await to.scrollIntoViewIfNeeded();
 const a=await source.boundingBox(),b=await to.boundingBox();if(!a||!b)throw new Error('Drag target is not visible');
 const sx=a.x+a.width/2,sy=a.y+a.height/2,tx=b.x+b.width/2,ty=b.y+b.height/2;
 if(touch){
  await source.dispatchEvent('pointerdown',{pointerId:77,pointerType:'touch',button:0,buttons:1,isPrimary:true,clientX:sx,clientY:sy});
  for(let i=1;i<=12;i++)await page.locator('body').dispatchEvent('pointermove',{pointerId:77,pointerType:'touch',buttons:1,isPrimary:true,clientX:sx+(tx-sx)*i/12,clientY:sy+(ty-sy)*i/12});
  await page.locator('body').dispatchEvent('pointerup',{pointerId:77,pointerType:'touch',button:0,buttons:0,isPrimary:true,clientX:tx,clientY:ty});
 }else{await page.mouse.move(sx,sy);await page.mouse.down();await page.mouse.move(tx,ty,{steps:14});await page.mouse.up();}
 await page.waitForTimeout(280);
}
module.exports={dragSquad};
