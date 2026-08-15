/* Shared portal chrome + page utilities */
const isNewsPage=window.location.pathname.includes('/news/');
const root=isNewsPage?'../':'';
const currentPage=window.location.pathname.split('/').pop()||'index.html';

/* Keep the top contact bar identical on every public page. */
const topBar=document.querySelector('.top-bar');
const topBarMarkup=`<div class="container top-bar-content"><div class="top-contact"><span><i class="fa-solid fa-location-dot"></i> Nukus shahri</span><span><i class="fa-solid fa-envelope"></i> info@nukuspm.uz</span><span><i class="fa-solid fa-phone"></i> +998 (61) 224 90 23</span></div><div class="languages"><i class="fa-solid fa-globe"></i><button class="language active" type="button">UZ</button><button class="language" type="button">QAA</button><button class="language" type="button">EN</button></div></div>`;
if(topBar){topBar.innerHTML=topBarMarkup}else{const bar=document.createElement('div');bar.className='top-bar';bar.innerHTML=topBarMarkup;document.body.prepend(bar)}

/* Guarantee the official school logo exists in every header/footer logo. */
document.querySelectorAll('.logo').forEach(logo=>{
  let icon=logo.querySelector('.logo-icon');
  if(!icon){icon=document.createElement('div');icon.className='logo-icon';logo.prepend(icon)}
  let img=icon.querySelector('img');
  if(!img){img=document.createElement('img');icon.appendChild(img)}
  img.src=`${root}images/PSN LOGO.png`;img.alt='Nukus Prezident maktabi';
});

const navigation=document.getElementById('navigation');
const menuButton=document.getElementById('menuButton');
const primaryNav=[['index.html','Bosh sahifa'],['about.html','Maktab haqida'],['education.html',"Ta'lim"],['admission.html','Qabul'],['news/index.html','Yangiliklar'],['teachers.html','O‘qituvchilar']];
const moreNav=[['announcements.html',"E'lonlar"],['gallery.html','Galereya'],['alumni.html','Bitiruvchilar'],['calendar.html','Kalendar'],['statistics.html','Statistika'],['results.html','Natijalar'],['contact.html','Kontakt']];
const active=t=>t==='news/index.html'?isNewsPage:t===currentPage;
if(navigation){
  navigation.innerHTML=primaryNav.map(([t,l])=>`<a href="${root}${t}" class="nav-link${active(t)?' active':''}">${l}</a>`).join('')+`<div class="nav-more${moreNav.some(([t])=>active(t))?' active':''}"><button type="button" class="nav-more-button" aria-expanded="false">Ko‘proq</button><div class="nav-more-menu">${moreNav.map(([t,l])=>`<a href="${root}${t}" class="nav-more-link${active(t)?' active':''}">${l}</a>`).join('')}</div></div>`;
  const more=navigation.querySelector('.nav-more'),moreBtn=navigation.querySelector('.nav-more-button');
  moreBtn?.addEventListener('click',()=>{const open=more.classList.toggle('open');moreBtn.setAttribute('aria-expanded',String(open))});
}
if(menuButton&&navigation)menuButton.addEventListener('click',()=>{navigation.classList.toggle('show');navigation.classList.toggle('open');menuButton.textContent=navigation.classList.contains('show')?'✕':'☰'});
navigation?.querySelectorAll('.nav-link,.nav-more-link').forEach(link=>link.addEventListener('click',()=>{navigation.classList.remove('show','open');if(menuButton)menuButton.textContent='☰'}));

/* Animated counters. */
const startCounter=c=>{const target=Number(c.dataset.target);let current=0;const step=()=>{current+=Math.max(1,Math.floor(target/60));if(current>=target){c.textContent=target;return}c.textContent=current;requestAnimationFrame(step)};step()};
if('IntersectionObserver'in window){const observer=new IntersectionObserver((entries,obs)=>entries.forEach(e=>{if(e.isIntersecting){startCounter(e.target);obs.unobserve(e.target)}}),{threshold:.5});document.querySelectorAll('.counter').forEach(c=>observer.observe(c))}

