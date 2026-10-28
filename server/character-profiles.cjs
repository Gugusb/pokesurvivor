"use strict";
const {createHash}=require('node:crypto');
const ACTOR='system:anime-demo-v1',ACTION='seed-demo-rankings:anime-v1';
const rows=[
 ['ash','小智','#f3ca52',[25,6,658],['与伙伴一起，向下一场挑战出发。','Every new challenge is another adventure with my partners.','Cada reto es otra aventura con mis compañeros.'],['热血与羁绊','Courage and friendship','Valor y amistad']],
 ['may','小遥','#f19a78',[257,267,471],['让每一次成长，都闪耀出属于搭档的光芒。','Let every step forward reveal my partners’ brilliance.','Que cada paso muestre el brillo de mis compañeros.'],['闪耀的旅途','A brilliant journey','Un viaje brillante']],
 ['dawn','小光','#82ccea',[393,427,473],['用默契和自信，把旅途变成自己的舞台。','With trust and confidence, the journey becomes our stage.','Con confianza y complicidad, el viaje es nuestro escenario.'],['自信登场','Ready to shine','Lista para brillar']],
 ['serena','瑟蕾娜','#e9a0c7',[655,700,674],['带着梦想前进，也记住一路相伴的笑容。','Follow the dream and cherish every shared smile.','Sigue tu sueño y guarda cada sonrisa compartida.'],['梦想的步伐','Steps toward a dream','Pasos hacia un sueño']],
 ['liko','莉可','#8ed5ab',[906,856],['在相遇中寻找答案，和伙伴一起认识更大的世界。','Find answers in new encounters and discover the world together.','Encuentra respuestas y descubre el mundo junto a tus compañeros.'],['相遇的意义','The wonder of meeting','La magia de encontrarse']],
 ['roy','罗伊','#efaa67',[909,940],['把好奇心装进行囊，让冒险的旋律一直延续。','Pack your curiosity and keep the adventure singing.','Lleva tu curiosidad y deja que la aventura siga sonando.'],['冒险的旋律','The song of adventure','La canción de la aventura']],
];
function identity(key){const h=createHash('sha256').update('pokesurvivor/clearly-marked-anime-demo/v1/'+key).digest('hex');return h.slice(0,8)+'-'+h.slice(8,12)+'-5'+h.slice(13,16)+'-a'+h.slice(17,20)+'-'+h.slice(20,32);}
const localized=a=>({zh:a[0],en:a[1],es:a[2]});
const catalog=new Map(rows.map(([key,name,color,team,bio,title])=>[identity(key),{key,name,color,team,bio:localized(bio),title:localized(title),preset:true}]));
function characterFor(db,uid){
 const character=catalog.get(uid);if(!character)return null;
 // The client cannot turn a real player into a preset profile through a save.
 return db.prepare('SELECT 1 FROM audit WHERE actor=? AND target=? AND action=? LIMIT 1').get(ACTOR,uid,ACTION)?character:null;
}
module.exports={characterFor,identity};
