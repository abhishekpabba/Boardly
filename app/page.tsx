'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus, Share2, Timer, Eye, EyeOff, ThumbsUp, Trash2, Download, Sparkles, Users, MoreHorizontal, Copy, RotateCcw } from 'lucide-react';

type Card = { id: string; text: string; votes: number; author: string };
type Column = { id: string; title: string; emoji: string; cards: Card[] };
type Board = { id: string; name: string; columns: Column[]; revealed: boolean; createdAt: number };
type Template = { name: string; columns: string[][] };

const templates: Template[] = [
  { name: 'Classic Retro', columns: [['Went well','✨'],['Could improve','🛠️'],['Action items','🎯']] },
  { name: 'Start / Stop / Continue', columns: [['Start','🚀'],['Stop','🛑'],['Continue','✅']] },
  { name: 'Mad / Sad / Glad', columns: [['Mad','😤'],['Sad','😔'],['Glad','😊']] },
  { name: '4Ls', columns: [['Liked','❤️'],['Learned','📚'],['Lacked','🧩'],['Longed for','🌱']] },
  { name: 'Sailboat', columns: [['Wind','💨'],['Anchors','⚓'],['Rocks','🪨'],['Island','🏝️']] },
  { name: 'Starfish', columns: [['Start doing','🌱'],['More of','➕'],['Keep doing','✅'],['Less of','➖'],['Stop doing','🛑']] },
];

const uid = () => Math.random().toString(36).slice(2, 9);
const makeBoard = (name = 'Sprint Retrospective', template = templates[0]): Board => ({
  id: uid(), name, revealed: true, createdAt: Date.now(),
  columns: template.columns.map(([title, emoji]) => ({ id: uid(), title, emoji, cards: [] })),
});

