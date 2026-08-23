import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, Archive, BookOpen, Brain, Check, CheckCircle2, ChevronDown,
  ChevronRight, CircleHelp, ExternalLink, Headphones, History, Languages,
  Lightbulb, ListChecks, LoaderCircle, MapPin, NotebookPen, RotateCcw,
  Target, TriangleAlert, Trophy,
} from 'lucide-react';

const sections = [
  ['notes', 'Konu', BookOpen], ['words', 'Kelimeler', Languages],
  ['practice', 'Alıştırma', NotebookPen], ['reading', 'Okuma', Brain],
  ['listening', 'Dinleme', Headphones], ['test', 'Test', ListChecks],
];

const storageKey = (hw) => `sefa-homework:${hw.id}`;

function useProgress(hw) {
  const [progress, setProgress] = useState({ done: {}, examples: {}, answers: {} });
  useEffect(() => {
    if (!hw) return;
    try { setProgress(JSON.parse(localStorage.getItem(storageKey(hw))) || { done: {}, examples: {}, answers: {} }); }
    catch { setProgress({ done: {}, examples: {}, answers: {} }); }
  }, [hw]);
  const update = (fn) => setProgress((current) => {
    const next = fn(current);
    localStorage.setItem(storageKey(hw), JSON.stringify(next));
    return next;
  });
  return [progress, update];
}

function ProgressRing({ value }) {
  return <div className="progress-ring" style={{ '--progress': `${value * 3.6}deg` }}><span>{value}%</span></div>;
}

function DayPicker({ days, active, onPick, progress }) {
  return <section className="day-picker" aria-label="Dört günlük çalışma planı">
    <div className="day-heading"><div><span className="eyebrow">Aktif çalışma planı</span><h2>Dört gün, dört kısa odak</h2></div><p>Her gün yaklaşık 20–30 dakika</p></div>
    <div className="day-grid">{days.map((day, index) => {
      const complete = sections.every(([id]) => progress.done?.[`${day.id}:${id}`]);
      return <button key={day.id} className={active.id === day.id ? 'active' : ''} onClick={() => onPick(day)} aria-pressed={active.id === day.id}>
        <span className="day-number">{complete ? <Check size={20}/> : index + 1}</span>
        <span><small>GÜN {index + 1}</small><strong>{day.shortTitle}</strong><em>{day.focus}</em></span>
        <ChevronRight size={19}/>
      </button>;
    })}</div>
  </section>;
}

function Notes({ day }) {
  return <section className="content-stack"><header className="section-intro"><span className="section-kicker">Önce mantığı gör</span><h2>{day.title}</h2><p>{day.intro}</p></header>
    <div className="rule-grid">{day.rules.map((rule) => <article className="rule" key={rule.title}><span className="rule-icon"><Lightbulb size={19}/></span><div><h3>{rule.title}</h3><p>{rule.text}</p><div className="examples">{rule.examples.map((x) => <code key={x}>{x}</code>)}</div></div></article>)}</div>
    <aside className="remember"><Target size={21}/><div><strong>Hatırla</strong><p>{day.remember}</p></div></aside>
    <aside className="watch"><TriangleAlert size={21}/><div><strong>Dikkat</strong><p>{day.watchOut}</p></div></aside>
  </section>;
}

function Words({ day, progress, update }) {
  const [revealed, setRevealed] = useState({});
  return <section className="content-stack"><header className="section-intro"><span className="section-kicker">Günlük beş kelime</span><h2>Kelime rutini</h2><p>Önce Türkçe anlamı görüp İngilizcesini söyle. Sonra kartı aç ve kendinle ilgili bir cümle yaz.</p></header>
    <div className="word-grid">{day.words.map((word, index) => <article className="word-card" key={word.en}>
      <div className="word-top"><span>{String(index + 1).padStart(2, '0')}</span><small>{word.type}</small></div>
      <h3>{revealed[word.en] ? word.en : word.tr}</h3><p>{revealed[word.en] ? word.definition : 'İngilizcesini yüksek sesle söyle.'}</p>
      <button className="text-action" onClick={() => setRevealed((v) => ({ ...v, [word.en]: !v[word.en] }))}>{revealed[word.en] ? 'Türkçeyi göster' : 'Cevabı göster'}</button>
      {revealed[word.en] && <><blockquote>{word.example}</blockquote><label>Kendi cümlen<input value={progress.examples?.[`${day.id}:${word.en}`] || ''} onChange={(e) => update((p) => ({ ...p, examples: { ...p.examples, [`${day.id}:${word.en}`]: e.target.value } }))} placeholder="I ..." /></label></>}
    </article>)}</div>
  </section>;
}

