import { useState, useEffect, useCallback } from 'react';
import { SECTIONS, FLASHCARDS, QUIZ_QUESTIONS } from './studyData';

const STORAGE_KEY = 'cscn352_progress';

function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { known: {}, quizScores: {} };
  } catch { return { known: {}, quizScores: {} }; }
}

function saveProgress(p) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); } catch {}
}

// ── Styles ────────────────────────────────────────────────────────────────────
const css = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Space Grotesk', sans-serif; background: #0a0a0f; color: #e2e8f0; min-height: 100vh; }
  
  .app { min-height: 100vh; display: flex; flex-direction: column; }
  
  .header { padding: 20px 24px 0; }
  .header-top { display: flex; align-items: center; gap: 12px; margin-bottom: 4px; }
  .header-badge { font-family: 'IBM Plex Mono', monospace; font-size: 10px; font-weight: 500; color: #0ea5e9; letter-spacing: 0.08em; background: rgba(14,165,233,0.1); border: 1px solid rgba(14,165,233,0.25); padding: 3px 8px; border-radius: 4px; }
  .header h1 { font-size: 22px; font-weight: 600; color: #f1f5f9; }
  .header p { font-size: 13px; color: #64748b; margin-top: 2px; }

  .nav { display: flex; gap: 6px; padding: 16px 24px; flex-wrap: wrap; }
  .nav-btn { font-family: 'Space Grotesk', sans-serif; font-size: 12px; font-weight: 500; padding: 6px 14px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.08); background: transparent; color: #94a3b8; cursor: pointer; transition: all 0.15s; white-space: nowrap; }
  .nav-btn:hover { border-color: rgba(255,255,255,0.2); color: #e2e8f0; }
  .nav-btn.active { background: #1e293b; border-color: rgba(255,255,255,0.15); color: #f1f5f9; }
  .nav-btn.mode-btn { border-color: rgba(14,165,233,0.3); color: #0ea5e9; }
  .nav-btn.mode-btn.active { background: rgba(14,165,233,0.12); }

  .main { flex: 1; padding: 0 24px 40px; max-width: 760px; width: 100%; }

  /* Section pills */
  .section-pills { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 20px; }
  .pill { font-size: 11px; font-weight: 500; padding: 4px 12px; border-radius: 20px; border: 1px solid; cursor: pointer; transition: all 0.15s; }
  .pill.all { border-color: rgba(255,255,255,0.15); color: #94a3b8; }
  .pill.all.active { background: rgba(255,255,255,0.08); color: #e2e8f0; }

  /* Progress bar */
  .progress-wrap { margin-bottom: 24px; }
  .progress-label { display: flex; justify-content: space-between; font-size: 11px; color: #475569; margin-bottom: 6px; font-family: 'IBM Plex Mono', monospace; }
  .progress-bar { height: 3px; background: #1e293b; border-radius: 2px; overflow: hidden; }
  .progress-fill { height: 100%; border-radius: 2px; background: linear-gradient(90deg, #0ea5e9, #6366f1); transition: width 0.4s ease; }

  /* Flashcard */
  .card-counter { font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: #475569; margin-bottom: 12px; }
  .flashcard { perspective: 1000px; cursor: pointer; margin-bottom: 16px; }
  .flashcard-inner { position: relative; width: 100%; min-height: 200px; transition: transform 0.45s ease; transform-style: preserve-3d; }
  .flashcard.flipped .flashcard-inner { transform: rotateY(180deg); }
  .flashcard-front, .flashcard-back { position: absolute; inset: 0; backface-visibility: hidden; border-radius: 12px; padding: 28px 32px; display: flex; flex-direction: column; justify-content: center; }
  .flashcard-front { background: #111827; border: 1px solid rgba(255,255,255,0.07); }
  .flashcard-back { background: #0f1f35; border: 1px solid rgba(14,165,233,0.2); transform: rotateY(180deg); }
  .flashcard-front .label { font-family: 'IBM Plex Mono', monospace; font-size: 10px; color: #475569; letter-spacing: 0.08em; margin-bottom: 12px; }
  .flashcard-front .term { font-size: 24px; font-weight: 600; color: #f1f5f9; line-height: 1.2; }
  .flashcard-back .label { font-family: 'IBM Plex Mono', monospace; font-size: 10px; color: #0ea5e9; letter-spacing: 0.08em; margin-bottom: 12px; }
  .flashcard-back .def { font-size: 15px; color: #cbd5e1; line-height: 1.65; }
  .tap-hint { font-size: 11px; color: #334155; text-align: center; margin-bottom: 20px; }

  /* Card actions */
  .card-actions { display: flex; gap: 10px; margin-bottom: 32px; }
  .action-btn { flex: 1; padding: 11px; border-radius: 8px; border: 1px solid; font-family: 'Space Grotesk', sans-serif; font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.15s; }
  .action-btn.skip { background: transparent; border-color: rgba(255,255,255,0.08); color: #64748b; }
  .action-btn.skip:hover { border-color: rgba(255,255,255,0.15); color: #94a3b8; }
  .action-btn.know { background: rgba(16,185,129,0.1); border-color: rgba(16,185,129,0.3); color: #10b981; }
  .action-btn.know:hover { background: rgba(16,185,129,0.18); }
  .action-btn.prev { background: transparent; border-color: rgba(255,255,255,0.08); color: #64748b; padding: 11px 16px; flex: 0 0 auto; }
  .action-btn.prev:hover { color: #94a3b8; }

  /* Known list */
  .known-count { font-size: 13px; color: #475569; margin-bottom: 16px; }
  .known-list { display: flex; flex-wrap: wrap; gap: 8px; }
  .known-chip { font-size: 12px; padding: 4px 12px; background: rgba(16,185,129,0.08); border: 1px solid rgba(16,185,129,0.2); border-radius: 20px; color: #34d399; cursor: pointer; }
  .known-chip:hover { background: rgba(16,185,129,0.15); }

  /* Quiz */
  .quiz-question { font-size: 16px; font-weight: 500; color: #f1f5f9; line-height: 1.55; margin-bottom: 20px; }
  .quiz-options { display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px; }
  .quiz-option { padding: 13px 16px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.07); background: #111827; font-family: 'Space Grotesk', sans-serif; font-size: 14px; color: #94a3b8; cursor: pointer; text-align: left; transition: all 0.15s; }
  .quiz-option:hover:not(:disabled) { border-color: rgba(14,165,233,0.3); color: #e2e8f0; background: #0f1f35; }
  .quiz-option.correct { background: rgba(16,185,129,0.1); border-color: rgba(16,185,129,0.4); color: #10b981; }
  .quiz-option.wrong { background: rgba(239,68,68,0.08); border-color: rgba(239,68,68,0.3); color: #ef4444; }
  .quiz-option.reveal { background: rgba(16,185,129,0.06); border-color: rgba(16,185,129,0.2); color: #34d399; }
  .quiz-option:disabled { cursor: default; }
  .quiz-explanation { padding: 14px 16px; background: #0c1a2e; border: 1px solid rgba(14,165,233,0.15); border-radius: 8px; font-size: 13px; color: #94a3b8; line-height: 1.6; margin-bottom: 20px; }
  .quiz-explanation strong { color: #0ea5e9; font-weight: 500; }
  .quiz-next { width: 100%; padding: 12px; border-radius: 8px; border: 1px solid rgba(14,165,233,0.3); background: rgba(14,165,233,0.08); color: #0ea5e9; font-family: 'Space Grotesk', sans-serif; font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.15s; }
  .quiz-next:hover { background: rgba(14,165,233,0.15); }

  /* Quiz score */
  .score-card { background: #111827; border: 1px solid rgba(255,255,255,0.07); border-radius: 12px; padding: 28px; text-align: center; }
  .score-big { font-size: 52px; font-weight: 600; font-family: 'IBM Plex Mono', monospace; margin: 8px 0; }
  .score-label { font-size: 13px; color: #475569; margin-bottom: 20px; }
  .score-restart { padding: 10px 24px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); background: transparent; color: #e2e8f0; font-family: 'Space Grotesk', sans-serif; font-size: 13px; cursor: pointer; transition: all 0.15s; }
  .score-restart:hover { background: #1e293b; }

  /* Overview */
  .overview-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; margin-bottom: 24px; }
  .overview-card { background: #111827; border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; padding: 16px; }
  .overview-card h3 { font-size: 12px; font-weight: 500; color: #475569; margin-bottom: 8px; }
  .overview-card .big { font-size: 28px; font-weight: 600; font-family: 'IBM Plex Mono', monospace; }
  .overview-section-list { display: flex; flex-direction: column; gap: 8px; }
  .overview-row { display: flex; align-items: center; gap: 10px; padding: 10px 14px; background: #111827; border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; }
  .overview-row-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
  .overview-row-name { font-size: 13px; color: #e2e8f0; flex: 1; }
  .overview-row-stat { font-family: 'IBM Plex Mono', monospace; font-size: 12px; color: #475569; }

  @media (max-width: 600px) {
    .header, .nav, .main { padding-left: 16px; padding-right: 16px; }
    .flashcard-front .term { font-size: 20px; }
    .overview-grid { grid-template-columns: 1fr 1fr; }
  }
`;

// ── Helpers ───────────────────────────────────────────────────────────────────
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getCards(sectionId) {
  if (sectionId === 'all') return Object.entries(FLASHCARDS).flatMap(([sec, cards]) => cards.map(c => ({ ...c, section: sec })));
  return (FLASHCARDS[sectionId] || []).map(c => ({ ...c, section: sectionId }));
}

function getQuestions(sectionId) {
  if (sectionId === 'all') return QUIZ_QUESTIONS;
  return QUIZ_QUESTIONS.filter(q => q.section === sectionId);
}

// ── Components ────────────────────────────────────────────────────────────────
function FlashcardMode({ sectionId, progress, setProgress }) {
  const [cards, setCards] = useState(() => shuffle(getCards(sectionId)));
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [showKnown, setShowKnown] = useState(false);

  useEffect(() => {
    setCards(shuffle(getCards(sectionId)));
    setIdx(0);
    setFlipped(false);
  }, [sectionId]);

  const card = cards[idx];
  const knownSet = new Set(Object.keys(progress.known).filter(k => progress.known[k]));
  const knownCount = cards.filter(c => knownSet.has(c.term)).length;

  const markKnown = useCallback(() => {
    const updated = { ...progress, known: { ...progress.known, [card.term]: true } };
    setProgress(updated);
    saveProgress(updated);
    next();
  }, [card, progress, setProgress]);

  const next = useCallback(() => {
    setFlipped(false);
    setTimeout(() => setIdx(i => (i + 1) % cards.length), 50);
  }, [cards.length]);

  const prev = useCallback(() => {
    setFlipped(false);
    setTimeout(() => setIdx(i => (i - 1 + cards.length) % cards.length), 50);
  }, [cards.length]);

  const unmark = (term) => {
    const updated = { ...progress, known: { ...progress.known, [term]: false } };
    setProgress(updated);
    saveProgress(updated);
  };

  if (!card) return <p style={{ color: '#475569', fontSize: 14 }}>No cards in this section.</p>;

  return (
    <div>
      <div className="progress-wrap">
        <div className="progress-label">
          <span>KNOWN</span>
          <span>{knownCount} / {cards.length}</span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${(knownCount / cards.length) * 100}%` }} />
        </div>
      </div>

      <div className="card-counter">{idx + 1} / {cards.length}</div>

      <div className={`flashcard${flipped ? ' flipped' : ''}`} onClick={() => setFlipped(f => !f)} style={{ userSelect: 'none' }}>
        <div className="flashcard-inner">
          <div className="flashcard-front">
            <div className="label">TERM</div>
            <div className="term">{card.term}</div>
          </div>
          <div className="flashcard-back">
            <div className="label">DEFINITION</div>
            <div className="def">{card.def}</div>
          </div>
        </div>
      </div>
      <div className="tap-hint">tap card to flip</div>

      <div className="card-actions">
        <button className="action-btn prev" onClick={prev}>←</button>
        <button className="action-btn skip" onClick={next}>Skip</button>
        <button className="action-btn know" onClick={markKnown}>Got it ✓</button>
      </div>

      {knownCount > 0 && (
        <div>
          <div className="known-count" onClick={() => setShowKnown(s => !s)} style={{ cursor: 'pointer' }}>
            ▾ {knownCount} term{knownCount !== 1 ? 's' : ''} marked known (click to review)
          </div>
          {showKnown && (
            <div className="known-list">
              {cards.filter(c => knownSet.has(c.term)).map(c => (
                <span key={c.term} className="known-chip" onClick={() => unmark(c.term)} title="Click to unmark">{c.term} ×</span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function QuizMode({ sectionId, progress, setProgress }) {
  const [questions, setQuestions] = useState(() => shuffle(getQuestions(sectionId)));
  const [qIdx, setQIdx] = useState(0);
  const [selected, setSelected] = useState(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const qs = shuffle(getQuestions(sectionId));
    setQuestions(qs);
    setQIdx(0);
    setSelected(null);
    setScore(0);
    setDone(false);
  }, [sectionId]);

  const q = questions[qIdx];

  const pick = (optIdx) => {
    if (selected !== null) return;
    setSelected(optIdx);
    if (optIdx === q.answer) setScore(s => s + 1);
  };

  const next = () => {
    if (qIdx + 1 >= questions.length) {
      const pct = Math.round(((score + (selected === q.answer ? 1 : 0)) / questions.length) * 100);
      const updated = { ...progress, quizScores: { ...progress.quizScores, [sectionId]: pct } };
      setProgress(updated);
      saveProgress(updated);
      setDone(true);
    } else {
      setQIdx(i => i + 1);
      setSelected(null);
    }
  };

  const restart = () => {
    setQuestions(shuffle(getQuestions(sectionId)));
    setQIdx(0);
    setSelected(null);
    setScore(0);
    setDone(false);
  };

  if (!questions.length) return <p style={{ color: '#475569', fontSize: 14 }}>No quiz questions for this section yet.</p>;

  if (done) {
    const final = Math.round((score / questions.length) * 100);
    const color = final >= 80 ? '#10b981' : final >= 60 ? '#f59e0b' : '#ef4444';
    return (
      <div className="score-card">
        <div style={{ fontSize: 13, color: '#475569' }}>Quiz complete</div>
        <div className="score-big" style={{ color }}>{final}%</div>
        <div className="score-label">{score} / {questions.length} correct</div>
        <button className="score-restart" onClick={restart}>Retry →</button>
      </div>
    );
  }

  return (
    <div>
      <div className="card-counter">{qIdx + 1} / {questions.length} · {score} correct</div>
      <div className="quiz-question">{q.question}</div>
      <div className="quiz-options">
        {q.options.map((opt, i) => {
          let cls = 'quiz-option';
          if (selected !== null) {
            if (i === q.answer) cls += ' correct';
            else if (i === selected && i !== q.answer) cls += ' wrong';
          }
          return (
            <button key={i} className={cls} onClick={() => pick(i)} disabled={selected !== null}>
              <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 11, color: '#475569', marginRight: 10 }}>{String.fromCharCode(65 + i)}.</span>
              {opt}
            </button>
          );
        })}
      </div>
      {selected !== null && (
        <>
          <div className="quiz-explanation">
            <strong>{selected === q.answer ? '✓ Correct!' : '✗ Incorrect.'}</strong> {q.explanation}
          </div>
          <button className="quiz-next" onClick={next}>{qIdx + 1 >= questions.length ? 'See Results →' : 'Next Question →'}</button>
        </>
      )}
    </div>
  );
}

function Overview({ progress }) {
  const allCards = getCards('all');
  const knownCount = allCards.filter(c => progress.known[c.term]).length;
  const quizScores = progress.quizScores || {};
  const scoredSections = Object.keys(quizScores);
  const avgScore = scoredSections.length ? Math.round(scoredSections.reduce((s, k) => s + quizScores[k], 0) / scoredSections.length) : null;

  return (
    <div>
      <div className="overview-grid">
        <div className="overview-card">
          <h3>TERMS KNOWN</h3>
          <div className="big" style={{ color: '#10b981' }}>{knownCount}<span style={{ fontSize: 14, color: '#334155' }}>/{allCards.length}</span></div>
        </div>
        <div className="overview-card">
          <h3>AVG QUIZ SCORE</h3>
          <div className="big" style={{ color: avgScore ? (avgScore >= 80 ? '#10b981' : avgScore >= 60 ? '#f59e0b' : '#ef4444') : '#334155' }}>
            {avgScore !== null ? `${avgScore}%` : '—'}
          </div>
        </div>
      </div>
      <div className="overview-section-list">
        {SECTIONS.map(sec => {
          const cards = getCards(sec.id);
          const known = cards.filter(c => progress.known[c.term]).length;
          const pct = cards.length ? Math.round((known / cards.length) * 100) : 0;
          const qScore = quizScores[sec.id];
          return (
            <div className="overview-row" key={sec.id}>
              <div className="overview-row-dot" style={{ background: sec.color }} />
              <span className="overview-row-name">{sec.label}</span>
              <span className="overview-row-stat">{known}/{cards.length} cards · {qScore !== undefined ? `quiz ${qScore}%` : 'no quiz yet'}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [mode, setMode] = useState('cards'); // 'overview' | 'cards' | 'quiz'
  const [section, setSection] = useState('all');
  const [progress, setProgress] = useState(loadProgress);

  const resetProgress = () => {
    const fresh = { known: {}, quizScores: {} };
    setProgress(fresh);
    saveProgress(fresh);
  };

  const activeSection = SECTIONS.find(s => s.id === section) || null;
  const accentColor = activeSection?.color || '#0ea5e9';

  return (
    <>
      <style>{css}</style>
      <div className="app">
        <div className="header">
          <div className="header-top">
            <span className="header-badge">CSCN 352</span>
          </div>
          <h1>Final Exam Study</h1>
          <p>Windows Server Administration · {QUIZ_QUESTIONS.length} quiz questions · {getCards('all').length} flashcards</p>
        </div>

        <div className="nav">
          <button className={`nav-btn mode-btn${mode === 'overview' ? ' active' : ''}`} onClick={() => setMode('overview')}>Overview</button>
          <button className={`nav-btn mode-btn${mode === 'cards' ? ' active' : ''}`} onClick={() => setMode('cards')}>Flashcards</button>
          <button className={`nav-btn mode-btn${mode === 'quiz' ? ' active' : ''}`} onClick={() => setMode('quiz')}>Quiz</button>
          <button className="nav-btn" style={{ marginLeft: 'auto', color: '#334155', fontSize: 11 }} onClick={resetProgress}>Reset</button>
        </div>

        <div className="main">
          {mode !== 'overview' && (
            <div className="section-pills">
              <span className={`pill all${section === 'all' ? ' active' : ''}`} onClick={() => setSection('all')}>All</span>
              {SECTIONS.map(s => (
                <span
                  key={s.id}
                  className="pill"
                  style={{
                    borderColor: section === s.id ? s.color : 'rgba(255,255,255,0.08)',
                    color: section === s.id ? s.color : '#475569',
                    background: section === s.id ? `${s.color}14` : 'transparent',
                  }}
                  onClick={() => setSection(s.id)}
                >
                  {s.label}
                </span>
              ))}
            </div>
          )}

          {mode === 'overview' && <Overview progress={progress} />}
          {mode === 'cards' && <FlashcardMode key={section} sectionId={section} progress={progress} setProgress={setProgress} />}
          {mode === 'quiz' && <QuizMode key={section + '-quiz'} sectionId={section} progress={progress} setProgress={setProgress} />}
        </div>
      </div>
    </>
  );
}
