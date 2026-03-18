// src/pages/Insights.js
import React, { useEffect, useState, useCallback } from 'react';
import { apiGet, apiPost } from '../lib/api';
import { formatCurrency } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { FiMessageSquare } from 'react-icons/fi';

function Card({ children, style }) {
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 16, padding: '1.5rem', ...style }}>
      {children}
    </div>
  );
}

function SectionTitle({ children, sub }) {
  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>{children}</div>
      {sub && <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{sub}</div>}
    </div>
  );
}

// ── Circular Progress Component ─────────────────────────────────
function CircularProgress({ percent, score, rank }) {
  const radius = 60;
  const stroke = 12;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percent / 100) * circumference;

  return (
    <div style={{ position: 'relative', width: radius * 2, height: radius * 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg height={radius * 2} width={radius * 2} style={{ position: 'absolute', transform: 'rotate(-90deg)' }}>
        <circle
          stroke="var(--bg-surface)"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <circle
          stroke="var(--accent)"
          fill="transparent"
          strokeWidth={stroke}
          strokeDasharray={circumference + ' ' + circumference}
          style={{ strokeDashoffset, transition: 'stroke-dashoffset 0.5s ease-in-out' }}
          strokeLinecap="round"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
      </svg>
      <div style={{ textAlign: 'center', zIndex: 1 }}>
        <div style={{ fontSize: '1.8rem', fontWeight: 900, fontFamily: 'var(--font-mono)', lineHeight: 1, color: 'var(--text-primary)' }}>
          {score}
        </div>
        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: 1, marginTop: 2 }}>XP</div>
      </div>
    </div>
  );
}

