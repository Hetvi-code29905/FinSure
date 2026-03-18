// src/pages/Home.js
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';
import { useAuthStore } from '../store/authStore';
import { FiEye, FiZap, FiAward, FiCalendar, FiCpu, FiPieChart } from 'react-icons/fi';

const FEATURES = [
  {
    icon: <FiEye />,
    title: 'AI Savings Predictor',
    desc: 'Set a savings target, and our ML models analyze your 90-day spending history to predict if you can hit it, telling you exactly where to cut back.',
    color: '#8b5cf6'
  },
  {
    icon: <FiZap />,
    title: 'Anomaly Detection',
    desc: 'Real-time Isolation Forest ML catches unusual transactions and "lifestyle creep" before they wreck your budget.',
    color: '#ef4444'
  },
  {
    icon: <FiAward />,
    title: 'Financial XP & Quests',
    desc: 'Level up your financial health score. Complete customized quests like "Lower Debt" to increase your rank and Master your money.',
    color: '#10b981'
  },
  {
    icon: <FiCalendar />,
    title: 'EMI & Sub Tracker',
    desc: 'Keep a tight leash on loans and unused subscriptions. Everything syncs perfectly to your interactive payments calendar.',
    color: '#3b82f6'
  },
  {
    icon: <FiCpu />,
    title: 'Finsure Buddy',
    desc: 'Your personalized AI financial assistant is always ready to answer questions about your health score, net worth, and tax regimes.',
    color: '#f59e0b'
  },
  {
    icon: <FiPieChart />,
    title: '50/30/20 Buckets',
    desc: 'Visually track exactly where your Wants, Needs, and Savings are going using an intuitive UI with live predictive drift analysis.',
    color: '#ec4899'
  }
];

