'use client';

import { useState } from 'react';
import '../globals.css';
import { supabase } from '@/lib/supabaseClient';
import ReactMarkdown from 'react-markdown';

// const STEPS = [
//   "Planning",
//   "Finding sources",
//   "Opened 14 websites",
//   "Extracted pricing",
//   "Compared features",
//   "Validating results",
//   "Generating report"
// ];

export default function Page() {

  const [title, setTitle] = useState('');
  const [goal, setGoal] = useState('');
  const [sources, setSources] = useState('');

  const [status, setStatus] = useState<string>('Idle');
  //const [currentStep, setCurrentStep] = useState<number>(-1);

  const [stepInfo, setStepInfo] = useState<string[]>([]);

  const [output, setOutput] = useState<string | null>(null);

  async function startPolling(url: string, intervalMs = 3000, taskId: string) {
    let lastStatus = '';
    while (true) {
      try {
        const response = await fetch(url);
        const data = await response.json();
        console.log('Отримані дані:', data.status);

        if (lastStatus !== data.status) {
          lastStatus = data.status;
          setStepInfo((prevSteps) => [...prevSteps, data.status])
          setStatus(data.status)
        }

        if (data.status == 'finished' || data.status == 'ERROR') {
          const response = await fetch(`api/output/${taskId}`);
          const data = await response.json();
          console.log('Отримані дані:', data.output);
          setOutput(data.output)
          break;
        }
      } catch (error) {
        console.error('Помилка під час polling:', error);
        setStatus('ERROR')
      }

      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }

  const startResearch = async () => {
    console.log('/n/n/n')
    console.log(title, goal, sources)
    try {

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw userError || new Error("User not found");
      setStepInfo([])
      setOutput(null)
      const res = await fetch('api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', },
        body: JSON.stringify({ user, title, goal, sources })
      })

      if (!res.ok) {
        throw new Error('Server error');
      }

      const data = await res.json();
      console.log('Research started successfully:', data);

      setStatus('pending');
      startPolling(`/api/status/${data.data.taskId}`, 1500, data.data.taskId);
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

            <button
              onClick={startResearch}
              style={{ cursor: 'pointer', border: '2px solid black', backgroundColor: '#e5e7eb', padding: '6px 16px', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '16px' }}
            >
              Start Research
            </button>
          </div>

          <div style={{ marginTop: 'auto', borderTop: '2px solid black', paddingTop: '16px', height: '230px', boxSizing: 'border-box', fontSize: '0.85rem', lineHeight: '1.4' }}>
            <p style={{ fontWeight: 'bold', margin: '0 0 6px 0' }}>Example:</p>
            <p style={{ margin: '0 0 4px 0' }}><strong>Title:</strong> SaaS CRM Competitor Research</p>
            <p style={{ margin: '0 0 4px 0' }}><strong>Goal:</strong>
              Compare the selected CRM products.

              For each product, find:
              1. Main target audience
              2. Starting monthly price
              3. Main CRM features
              4. Important integrations
              5. Whether a free trial or free plan is available

              Use only information found on the provided websites.
              Do not guess missing information.

              Return structured data for each company and include the source URL for every major claim.
            </p>
            <p style={{ margin: '0 0 4px 0' }}><strong>Sources:</strong> https://www.hubspot.com/
              https://www.pipedrive.com/
              https://www.close.com/</p>
          </div>
        </div>

        {/* Права панель: Прогрес та Результат */}
      <div style={{ flex: 1, border: '2px solid black', padding: '20px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1 }}>
          <h3 style={{ fontWeight: 'bold', fontSize: '1.125rem', marginBottom: '16px', marginTop: 0 }}>Execution Progress</h3>

          <div style={{ marginBottom: '16px', border: '1px solid black', padding: '8px 12px', backgroundColor: '#f9fafb', fontSize: '0.875rem' }}>
            <strong>Status:</strong> <span style={{ color: status === 'finished' || status === 'Researching...' ? '#16a34a' : 'black', fontWeight: 'bold' }}>{status}</span>
          </div>

          <div style={{ fontFamily: 'monospace', fontSize: '0.875rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {stepInfo.map((step, index) => (
              <div key={index} style={{ color: '#000000' }}>
                [✓] {step}
              </div>
            ))}
          </div>
        </div>

        {/* Фіксований контейнер для виводу з підтримкою скролу та Markdown */}
        <div style={{ marginTop: 'auto', borderTop: '2px solid black', paddingTop: '16px', height: '250px', boxSizing: 'border-box', fontSize: '0.85rem', display: 'flex', flexDirection: 'column' }}>
          <p style={{ fontWeight: 'bold', margin: '0 0 6px 0' }}>Output Preview:</p>
          <div style={{
            border: '1px dashed black',
            padding: '12px',
            flex: 1,
            color: '#1f2937',
            backgroundColor: '#fafafa',
            boxSizing: 'border-box',
            overflowY: 'auto', // 👈 Вмикає прокрутку в середині рамочки
            fontSize: '0.85rem',
            lineHeight: '1.5'
          }}>
            {output ? (
              <ReactMarkdown
                components={{
                  // Кастомна стилізація елементів всередині Markdown
                  h3: ({ node, ...props }) => <h3 style={{ fontSize: '1rem', fontWeight: 'bold', marginTop: '12px', marginBottom: '6px' }} {...props} />,
                  ul: ({ node, ...props }) => <ul style={{ paddingLeft: '18px', marginTop: '4px', marginBottom: '8px' }} {...props} />,
                  li: ({ node, ...props }) => <li style={{ marginBottom: '2px' }} {...props} />,
                  a: ({ node, ...props }) => <a style={{ color: '#2563eb', textDecoration: 'underline' }} target="_blank" rel="noreferrer" {...props} />
                }}
              >
                {output}
              </ReactMarkdown>
            ) : (
              <span style={{ color: '#9ca3af', fontFamily: 'monospace' }}>Waiting for execution...</span>
            )}
          </div>
        </div>
      </div>

      </div>
    </div>
  );
}