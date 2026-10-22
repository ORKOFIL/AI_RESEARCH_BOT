'use client';

import { useState } from 'react';
import '../globals.css';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

const mdComponents: Components = {
  h1: ({ node, ...props }) => <h1 style={{ fontSize: '1.6rem', fontWeight: 'bold', margin: '0 0 16px', paddingBottom: '8px', borderBottom: '2px solid #e5e7eb' }} {...props} />,
  h2: ({ node, ...props }) => <h2 style={{ fontSize: '1.3rem', fontWeight: 'bold', margin: '28px 0 12px', paddingBottom: '6px', borderBottom: '1px solid #e5e7eb' }} {...props} />,
  h3: ({ node, ...props }) => <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', margin: '20px 0 8px' }} {...props} />,
  p: ({ node, ...props }) => <p style={{ margin: '0 0 12px' }} {...props} />,
  ul: ({ node, ...props }) => <ul style={{ paddingLeft: '24px', margin: '0 0 12px', listStyle: 'disc' }} {...props} />,
  ol: ({ node, ...props }) => <ol style={{ paddingLeft: '24px', margin: '0 0 12px', listStyle: 'decimal' }} {...props} />,
  li: ({ node, ...props }) => <li style={{ marginBottom: '4px' }} {...props} />,
  a: ({ node, ...props }) => <a style={{ color: '#2563eb', textDecoration: 'underline', wordBreak: 'break-all' }} target="_blank" rel="noreferrer" {...props} />,
  blockquote: ({ node, ...props }) => <blockquote style={{ margin: '0 0 12px', padding: '4px 16px', borderLeft: '4px solid #d1d5db', color: '#4b5563' }} {...props} />,
  code: ({ node, ...props }) => <code style={{ fontFamily: 'monospace', backgroundColor: '#e5e7eb', padding: '1px 5px', borderRadius: '3px', fontSize: '0.9em' }} {...props} />,
  pre: ({ node, ...props }) => <pre style={{ backgroundColor: '#f3f4f6', padding: '12px', borderRadius: '6px', overflowX: 'auto', margin: '0 0 12px' }} {...props} />,
  hr: () => <hr style={{ border: 0, borderTop: '1px solid #e5e7eb', margin: '20px 0' }} />,
  table: ({ node, ...props }) => <div style={{ overflowX: 'auto', margin: '0 0 16px' }}><table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '0.9rem' }} {...props} /></div>,
  th: ({ node, ...props }) => <th style={{ border: '1px solid #d1d5db', padding: '8px 10px', backgroundColor: '#f3f4f6', textAlign: 'left' }} {...props} />,
  td: ({ node, ...props }) => <td style={{ border: '1px solid #d1d5db', padding: '8px 10px', verticalAlign: 'top' }} {...props} />,
};