export default function Home() {
  const { isAuthenticated } = useAuthStore();
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', color: 'var(--text-primary)', overflowX: 'hidden' }}>

      {/* Floating Header */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '1.25rem 2.5rem',
        background: scrollY > 50 ? 'rgba(10, 10, 10, 0.85)' : 'transparent',
        backdropFilter: scrollY > 50 ? 'blur(12px)' : 'none',
        borderBottom: scrollY > 50 ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid transparent',
        transition: 'all 0.3s ease'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ 
            width: 32, height: 32, borderRadius: 8, 
            background: 'linear-gradient(135deg, var(--accent) 0%, #3b82f6 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 900, fontSize: '1.2rem'
          }}>
            F
          </div>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.5rem', letterSpacing: '-0.03em' }}>
            Finsure
          </span>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem' }}>
          {isAuthenticated ? (
            <Link to="/dashboard">
              <Button variant="primary" size="sm" style={{ boxShadow: '0 4px 14px 0 rgba(99,102,241,0.39)' }}>
                Return to Dashboard
              </Button>
            </Link>
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost" size="sm" style={{ color: 'var(--text-secondary)' }}>Sign in</Button>
              </Link>
              <Link to="/register">
                <Button variant="primary" size="sm" style={{ boxShadow: '0 4px 14px 0 rgba(99,102,241,0.39)', background: 'linear-gradient(135deg, var(--accent) 0%, #3b82f6 100%)', border: 'none' }}>
                  Get Started
                </Button>
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section style={{ 
        position: 'relative',
        minHeight: '100vh',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '6rem 2rem 5rem', 
        textAlign: 'center',
        overflow: 'hidden'
      }}>
        {/* Dynamic Background Elements */}
        <div style={{
          position: 'absolute', top: '20%', left: '15%', width: 400, height: 400,
          background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, rgba(99,102,241,0) 70%)',
          borderRadius: '50%', filter: 'blur(60px)', zIndex: 0,
          transform: `translateY(${scrollY * 0.2}px)`
        }} />
        <div style={{
          position: 'absolute', bottom: '10%', right: '15%', width: 350, height: 350,
          background: 'radial-gradient(circle, rgba(59,130,246,0.12) 0%, rgba(59,130,246,0) 70%)',
          borderRadius: '50%', filter: 'blur(50px)', zIndex: 0,
          transform: `translateY(${scrollY * -0.15}px)`
        }} />

        <div style={{ position: 'relative', zIndex: 10, maxWidth: 900 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.6rem',
            padding: '0.4rem 1rem', borderRadius: '99px',
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)',
            marginBottom: '2rem', backdropFilter: 'blur(10px)',
            boxShadow: '0 4px 24px -1px rgba(0,0,0,0.2)'
          }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#3b82f6', boxShadow: '0 0 10px #3b82f6' }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              AI-Powered Financial Intelligence
            </span>
          </div>

          <h1 style={{ 
            fontSize: 'clamp(3rem, 8vw, 5.5rem)', 
            lineHeight: 1.05, 
            marginBottom: '1.5rem', 
            letterSpacing: '-0.04em',
            fontWeight: 800
          }}>
            Know your <br />
            <span style={{ 
              background: 'linear-gradient(135deg, var(--accent) 0%, #60a5fa 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              paddingRight: '0.1em'
            }}>
              financial future
            </span><br />
            before it happens.
          </h1>

          <p style={{ 
            fontSize: '1.15rem', color: 'var(--text-secondary)', maxWidth: 650, 
            margin: '0 auto 3rem', lineHeight: 1.6 
          }}>
            Finsure tracks your EMIs, catches lifestyle creep in real-time with ML, predicts your custom saving targets, and gives you actionable steps to build lasting wealth.
          </p>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            {isAuthenticated ? (
              <Link to="/dashboard">
                <Button size="lg" style={{ 
                  background: 'var(--text-primary)', color: 'var(--bg-base)', border: 'none',
                  padding: '1rem 2rem', fontSize: '1.1rem', borderRadius: 12
                }}>
                  Enter the Dashboard
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/register">
                  <Button size="lg" style={{ 
                    background: 'var(--text-primary)', color: 'var(--bg-base)', border: 'none',
                    padding: '1rem 2rem', fontSize: '1.1rem', borderRadius: 12,
                    boxShadow: '0 10px 30px -10px rgba(255,255,255,0.3)'
                  }}>
                    Create Free Account →
                  </Button>
                </Link>
                <Link to="/login">
                  <Button variant="secondary" size="lg" style={{ 
                    padding: '1rem 2rem', fontSize: '1.1rem', borderRadius: 12 
                  }}>
                    Sign in
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
        
        {/* Scroll Indicator */}
        <div style={{ position: 'absolute', bottom: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', opacity: scrollY > 100 ? 0 : 0.6, transition: 'opacity 0.3s' }}>
            <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Scroll to explore</span>
            <div style={{ width: 1, height: 40, background: 'linear-gradient(to bottom, var(--text-primary) 0%, transparent 100%)' }} />
        </div>
      </section>

      {/* Deep Dive Features */}
      <section style={{ padding: '6rem 2rem', background: 'var(--bg-surface)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <h2 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '1rem' }}>Built for total financial clarity</h2>
            <p style={{ color: 'var(--text-secondary)', maxWidth: 600, margin: '0 auto', fontSize: '1.1rem', lineHeight: 1.6 }}>
              We threw away ancient generic tables. Say hello to predictive AI agents, proactive alerts, and deep data analysis.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
            {FEATURES.map((feature, i) => (
              <div key={i} style={{
                background: 'var(--bg-elevated)',
                padding: '2rem',
                borderRadius: 24,
                border: '1px solid var(--border-subtle)',
                transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                cursor: 'default',
                display: 'flex', flexDirection: 'column',
                gap: '1rem',
                transform: `translateY(${Math.max(0, 50 - scrollY * 0.1)}px)`,
                opacity: Math.min(1, scrollY * 0.005)
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-5px)';
                e.currentTarget.style.boxShadow = `0 10px 40px -10px ${feature.color}40`;
                e.currentTarget.style.borderColor = feature.color;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = `translateY(0)`;
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.borderColor = 'var(--border-subtle)';
              }}
              >
                <div style={{ 
                  width: 54, height: 54, borderRadius: 16, 
                  background: `${feature.color}15`, color: feature.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.8rem', border: `1px solid ${feature.color}30`
                }}>
                  {feature.icon}
                </div>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 700, margin: 0 }}>{feature.title}</h3>
                <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '0.95rem', margin: 0 }}>
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section style={{ padding: '8rem 2rem', position: 'relative', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          width: '100%', maxWidth: 800, height: 400,
          background: 'radial-gradient(ellipse, rgba(59,130,246,0.15) 0%, rgba(59,130,246,0) 70%)',
          zIndex: 0
        }} />
        
        <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 10 }}>
          <h2 style={{ fontSize: '3.5rem', fontWeight: 800, marginBottom: '1.5rem', lineHeight: 1.1, letterSpacing: '-0.03em' }}>
            Ready to beat inflation?
          </h2>
          <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', marginBottom: '3rem' }}>
            Join Finsure today and completely rethink the way you budget.
          </p>
          <Link to={isAuthenticated ? "/dashboard" : "/register"}>
            <Button size="lg" style={{ 
              background: 'linear-gradient(135deg, var(--accent) 0%, #3b82f6 100%)', border: 'none',
              padding: '1.2rem 3rem', fontSize: '1.2rem', borderRadius: 16, fontWeight: 700,
              boxShadow: '0 10px 30px -10px rgba(59,130,246,0.4)'
            }}>
              {isAuthenticated ? "Return to Dashboard" : "Create Free Account"}
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ 
        padding: '3rem 2rem', 
        borderTop: '1px solid var(--border-subtle)',
        textAlign: 'center',
        background: 'var(--bg-elevated)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.2rem', letterSpacing: '-0.02em', color: 'var(--text-secondary)' }}>Finsure</span>
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          © {new Date().getFullYear()} Finsure Inc. All rights reserved. Not actual financial advice.
        </p>
      </footer>

    </div>
  );
}