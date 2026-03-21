import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { Button } from '@/components/ui/Button/Button';

interface InlineScoreModalProps {
  match: any;
  tournament: any;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const InlineScoreModal: React.FC<InlineScoreModalProps> = ({ match, tournament, isOpen, onClose, onSuccess }) => {
  const [scoreA, setScoreA] = useState(0);
  const [scoreB, setScoreB] = useState(0);
  const [setScores, setSetScores] = useState<{a: number, b: number}[]>(Array(5).fill({a:0, b:0}));
  const [submitting, setSubmitting] = useState(false);
  const [errorMSG, setErrorMSG] = useState('');

  const bestOf = tournament?.best_of || 1;
  const isMultiSet = bestOf > 1;

  useEffect(() => {
    if (isOpen && match) {
      setScoreA(match.team_a_score || 0);
      setScoreB(match.team_b_score || 0);
      if (match.set_scores && match.set_scores.length > 0) {
        const newSets = Array(5).fill({a:0, b:0});
        match.set_scores.forEach((s: any, i: number) => {
           if (i < 5) newSets[i] = {a: s.a, b: s.b};
        });
        setSetScores(newSets);
      } else {
        setSetScores(Array(5).fill({a:0, b:0}));
      }
      setErrorMSG('');
    }
  }, [isOpen, match]);

  useEffect(() => {
    if (isMultiSet && isOpen) {
      let aWins = 0;
      let bWins = 0;
      setScores.slice(0, bestOf).forEach(s => {
         if (s.a > s.b) aWins++;
         else if (s.b > s.a) bWins++;
      });
      setScoreA(aWins);
      setScoreB(bWins);
    }
  }, [setScores, isMultiSet, bestOf, isOpen]);

  if (!isOpen || !match) return null;

  const updateSet = (idx: number, team: 'a'|'b', val: number) => {
    const nw = [...setScores];
    nw[idx] = { ...nw[idx], [team]: val };
    setSetScores(nw);
  };

  const handleSave = async () => {
    setErrorMSG('');
    
    if (isMultiSet) {
      const winsToWin = Math.ceil(bestOf / 2);
      const isAValid = scoreA === winsToWin && scoreB < winsToWin;
      const isBValid = scoreB === winsToWin && scoreA < winsToWin;
      
      if (!isAValid && !isBValid && (scoreA > 0 || scoreB > 0)) {
        setErrorMSG(`Trận đấu BO${bestOf} yêu cầu một đội đạt ${winsToWin} ván thắng.`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/matches/${match.match_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: match.type,
          team_a_score: scoreA,
          team_b_score: scoreB,
          team_a_players: match.team_a?.map((p:any)=>p.id) || [],
          team_b_players: match.team_b?.map((p:any)=>p.id) || [],
          set_scores: isMultiSet ? setScores.slice(0, bestOf) : undefined
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi lưu kết quả');
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMSG(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <div style={headerStyle}>
          <h2>Cập nhật Tỉ số</h2>
          <button onClick={onClose} style={closeBtnStyle}><X size={20}/></button>
        </div>
        
        <div style={contentStyle}>
          <div style={teamsGrid}>
             <div style={{textAlign: 'center', flex: 1}}>
                <h3 style={{color: '#ef4444', marginBottom: '1rem'}}>{match.team_a?.map((p:any)=>p.name).join(' & ') || 'Team A'}</h3>
                {!isMultiSet && (
                   <input 
                     type="number" min="0" value={scoreA} 
                     onChange={(e) => setScoreA(parseInt(e.target.value) || 0)}
                     style={mainInputStyle(scoreA > scoreB, '#ef4444')}
                   />
                )}
             </div>
             <div style={{fontWeight: 'bold', margin: '0 1rem', display: 'flex', alignItems: 'center'}}>VS</div>
             <div style={{textAlign: 'center', flex: 1}}>
                <h3 style={{color: '#3b82f6', marginBottom: '1rem'}}>{match.team_b?.map((p:any)=>p.name).join(' & ') || 'Team B'}</h3>
                {!isMultiSet && (
                   <input 
                     type="number" min="0" value={scoreB} 
                     onChange={(e) => setScoreB(parseInt(e.target.value) || 0)}
                     style={mainInputStyle(scoreB > scoreA, '#3b82f6')}
                   />
                )}
             </div>
          </div>

          {isMultiSet && (
            <div style={setsContainer}>
               <h4 style={{textAlign:'center', marginBottom: '1rem'}}>Chi tiết từng ván (Tự cộng dồn: {scoreA} - {scoreB})</h4>
               <div style={{display: 'flex', flexDirection: 'column', gap: '0.8rem'}}>
                 {Array.from({length: bestOf}).map((_, i) => (
                    <div key={i} style={{display:'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem'}}>
                       <span style={{width: '60px', color: 'var(--text-muted)'}}>Ván {i+1}</span>
                       <input 
                         type="number" min="0" value={setScores[i]?.a || ''} 
                         onChange={(e)=>updateSet(i, 'a', parseInt(e.target.value)||0)}
                         style={setInputStyle('#ef4444')}
                       />
                       <span>-</span>
                       <input 
                         type="number" min="0" value={setScores[i]?.b || ''} 
                         onChange={(e)=>updateSet(i, 'b', parseInt(e.target.value)||0)}
                         style={setInputStyle('#3b82f6')}
                       />
                    </div>
                 ))}
               </div>
            </div>
          )}

          {errorMSG && <div style={{color: '#ef4444', marginTop: '1rem', textAlign: 'center', fontSize:'0.9rem'}}>{errorMSG}</div>}
        </div>

        <div style={footerStyle}>
          <Button onClick={onClose} variant="secondary" disabled={submitting}>Hủy</Button>
          <Button onClick={handleSave} disabled={submitting}>
            <Save size={18} style={{marginRight: '0.5rem'}}/> {submitting ? 'Đang lưu...' : 'Lưu Kết Quả'}
          </Button>
        </div>
      </div>
    </div>
  );
};

// Inline styles
const overlayStyle: React.CSSProperties = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
  backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1000,
  display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem'
};
const modalStyle: React.CSSProperties = {
  background: 'var(--card-bg)', width: '100%', maxWidth: '500px',
  borderRadius: '16px', border: '1px solid var(--border-color)', overflow: 'hidden',
  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
};
const headerStyle: React.CSSProperties = {
  padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)',
  display: 'flex', justifyContent: 'space-between', alignItems: 'center'
};
const closeBtnStyle: React.CSSProperties = {
  background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer'
};
const contentStyle: React.CSSProperties = {
  padding: '1.5rem'
};
const teamsGrid: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem'
};
const mainInputStyle = (isWinner: boolean, color: string): React.CSSProperties => ({
  width: '100px', height: '60px', fontSize: '2rem', textAlign: 'center', fontWeight: 'bold',
  background: 'var(--background)', border: `2px solid ${isWinner ? color : 'var(--border-color)'}`,
  borderRadius: '12px', color: 'var(--text-color)'
});
const setsContainer: React.CSSProperties = {
  background: 'rgba(0,0,0,0.2)', padding: '1.25rem', borderRadius: '12px'
};
const setInputStyle = (color: string): React.CSSProperties => ({
  width: '70px', height: '40px', fontSize: '1.2rem', textAlign: 'center', fontWeight: 'bold',
  background: 'var(--background)', border: `2px solid ${color}`, borderRadius: '8px', color: 'var(--text-color)'
});
const footerStyle: React.CSSProperties = {
  padding: '1.25rem 1.5rem', borderTop: '1px solid var(--border-color)',
  display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', background: 'rgba(0,0,0,0.1)'
};