export default function Home() {
  const [board, setBoard] = useState<Board | null>(null);
  const [name, setName] = useState('Anonymous');
  const [drafts, setDrafts] = useState<Record<string,string>>({});
  const [showTemplates, setShowTemplates] = useState(false);
  const [toast, setToast] = useState('');
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    let initial: Board | null = null;
    const hash = window.location.hash.startsWith('#b=') ? window.location.hash.slice(3) : '';
    if (hash) {
      try { initial = JSON.parse(decodeURIComponent(atob(hash))); } catch {}
    }
    if (!initial) {
      const saved = localStorage.getItem('boardly-board');
      if (saved) { try { initial = JSON.parse(saved); } catch {} }
    }
    setBoard(initial || makeBoard());
    setName(localStorage.getItem('boardly-name') || 'Anonymous');
  }, []);

  useEffect(() => {
    if (!board) return;
    localStorage.setItem('boardly-board', JSON.stringify(board));
    const encoded = btoa(encodeURIComponent(JSON.stringify(board)));
    history.replaceState(null, '', `${location.pathname}#b=${encoded}`);
    const bc = new BroadcastChannel('boardly');
    bc.postMessage(board);
    return () => bc.close();
  }, [board]);

  useEffect(() => {
    const bc = new BroadcastChannel('boardly');
    bc.onmessage = e => setBoard(e.data);
    return () => bc.close();
  }, []);

  useEffect(() => { localStorage.setItem('boardly-name', name); }, [name]);
  useEffect(() => {
    if (!seconds) return;
    const id = setInterval(() => setSeconds(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [seconds]);

  const totalVotes = useMemo(() => board?.columns.reduce((n,c)=>n+c.cards.reduce((m,x)=>m+x.votes,0),0) ?? 0, [board]);
  if (!board) return <div className="loading">Loading Boardly…</div>;

  const flash = (msg:string) => { setToast(msg); setTimeout(()=>setToast(''),1800); };
  const addCard = (columnId:string) => {
    const text=(drafts[columnId]||'').trim(); if(!text) return;
    setBoard(b=>b && ({...b,columns:b.columns.map(c=>c.id===columnId?{...c,cards:[...c.cards,{id:uid(),text,votes:0,author:name||'Anonymous'}]}:c)}));
    setDrafts(d=>({...d,[columnId]:''}));
  };
  const vote = (columnId:string, cardId:string) => setBoard(b=>b && ({...b,columns:b.columns.map(c=>c.id===columnId?{...c,cards:c.cards.map(x=>x.id===cardId?{...x,votes:x.votes+1}:x)}:c)}));
  const removeCard = (columnId:string, cardId:string) => setBoard(b=>b && ({...b,columns:b.columns.map(c=>c.id===columnId?{...c,cards:c.cards.filter(x=>x.id!==cardId)}:c)}));
  const applyTemplate = (t:Template) => { setBoard(makeBoard(board.name,t)); setShowTemplates(false); };
  const resetBoard = () => { if(confirm('Clear all cards on this board?')) setBoard(b=>b && ({...b,columns:b.columns.map(c=>({...c,cards:[]}))})); };
  const share = async () => { try { await navigator.clipboard.writeText(location.href); flash('Board link copied'); } catch { flash('Copy the URL from your browser'); } };
  const exportBoard = () => {
    const text = [`# ${board.name}`, ...board.columns.flatMap(c=>[`\n## ${c.emoji} ${c.title}`,...c.cards.map(x=>`- ${x.text} (${x.votes} votes)`)] )].join('\n');
    const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([text],{type:'text/markdown'})); a.download=`${board.name.toLowerCase().replace(/\W+/g,'-')}.md`; a.click();
  };

  return <div className="app-shell">
    {toast && <div className="toast">{toast}</div>}
    <header className="topbar">
      <div className="brand"><div className="brand-mark">B</div><span>Boardly</span><span className="pill">no login</span></div>
      <div className="top-actions">
        <button className="ghost" onClick={()=>setSeconds(300)}><Timer size={17}/>{seconds?`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`:'5 min'}</button>
        <button className="ghost" onClick={()=>setBoard(b=>b && ({...b,revealed:!b.revealed}))}>{board.revealed?<EyeOff size={17}/>:<Eye size={17}/>} {board.revealed?'Hide':'Reveal'}</button>
        <button className="primary" onClick={share}><Share2 size={17}/> Share board</button>
      </div>
    </header>

    <main>
      <section className="board-head">
        <div>
          <input className="board-title" value={board.name} onChange={e=>setBoard({...board,name:e.target.value})}/>
          <div className="meta"><Users size={15}/> Anonymous team board <span>•</span> {board.columns.reduce((n,c)=>n+c.cards.length,0)} cards <span>•</span> {totalVotes} votes</div>
        </div>
        <div className="board-tools">
          <button className="ghost compact" onClick={()=>setShowTemplates(!showTemplates)}><Sparkles size={16}/> Templates</button>
          <button className="icon-btn" onClick={exportBoard} title="Export markdown"><Download size={18}/></button>
          <button className="icon-btn" onClick={resetBoard} title="Reset board"><RotateCcw size={18}/></button>
          <button className="icon-btn"><MoreHorizontal size={18}/></button>
        </div>
      </section>

      {showTemplates && <div className="template-strip">{templates.map(t=><button key={t.name} onClick={()=>applyTemplate(t)}><strong>{t.name}</strong><span>{t.columns.map(x=>x[1]).join(' ')}</span></button>)}</div>}

      <section className="identity-bar">
        <span>Your display name</span><input value={name} onChange={e=>setName(e.target.value)} placeholder="Anonymous"/>
        <div className="privacy"><span className="dot"/> Nothing to sign in to. Your name stays in this browser.</div>
      </section>

      <section className="columns" style={{gridTemplateColumns:`repeat(${Math.min(board.columns.length,5)}, minmax(260px,1fr))`}}>
        {board.columns.map(col=><div className="column" key={col.id}>
          <div className="column-head"><div><span className="emoji">{col.emoji}</span><strong>{col.title}</strong></div><span>{col.cards.length}</span></div>
          <div className="composer"><textarea value={drafts[col.id]||''} onChange={e=>setDrafts({...drafts,[col.id]:e.target.value})} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();addCard(col.id)}}} placeholder={`Add a thought to “${col.title}”...`}/><button onClick={()=>addCard(col.id)}><Plus size={16}/> Add card</button></div>
          <div className="cards">
            {!board.revealed && col.cards.length>0 ? <div className="hidden-stack"><EyeOff size={20}/><strong>{col.cards.length} hidden {col.cards.length===1?'card':'cards'}</strong><span>Reveal when everyone is ready.</span></div> : col.cards.map(card=><article className="card" key={card.id}><p>{card.text}</p><div className="card-foot"><span>{card.author}</span><div><button onClick={()=>vote(col.id,card.id)} className="vote"><ThumbsUp size={14}/>{card.votes||''}</button><button onClick={()=>removeCard(col.id,card.id)} className="trash"><Trash2 size={14}/></button></div></div></article>)}
            {board.revealed && col.cards.length===0 && <div className="empty">No cards yet</div>}
          </div>
        </div>)}
      </section>

      <section className="bottom-callout"><div className="callout-icon"><Sparkles size={20}/></div><div><strong>Retro flow built in</strong><span>Write privately → reveal together → vote → discuss → turn decisions into actions.</span></div><button onClick={share}><Copy size={16}/> Copy board link</button></section>
    </main>
    <footer>Boardly • Fast team boards without accounts</footer>
  </div>;
}