function Question({ question, id, saved, onAnswer }) {
  const selected = saved?.choice;
  const checked = selected !== undefined;
  const correct = selected === question.answer;
  return <article className="question"><div className="question-number">{id + 1}</div><div className="question-body"><h3>{question.prompt}</h3>
    <div className="options">{question.options.map((option, index) => <button key={option} disabled={checked} className={checked ? index === question.answer ? 'correct' : index === selected ? 'wrong' : '' : ''} onClick={() => onAnswer(index)}><span>{String.fromCharCode(65 + index)}</span>{option}</button>)}</div>
    {checked && <div className={`feedback ${correct ? 'good' : 'try'}`}><strong>{correct ? 'Doğru.' : 'Tekrar düşün.'}</strong><p>{correct ? question.feedback : question.hint}</p></div>}
  </div></article>;
}

function Questions({ items, day, section, progress, update }) {
  return <div className="question-list">{items.map((q, index) => {
    const key = `${day.id}:${section}:${index}`;
    return <Question key={key} question={q} id={index} saved={progress.answers?.[key]} onAnswer={(choice) => update((p) => ({ ...p, answers: { ...p.answers, [key]: { choice } } }))}/>;
  })}</div>;
}

function Practice({ day, progress, update }) {
  return <section className="content-stack"><header className="section-intro"><span className="section-kicker">Kontrollü pratik</span><h2>Cümleyi doğru kur</h2><p>Her sorudan sonra açıklamayı oku. İpucu cevabı söylemez; hangi kurala bakacağını gösterir.</p></header><Questions items={day.practice} day={day} section="practice" progress={progress} update={update}/></section>;
}

function Reading({ day, progress, update }) {
  return <section className="content-stack"><header className="section-intro"><span className="section-kicker">Bağlam içinde</span><h2>{day.reading.title}</h2></header><article className="reading-text">{day.reading.paragraphs.map((p, i) => <p key={i}>{p}</p>)}</article><h3 className="subheading">Metni kontrol et</h3><Questions items={day.reading.questions} day={day} section="reading" progress={progress} update={update}/></section>;
}

function Listening({ day }) {
  return <section className="content-stack"><header className="section-intro"><span className="section-kicker">Dış kaynak</span><h2>{day.listening.title}</h2><p>{day.listening.instructions}</p></header><article className="listening-panel"><Headphones size={34}/><div><span>{day.listening.source}</span><h3>{day.listening.resource}</h3><p>{day.listening.task}</p></div><a href={day.listening.url} target="_blank" rel="noreferrer">Dinlemeyi aç <ExternalLink size={17}/></a></article><aside className="remember"><NotebookPen size={21}/><div><strong>Dinledikten sonra</strong><p>{day.listening.followUp}</p></div></aside></section>;
}

function Test({ day, progress, update }) {
  const answers = day.test.map((_, i) => progress.answers?.[`${day.id}:test:${i}`]);
  const answered = answers.filter(Boolean).length;
  const hits = answers.filter((x, i) => x?.choice === day.test[i].answer).length;
  return <section className="content-stack"><header className="section-intro"><span className="section-kicker">Günün kontrolü</span><h2>15 soruluk mini test</h2><p>{answered === day.test.length ? `${hits} / ${day.test.length} doğru. Yanlışların açıklamalarını tekrar incele.` : `${answered} / ${day.test.length} cevaplandı.`}</p></header><Questions items={day.test} day={day} section="test" progress={progress} update={update}/>{answered === day.test.length && <div className="result"><Trophy size={38}/><div><strong>{hits >= 12 ? 'Bu gün tamam!' : 'Bir tekrar daha iyi olur.'}</strong><span>{hits} / {day.test.length}</span></div></div>}</section>;
}

