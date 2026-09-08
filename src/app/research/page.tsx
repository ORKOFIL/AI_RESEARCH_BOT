'use client';

import { useState } from 'react';
import '../globals.css';
import { supabase } from '@/lib/supabaseClient';

const STEPS = [
  "Planning",
  "Finding sources",
  "Opened 14 websites",
  "Extracted pricing",
  "Compared features",
  "Validating results",
  "Generating report"
];

export default function Page() {
  const [title, setTitle] = useState('');
  const [goal, setGoal] = useState('');
  const [sources, setSources] = useState('');
  const [maxSites, setMaxSites] = useState(20);
  const [outputFormat, setOutputFormat] = useState('');

  const [status, setStatus] = useState<string>('Idle');
  const [currentStep, setCurrentStep] = useState<number>(-1);

  const startResearch = async () => {
    console.log('/n/n/n')
    console.log(title, goal, sources, maxSites, outputFormat)
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw userError || new Error("User not found");
      
      const res = await fetch('api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', },
        body: JSON.stringify({ user, title, goal, sources, maxSites, outputFormat })
      })

      if (!res.ok) {
        throw new Error('Server error');
      }

      const data = await res.json();
      console.log('Research started successfully:', data);

      setStatus('pending');

    } catch (error) {
      console.error('Error starting research:', error);
    }

    // setStatus('Researching...');
    // setCurrentStep(0);

    // let stepIndex = 0;
    // const interval = setInterval(() => {
    //   stepIndex++;
    //   if (stepIndex < STEPS.length) {
    //     setCurrentStep(stepIndex);
    //   } else {
    //     setCurrentStep(STEPS.length);
    //     setStatus('Done.');
    //     clearInterval(interval);
    //   }
    // }, 1000);
  };

  return (
    <div style={{ padding: '40px 20px', backgroundColor: '#ffffff', color: '#000000', fontFamily: 'sans-serif', minHeight: '100vh', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', gap: '24px', width: '100%', maxWidth: '1000px', margin: '0 auto', alignItems: 'stretch' }}>

        {/* Ліва панель: Форма */}
        <div style={{ flex: 1, border: '2px solid black', padding: '20px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontWeight: 'bold', fontSize: '1.125rem', marginBottom: '16px', marginTop: 0 }}>Create Research</h3>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', fontWeight: 'bold' }}>Research title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                style={{ width: '100%', border: '1px solid black', padding: '6px', fontSize: '0.875rem', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', fontWeight: 'bold' }}>What do you want to know?</label>
              <textarea
                rows={3}
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                style={{ width: '100%', border: '1px solid black', padding: '6px', fontSize: '0.875rem', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', fontWeight: 'bold' }}>Target websites</label>
              <textarea
                rows={2}
                value={sources}
                onChange={(e) => setSources(e.target.value)}
                style={{ width: '100%', border: '1px solid black', padding: '6px', fontSize: '0.875rem', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', fontWeight: 'bold' }}>Maximum websites</label>
              <input
                type="number"
                value={maxSites}
                onChange={(e) => setMaxSites(Number(e.target.value))}
                style={{ width: '100%', border: '1px solid black', padding: '6px', fontSize: '0.875rem', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', fontWeight: 'bold' }}>Output format</label>
              <input
                type="text"
                value={outputFormat}
                onChange={(e) => setOutputFormat(e.target.value)}
                style={{ width: '100%', border: '1px solid black', padding: '6px', fontSize: '0.875rem', boxSizing: 'border-box' }}
              />
            </div>

            <button
              onClick={startResearch}
              style={{ cursor: 'pointer', border: '2px solid black', backgroundColor: '#e5e7eb', padding: '6px 16px', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '16px' }}
            >
              Start Research
            </button>
          </div>

          <div style={{ marginTop: 'auto', borderTop: '2px solid black', paddingTop: '16px', height: '175px', boxSizing: 'border-box', fontSize: '0.85rem', lineHeight: '1.4' }}>
            <p style={{ fontWeight: 'bold', margin: '0 0 6px 0' }}>Example:</p>
            <p style={{ margin: '0 0 4px 0' }}><strong>Title:</strong> Instagram CRM market</p>
            <p style={{ margin: '0 0 4px 0' }}><strong>Goal:</strong> Find 20 competing products and compare pricing, features, integrations.</p>
            <p style={{ margin: '0 0 4px 0' }}><strong>Sources:</strong> g2.com, producthunt.com</p>
            <p style={{ margin: '0' }}><strong>Output:</strong> Detailed report</p>
          </div>
        </div>

        {/* Права панель: Прогрес */}
        <div style={{ flex: 1, border: '2px solid black', padding: '20px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontWeight: 'bold', fontSize: '1.125rem', marginBottom: '16px', marginTop: 0 }}>Execution Progress</h3>

            <div style={{ marginBottom: '16px', border: '1px solid black', padding: '8px 12px', backgroundColor: '#f9fafb', fontSize: '0.875rem' }}>
              <strong>Status:</strong> <span style={{ color: status === 'Researching...' ? '#16a34a' : 'black', fontWeight: 'bold' }}>{status}</span>
            </div>

            <div style={{ fontFamily: 'monospace', fontSize: '0.875rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {STEPS.map((step, index) => {
                if (index < currentStep) {
                  return (
                    <div key={index} style={{ color: '#000000' }}>
                      [✓] {step}
                    </div>
                  );
                } else if (index === currentStep) {
                  return (
                    <div key={index} style={{ color: '#16a34a', fontWeight: 'bold' }}>
                      [&gt;] {step}...
                    </div>
                  );
                } else {
                  return (
                    <div key={index} style={{ color: '#9ca3af' }}>
                      [ ] {step}
                    </div>
                  );
                }
              })}
            </div>
          </div>

          <div style={{ marginTop: 'auto', borderTop: '2px solid black', paddingTop: '16px', height: '175px', boxSizing: 'border-box', fontSize: '0.85rem', display: 'flex', flexDirection: 'column' }}>
            <p style={{ fontWeight: 'bold', margin: '0 0 6px 0' }}>Output Preview:</p>
            <div style={{ border: '1px dashed black', padding: '12px', flex: 1, fontFamily: 'monospace', color: '#4b5563', backgroundColor: '#fafafa', boxSizing: 'border-box' }}>
              {status === 'Done.' ? 'Report generated successfully. Ready to download.' : 'Waiting for execution...'}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}