/* Results form. */
const resultForm=document.getElementById('resultForm'),applicationId=document.getElementById('applicationId'),formMessage=document.getElementById('formMessage');
if(resultForm&&applicationId&&formMessage)resultForm.addEventListener('submit',e=>{e.preventDefault();const value=applicationId.value.trim();formMessage.textContent=value?`"${value}" raqamli natija backend ulangandan keyin ko‘rsatiladi.`:'Ariza yoki ruxsatnoma raqamini kiriting.'});

/* Google Sheet results. */
const sheetStatus=document.getElementById('sheetStatus'),sheetStatsGrid=document.getElementById('sheetStatsGrid'),sheetResultsBody=document.getElementById('sheetResultsBody');
const sheetConfig={id:'1H61o__fVhkTjwFBAh7cf3AMC9AFo5JEN1y_agPzveoI',gid:'540117896'};
const fallback=[{year:'2020-2021',name:"Babaniyazov Nizamatdin Miratdin o'g'li",ielts:'7.5',sat:'-'},{year:'2020-2021',name:'Bobojonova Firdavs Ravshanbek qizi',ielts:'7',sat:'-'},{year:'2022-2023',name:'Ktaybekova Zulfiya Laziz qizi',ielts:'8.5',sat:'-'}];
const csvLine=line=>{const out=[];let v='',q=false;for(let i=0;i<line.length;i++){const ch=line[i],n=line[i+1];if(ch==='"'&&q&&n==='"'){v+='"';i++}else if(ch==='"')q=!q;else if(ch===','&&!q){out.push(v.trim());v=''}else v+=ch}out.push(v.trim());return out};
const parseResults=csv=>{let year='';return csv.split(/\r?\n/).map(csvLine).filter(r=>r.some(Boolean)).reduce((out,r)=>{const ym=(r[0]||'').match(/20\d{2}\s*-\s*20\d{2}/);if(ym){year=ym[0].replace(/\s+/g,'');return out}if(!/^\d+$/.test(r[0]||'')||!r[1]||r[1]==='F.I.Sh')return out;out.push({year:year||'-',name:r[1],ielts:r[2]||'-',sat:r[3]||'-'});return out},[])};
const esc=v=>String(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
const renderResults=rows=>{if(!sheetResultsBody||!sheetStatsGrid)return;sheetResultsBody.innerHTML=rows.map(r=>`<tr><td>${esc(r.year)}</td><td>${esc(r.name)}</td><td>${esc(r.ielts)}</td><td>${esc(r.sat)}</td></tr>`).join('');const i=rows.map(r=>Number(String(r.ielts).replace(',','.'))).filter(n=>Number.isFinite(n)&&n>0),s=rows.map(r=>Number(r.sat)).filter(n=>Number.isFinite(n)&&n>0),years=new Set(rows.map(r=>r.year));const avg=i.length?(i.reduce((a,b)=>a+b,0)/i.length).toFixed(2):'-';sheetStatsGrid.innerHTML=[[rows.length,'Jami bitiruvchilar'],[avg,'O‘rtacha IELTS'],[i.length?Math.max(...i).toFixed(1):'-','Eng yuqori IELTS'],[s.length?Math.max(...s):'-','Eng yuqori SAT'],[years.size,'O‘quv yillari']].map(([v,l])=>`<article class="sheet-stat-card"><strong>${v}</strong><span>${l}</span></article>`).join('')};
if(sheetStatus&&sheetStatsGrid&&sheetResultsBody){fetch(`https://docs.google.com/spreadsheets/d/${sheetConfig.id}/gviz/tq?tqx=out:csv&gid=${sheetConfig.gid}`).then(r=>{if(!r.ok)throw Error();return r.text()}).then(csv=>{const rows=parseResults(csv);if(!rows.length)throw Error();renderResults(rows);sheetStatus.textContent=`${rows.length} ta natija Google Sheet’dan yuklandi.`}).catch(()=>{renderResults(fallback);sheetStatus.textContent='Google Sheet hozir yuklanmadi. Namuna ma’lumotlar ko‘rsatilmoqda.'})}