function ArchivePicker({ lessons, activeId, onPick }) {
  if (lessons.length < 2) return null;
  return <details className="archive"><summary><History size={17}/><span>Önceki ödevler</span><ChevronDown size={17}/></summary><div>{lessons.slice(1).map((lesson) => <button key={lesson.id} className={lesson.id === activeId ? 'active' : ''} onClick={() => onPick(lesson)}><span>{lesson.date}</span><strong>{lesson.title}</strong></button>)}</div></details>;
}

export default function App() {
  const [index, setIndex] = useState(null); const [hw, setHw] = useState(null); const [dayId, setDayId] = useState(null); const [tab, setTab] = useState('notes'); const [error, setError] = useState('');
  const [progress, update] = useProgress(hw);
  useEffect(() => { fetch(`${import.meta.env.BASE_URL}homeworks/index.json`).then((r) => r.ok ? r.json() : Promise.reject()).then(setIndex).catch(() => setError('Ödev listesi yüklenemedi.')); }, []);
  async function load(entry) { try { const data = await fetch(`${import.meta.env.BASE_URL}homeworks/${entry.path}`).then((r) => r.json()); setHw(data); setDayId(data.days[0].id); setTab('notes'); } catch { setError('Bu ödev yüklenemedi.'); } }
  useEffect(() => { if (index?.lessons?.length) load(index.lessons[0]); }, [index]);
  const day = useMemo(() => hw?.days.find((x) => x.id === dayId) || hw?.days[0], [hw, dayId]);
  const completed = hw ? Object.values(progress.done || {}).filter(Boolean).length : 0;
  const percent = Math.round((completed / ((hw?.days.length || 4) * sections.length)) * 100);
  const markDone = () => update((p) => ({ ...p, done: { ...p.done, [`${day.id}:${tab}`]: !p.done?.[`${day.id}:${tab}`] } }));
  if (error) return <main className="state"><AlertTriangle/><h1>{error}</h1></main>;
  if (!hw || !day) return <main className="state"><LoaderCircle className="spin"/><p>Çalışma planı hazırlanıyor…</p></main>;
  const View = { notes: Notes, words: Words, practice: Practice, reading: Reading, listening: Listening, test: Test }[tab];
  return <div className="app-shell"><header className="topbar"><div className="brand"><span><MapPin size={23}/></span><div><h1>Sefa's English Practice</h1><p>A1 · Günlük tekrar planı</p></div></div><div className="overall"><div><span>Haftalık ilerleme</span><strong>{completed} / {hw.days.length * sections.length} bölüm</strong></div><ProgressRing value={percent}/></div></header>
    <main><section className="lesson-head"><div><span className="eyebrow">{hw.dateLabel} · En yeni ödev</span><h2>{hw.title}</h2><p>{hw.subtitle}</p></div><div className="lesson-meta"><span><Target size={17}/> 4 gün</span><span><CircleHelp size={17}/> {hw.questionCount} soru</span></div></section>
      <ArchivePicker lessons={index.lessons} activeId={hw.id} onPick={load}/><DayPicker days={hw.days} active={day} onPick={(next) => { setDayId(next.id); setTab('notes'); }} progress={progress}/>
      <div className="workspace"><nav className="section-nav">{sections.map(([id, label, Icon]) => <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}><Icon size={18}/><span>{label}</span>{progress.done?.[`${day.id}:${id}`] && <CheckCircle2 className="done" size={16}/>}</button>)}</nav>
        <div className="content"><View day={day} progress={progress} update={update}/><button className={`complete-button ${progress.done?.[`${day.id}:${tab}`] ? 'completed' : ''}`} onClick={markDone}><CheckCircle2 size={19}/>{progress.done?.[`${day.id}:${tab}`] ? 'Bölüm tamamlandı' : 'Bu bölümü tamamladım'}</button></div>
      </div>
    </main><footer><span>İlerleme ve kişisel cümleler bu tarayıcıda saklanır.</span><button onClick={() => { if (window.confirm('Bu ödevdeki ilerlemeyi sıfırlamak istiyor musun?')) { localStorage.removeItem(storageKey(hw)); location.reload(); } }}><RotateCcw size={15}/> İlerlemeyi sıfırla</button></footer></div>;
}