export default function Insights() {
  const [health, setHealth] = useState(null);
  const [netWorth, setNetWorth] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Tax Estimator State
  const [taxIncome, setTaxIncome] = useState(1200000);
  const [tax80c, setTax80c] = useState(0);
  const [tax80d, setTax80d] = useState(0);
  const [taxHomeLoan, setTaxHomeLoan] = useState(0);
  const [taxResult, setTaxResult] = useState(null);

  // Chatbot State
  const [messages, setMessages] = useState([
      { role: 'assistant', text: "Hi! I'm your Finsure Buddy. How can I help you optimize your money today?" }
  ]);
  const [inputMsg, setInputMsg] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const h = await apiGet('/insights/health-score');
      setHealth(h);
      const nw = await apiGet('/insights/net-worth');
      setNetWorth(nw);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const loadTax = useCallback(async () => {
      try {
          const res = await apiPost('/insights/tax', {
              annual_income: Number(taxIncome),
              investments_80c: Number(tax80c),
              medical_80d: Number(tax80d),
              home_loan_interest: Number(taxHomeLoan)
          });
          setTaxResult(res);
      } catch {}
  }, [taxIncome, tax80c, tax80d, taxHomeLoan]);

  useEffect(() => {
      const timer = setTimeout(loadTax, 500);
      return () => clearTimeout(timer);
  }, [taxIncome, tax80c, tax80d, taxHomeLoan, loadTax]);

  // Finsure Buddy Logic
  const handleChat = (e) => {
      e.preventDefault();
      if (!inputMsg.trim()) return;
      const userTxt = inputMsg.trim();
      setMessages(prev => [...prev, { role: 'user', text: userTxt }]);
      setInputMsg('');
      
      setTimeout(() => {
          let botReply = "That's an interesting question! As your Finsure Buddy, I recommend staying consistent checking your EMI tracker and sticking to your budget.";
          const lower = userTxt.toLowerCase();
          
          if (lower.includes('health') || lower.includes('score') || lower.includes('xp')) {
              botReply = `Your current Health Score is ${health?.score || 0} XP. To rank up faster to ${health?.next_rank || 'the top'}, focus on ${health?.quests?.[0]?.title || 'lowering your debt'}.`;
          } else if (lower.includes('net worth') || lower.includes('assets') || lower.includes('liabilities')) {
              botReply = `Your net worth is currently ${formatCurrency(netWorth?.net_worth || 0)}. You have ${formatCurrency(netWorth?.total_liabilities || 0)} in liabilities. Let's work on clearing that debt!`;
          } else if (lower.includes('tax') || lower.includes('regime')) {
              botReply = taxResult ? `Based on your tax calculator, you should opt for the ${taxResult.recommended_regime} to save the most money.` : "Try filling out the India Tax Estimator below so I can give you personalized tax advice!";
          } else if (lower.includes('hello') || lower.includes('hi')) {
              botReply = "Hello there! Ready to crush your financial goals?";
          } else if (lower.includes('save') || lower.includes('invest')) {
              botReply = "Building a 3 to 6-month emergency fund is step one. After that, look into Index Funds or SIPs to beat inflation!";
          } else if (lower.includes('vampire') || lower.includes('subscription')) {
              botReply = "Go to the Subscriptions page to hunt down those unwanted recurring costs. Every bit of saved cash counts!";
          }

          setMessages(prev => [...prev, { role: 'assistant', text: botReply }]);
      }, 700);
  };

  let radarData = [];
  if (health) {
      radarData = [
          { subject: 'Savings', A: health.breakdown.savings || 0, fullMark: 100 },
          { subject: 'Safety', A: health.breakdown.emergency || 0, fullMark: 100 },
          { subject: 'Efficiency', A: health.breakdown.efficiency || 0, fullMark: 100 },
      ];
  }

  // Safe checks for health
  const score = health?.score || 0;
  const pct = health?.progress_pct || 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '2rem' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>Finsure Player Stats</h2>
          <p style={{ margin: '0.3rem 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Level up your wealth. Complete quests to gain XP and rank up.
          </p>
        </div>
      </div>

      {loading ? (
        <div style={{ background: 'var(--bg-surface)', height: 200, borderRadius: 16, border: '1px dashed var(--border-subtle)' }} />
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(400px, 1fr) minmax(300px, 1fr)', gap: '1.5rem' }}>
            
            {/* Player Level & Quests Card */}
            <Card style={{ display: 'flex', flexDirection: 'column' }}>
                <SectionTitle sub="Gain XP by developing healthy financial habits.">Your Level: {health?.rank}</SectionTitle>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', padding: '1rem', background: 'var(--bg-elevated)', borderRadius: 16, border: '1px solid var(--border-default)' }}>
                    <CircularProgress percent={pct} score={score} rank={health?.rank} />
                    
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: 1 }}>
                            {health?.rank}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.4rem', marginBottom: '0.8rem' }}>
                            Next Rank: <strong>{health?.next_rank}</strong>
                        </div>
                        
                        <div style={{ height: 6, background: 'var(--bg-surface)', borderRadius: 4, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: 'var(--accent)', borderRadius: 4, transition: 'width 0.5s ease' }} />
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.4rem', display: 'flex', justifyContent: 'space-between' }}>
                            <span>{health?.score} XP</span>
                            <span>{health?.points_to_next > 0 ? `${health?.points_to_next} XP to next rank` : 'Max Rank'}</span>
                        </div>
                        
                        {/* Rank Progression Track */}
                        {health?.total_ranks && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem', opacity: 0.8 }}>
                                {health.total_ranks.map((r, i) => {
                                    const isCurrent = r === health.rank;
                                    const rankIndex = health.total_ranks.indexOf(health.rank);
                                    const isPast = i < rankIndex;
                                    return (
                                        <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1 }}>
                                            <div style={{ width: 12, height: 12, borderRadius: '50%', background: isCurrent ? 'var(--accent)' : (isPast ? '#10b981' : 'var(--bg-surface)'), border: `2px solid ${isCurrent || isPast ? 'transparent' : 'var(--border-default)'}` }} />
                                            <div style={{ fontSize: '0.55rem', fontWeight: isCurrent ? 800 : 600, color: isCurrent || isPast ? 'var(--text-primary)' : 'var(--text-muted)', textAlign: 'center' }}>
                                                {r.replace(' ', '\n')}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>

                <div style={{ marginTop: '1.5rem' }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.8rem', color: 'var(--text-primary)', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Active Quests</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{health?.quests?.length || 0} quests</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                        {health?.quests?.map((q, i) => (
                            <div key={i} 
                                onClick={() => navigate(q.action_url)}
                                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-surface)', padding: '1rem', borderRadius: 12, border: '1px solid var(--border-subtle)', cursor: 'pointer', transition: 'all 0.2s', ':hover': { borderColor: 'var(--accent)' } }}>
                                <div>
                                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>{q.title}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>{q.desc}</div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <div style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--accent)', padding: '0.3rem 0.6rem', borderRadius: 8, fontSize: '0.8rem', fontWeight: 700 }}>
                                        +{q.reward} XP
                                    </div>
                                    <div style={{ color: 'var(--text-muted)' }}>→</div>
                                </div>
                            </div>
                        ))}
                        {(!health?.quests || health.quests.length === 0) && (
                            <div style={{ textAlign: 'center', padding: '1.5rem', background: 'rgba(16,185,129,0.05)', borderRadius: 12, color: '#10b981', fontWeight: 600 }}>
                                All quests completed! You are a master!
                            </div>
                        )}
                    </div>
                </div>
            </Card>

            {/* Net Worth & Radar Card */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <Card>
                    <SectionTitle sub="The bottom line: Assets minus Liabilities.">Net Worth</SectionTitle>
                    <div style={{ padding: '1.5rem', background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(16,185,129,0.1))', borderRadius: 12, border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Total Net Worth</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.4rem', letterSpacing:-1 }}>
                            {formatCurrency(netWorth?.net_worth || 0, netWorth?.currency)}
                        </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                        <div style={{ padding: '1rem', background: 'var(--bg-surface)', borderRadius: 12, border: '1px solid var(--border-default)', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Assets</div>
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.2rem', fontWeight: 700, color: '#10b981', marginTop: '0.2rem' }}>
                                {formatCurrency(netWorth?.total_assets || 0, netWorth?.currency)}
                            </div>
                        </div>
                        <div style={{ padding: '1rem', background: 'var(--bg-surface)', borderRadius: 12, border: '1px solid var(--border-default)', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Liabilities</div>
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.2rem', fontWeight: 700, color: '#ef4444', marginTop: '0.2rem' }}>
                                {formatCurrency(netWorth?.total_liabilities || 0, netWorth?.currency)}
                            </div>
                        </div>
                    </div>
                </Card>

                <Card style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <SectionTitle sub="Your stat distribution">Skill Radar</SectionTitle>
                    <div style={{ flex: 1, minHeight: 200 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                                <PolarGrid stroke="var(--border-subtle)" />
                                <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text-primary)', fontSize: 11, fontWeight: 600 }} />
                                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                <Radar name="Score" dataKey="A" stroke="var(--accent)" fill="var(--accent)" fillOpacity={0.4} strokeWidth={2} />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                {/* Finsure Buddy Chatbot Widget */}
                <Card style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-elevated)' }}>
                    <SectionTitle sub="Ask me anything about your finances">
                      <FiMessageSquare style={{ marginRight: '0.4rem', verticalAlign: 'middle' }} /> 
                      Finsure Buddy
                    </SectionTitle>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 220, maxHeight: 300, background: 'var(--bg-surface)', borderRadius: 12, border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
                        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                            {messages.map((m, i) => (
                                <div key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 2, marginLeft: m.role === 'user' ? 0 : 4, textAlign: m.role === 'user' ? 'right' : 'left' }}>
                                        {m.role === 'user' ? 'You' : 'Finsure Buddy'}
                                    </div>
                                    <div style={{ background: m.role === 'user' ? 'var(--accent)' : 'var(--bg-card)', color: m.role === 'user' ? '#fff' : 'var(--text-primary)', border: `1px solid ${m.role === 'user' ? 'var(--accent)' : 'var(--border-default)'}`, padding: '0.6rem 0.85rem', borderRadius: m.role === 'user' ? '12px 12px 0 12px' : '0 12px 12px 12px', fontSize: '0.85rem', lineHeight: 1.4 }}>
                                        {m.text}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <form onSubmit={handleChat} style={{ borderTop: '1px solid var(--border-subtle)', display: 'flex', background: 'var(--bg-card)' }}>
                            <input type="text" value={inputMsg} onChange={e => setInputMsg(e.target.value)} placeholder="How do I improve my health score?" style={{ flex: 1, padding: '0.8rem 1rem', border: 'none', background: 'transparent', outline: 'none', color: 'var(--text-primary)', fontSize: '0.85rem' }} />
                            <button type="submit" style={{ padding: '0 1.2rem', background: 'transparent', border: 'none', color: 'var(--accent)', fontWeight: 700, cursor: 'pointer' }}>Send</button>
                        </form>
                    </div>
                </Card>
            </div>

          </div>

          <Card style={{ marginTop: '0.5rem' }}>
            <SectionTitle sub="Optimize your filings: Old vs New Regime interactive calculator">India Tax Estimator</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) minmax(350px, 1fr)', gap: '3rem', alignItems: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 4 }}>Annual Income (Gross)</div>
                        <input type="number" min="0" value={taxIncome} onChange={e => setTaxIncome(e.target.value)} 
                            style={{ width: '100%', padding: '0.7rem', borderRadius: 8, border: '1px solid var(--border-default)', background: 'var(--bg-surface)', color: 'var(--text-primary)', boxSizing:'border-box', fontFamily: 'var(--font-mono)' }} />
                    </div>
                    <div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 4 }}>80C Investments (PPF, ELSS, FD - Max ₹1.5L)</div>
                        <input type="number" min="0" value={tax80c} onChange={e => setTax80c(e.target.value)} 
                           style={{ width: '100%', padding: '0.7rem', borderRadius: 8, border: '1px solid var(--border-default)', background: 'var(--bg-surface)', color: 'var(--text-primary)', boxSizing:'border-box', fontFamily: 'var(--font-mono)' }} />
                    </div>
                    <div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 4 }}>80D Health Insurance (Max ₹50k)</div>
                        <input type="number" min="0" value={tax80d} onChange={e => setTax80d(e.target.value)} 
                           style={{ width: '100%', padding: '0.7rem', borderRadius: 8, border: '1px solid var(--border-default)', background: 'var(--bg-surface)', color: 'var(--text-primary)', boxSizing:'border-box', fontFamily: 'var(--font-mono)' }} />
                    </div>
                    <div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 4 }}>Sec 24 Home Loan Interest (Max ₹2L)</div>
                        <input type="number" min="0" value={taxHomeLoan} onChange={e => setTaxHomeLoan(e.target.value)} 
                           style={{ width: '100%', padding: '0.7rem', borderRadius: 8, border: '1px solid var(--border-default)', background: 'var(--bg-surface)', color: 'var(--text-primary)', boxSizing:'border-box', fontFamily: 'var(--font-mono)' }} />
                    </div>
                </div>

                {taxResult && (
                    <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 16, padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1rem', borderBottom: '1px solid var(--border-subtle)' }}>
                            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Old Regime Tax</span>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.4rem', fontWeight: 600, color: taxResult.recommended_regime === 'Old Regime' ? '#10b981' : 'var(--text-muted)' }}>
                                {formatCurrency(taxResult.old_regime_tax, 'INR')}
                            </span>
                        </div>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1rem', borderBottom: '1px solid var(--border-subtle)' }}>
                            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>New Regime Tax</span>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.4rem', fontWeight: 600, color: taxResult.recommended_regime === 'New Regime' ? '#10b981' : 'var(--text-muted)' }}>
                                {formatCurrency(taxResult.new_regime_tax, 'INR')}
                            </span>
                        </div>

                        {taxResult.tax_savings_possible > 0 ? (
                            <div style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', padding: '1rem', borderRadius: 8, textAlign: 'center', fontWeight: 700 }}>
                                Opt for the {taxResult.recommended_regime} to save {formatCurrency(taxResult.tax_savings_possible, 'INR')}!
                            </div>
                        ) : (
                            <div style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', padding: '1rem', borderRadius: 8, textAlign: 'center', fontWeight: 700 }}>
                                Both regimes yield the same tax liability.
                            </div>
                        )}
                    </div>
                )}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