export default function Page() {

  const [title, setTitle] = useState('');
  const [goal, setGoal] = useState('');
  const [sources, setSources] = useState('');

  const [status, setStatus] = useState<string>('Idle');

  const [stepInfo, setStepInfo] = useState<string[]>([]);

  const [output, setOutput] = useState<string | null>(null);

  async function startPolling(url: string, intervalMs = 3000, taskId: string) {
    let lastStatus = '';
    while (true) {
      try {
        const response = await fetch(url);
        const data = await response.json();

        if (lastStatus !== data.status) {
          lastStatus = data.status;
          setStepInfo((prevSteps) => [...prevSteps, data.status])
          setStatus(data.status)
        }

        if (data.status == 'finished' || data.status == 'ERROR') {
          const response = await fetch(`api/output/${taskId}`);
          const data = await response.json();
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
    try {
      setStepInfo([])
      setOutput(null)
      const res = await fetch('api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', },
        body: JSON.stringify({ title, goal, sources })
      })

      if (!res.ok) {
        throw new Error('Server error');
      }

      const data = await res.json();

      setStatus('pending');
      startPolling(`/api/status/${data.data.taskId}`, 1500, data.data.taskId);
    } catch (error) {
      console.error('Error starting research:', error);
    }
  };
  return (

    <div style={{ padding: '40px 20px', backgroundColor: '#ffffff', color: '#000000', fontFamily: 'sans-serif', minHeight: '100vh', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', gap: '24px', width: '100%', maxWidth: '1100px', margin: '0 auto', alignItems: 'stretch', height: 'calc(100vh - 80px)', minHeight: '720px' }}>

        {/* Ліва панель: Форма */}
        <div style={{ flex: 1, minWidth: 0, border: '2px solid black', padding: '20px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontWeight: 'bold', fontSize: '1.125rem', marginBottom: '16px', marginTop: 0 }}>Створити Дослідження</h3>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', fontWeight: 'bold' }}>Назва</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                style={{ width: '100%', border: '1px solid black', padding: '6px', fontSize: '0.875rem', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ marginBottom: '12px', flex: 1, minHeight: '120px', display: 'flex', flexDirection: 'column' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', fontWeight: 'bold' }}>Що ви зочете дізнатися?</label>
              <textarea
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                style={{ width: '100%', flex: 1, resize: 'none', border: '1px solid black', padding: '6px', fontSize: '0.875rem', boxSizing: 'border-box', fontFamily: 'inherit' }}
              />
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', fontWeight: 'bold' }}>Джерела</label>
              <textarea
                rows={3}
                value={sources}
                onChange={(e) => setSources(e.target.value)}
                style={{ width: '100%', border: '1px solid black', padding: '6px', fontSize: '0.875rem', boxSizing: 'border-box' }}
              />
            </div>

            <button
              onClick={startResearch}
              style={{ cursor: 'pointer', border: '2px solid black', backgroundColor: '#e5e7eb', padding: '6px 16px', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '16px', alignSelf: 'flex-start' }}
            >
              Почати дослідження
            </button>
          </div>

          <div style={{ marginTop: 'auto', borderTop: '2px solid black', paddingTop: '16px', maxHeight: '35%', overflowY: 'auto', flexShrink: 0, boxSizing: 'border-box', fontSize: '0.85rem', lineHeight: '1.4' }}>
            <p style={{ fontWeight: 'bold', margin: '0 0 6px 0' }}>Приклад вводу:</p>
            <p style={{ margin: '0 0 4px 0' }}><strong>Назва:</strong> Дослідження конкурентів SaaS CRM </p>
            <p style={{ margin: '0 0 4px 0' }}><strong>Ціль:</strong>
              Порівняйте вибрані продукти CRM.

              Для кожного продукту знайдіть:
              1. Основна цільова аудиторія
              2. Початкова щомісячна ціна
              3. Основні функції CRM
              4. Важливі інтеграції
              5. Чи доступний безкоштовний пробний або безкоштовний план

              Використовуйте лише інформацію, знайдену на наданих веб-сайтах.
              Не вгадуйте пропущену інформацію.

              Поверніть структуровані дані для кожної компанії та вкажіть URL-адресу джерела для кожного основного твердження.
            </p>
            <p style={{ margin: '0 0 4px 0' }}><strong>Джерела: </strong>
              <a>https://www.hubspot.com/</a><br />
              <a>https://www.pipedrive.com/</a><br />
              <a>https://www.close.com/</a>
            </p>

          </div>
        </div>

        {/* Права панель: Прогрес, а після завершення — Результат */}
        <div style={{ flex: 1, minWidth: 0, border: '2px solid black', padding: '20px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontWeight: 'bold', fontSize: '1.125rem', marginBottom: '16px', marginTop: 0 }}>
            {output ? 'Результат' : 'Відображення прогресу'}
          </h3>

          {output ? (
            <div style={{
              flex: 1,
              minHeight: 0,
              overflowY: 'auto',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              padding: '20px 24px',
              color: '#1f2937',
              backgroundColor: '#fafafa',
              boxSizing: 'border-box',
              fontSize: '0.95rem',
              lineHeight: '1.7'
            }}>
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                {output}
              </ReactMarkdown>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: '16px', border: '1px solid black', padding: '8px 12px', backgroundColor: '#f9fafb', fontSize: '0.875rem' }}>
                <strong>Статус:</strong> <span style={{ color: status === 'finished' || status === 'Researching...' ? '#16a34a' : 'black', fontWeight: 'bold' }}>{status}</span>
              </div>

              <div style={{ fontFamily: 'monospace', fontSize: '0.875rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {stepInfo.map((step, index) => (
                  <div key={index} style={{ color: '#000000' }}>
                    [✓] {step}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
}