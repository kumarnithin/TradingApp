'use client'

import { useState } from 'react'
import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export default function PreTradeQuestionnairePage() {
  const [mode, setMode] = useState<'quick' | 'full' | 'result'>('quick')
  const [questions, setQuestions] = useState<any[]>([])
  const [answers, setAnswers] = useState<Record<string, boolean>>({})
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const loadQuickQuestionnaire = async () => {
    try {
      setLoading(true)
      const res = await axios.get(`${API_URL}/api/v1/pretrade/questionnaire/quick`)
      setQuestions(res.data.quick_checklist.questions)
      setAnswers({})
      setMode('quick')
    } catch (error) {
      console.error('Error loading questionnaire:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadFullQuestionnaire = async () => {
    try {
      setLoading(true)
      const res = await axios.get(`${API_URL}/api/v1/pretrade/questionnaire/full`)
      setQuestions(res.data.questionnaire.questions)
      setAnswers({})
      setMode('full')
    } catch (error) {
      console.error('Error loading questionnaire:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAnswer = (questionId: string, value: boolean) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }))
  }

  const submitAnswers = async () => {
    try {
      setLoading(true)
      const res = await axios.post(`${API_URL}/api/v1/pretrade/evaluate-setup`, null, {
        params: {
          answers: JSON.stringify(answers),
          symbol: 'EUR/USD'
        }
      })
      setResult(res.data.evaluation)
      setMode('result')
    } catch (error) {
      console.error('Error evaluating setup:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '24px', background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', minHeight: '100vh', color: '#fff', fontFamily: 'system-ui' }}>
      {/* Header */}
      <div style={{ borderBottom: '1px solid #334155', paddingBottom: '20px', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 700, margin: '0 0 8px 0', color: '#f1f5f9' }}>📋 Pre-Trade Questionnaire</h1>
        <p style={{ fontSize: '14px', color: '#cbd5e1', margin: 0 }}>Validate your setup before trading</p>
      </div>

      {/* Mode Selection */}
      {mode !== 'result' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '24px' }}>
          <button
            onClick={loadQuickQuestionnaire}
            style={{
              padding: '16px',
              background: mode === 'quick' ? '#3b82f6' : '#1e293b',
              border: '1px solid #334155',
              color: '#fff',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '14px'
            }}
          >
            ⚡ Quick Check (2 min)
          </button>
          <button
            onClick={loadFullQuestionnaire}
            style={{
              padding: '16px',
              background: mode === 'full' ? '#3b82f6' : '#1e293b',
              border: '1px solid #334155',
              color: '#fff',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '14px'
            }}
          >
            📋 Full Analysis (10 min)
          </button>
        </div>
      )}

      {/* Questions */}
      {(mode === 'quick' || mode === 'full') && (
        <div style={{ display: 'grid', gap: '16px', marginBottom: '24px' }}>
          {questions.length > 0 ? (
            questions.map((q, idx) => (
              <div key={idx} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '16px' }}>
                <div style={{ marginBottom: '12px' }}>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: '#f1f5f9', margin: '0 0 4px 0' }}>
                    {q.category_icon} {q.category} - Q{idx + 1}
                  </p>
                  <p style={{ fontSize: '15px', fontWeight: 600, color: '#e2e8f0', margin: '0 0 8px 0' }}>{q.question}</p>
                  <p style={{ fontSize: '12px', color: '#cbd5e1', margin: 0, fontStyle: 'italic' }}>💡 {q.hint}</p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => handleAnswer(q.id, true)}
                    style={{
                      flex: 1,
                      padding: '10px',
                      background: answers[q.id] === true ? '#10b981' : '#0f172a',
                      border: `1px solid ${answers[q.id] === true ? '#10b981' : '#334155'}`,
                      color: '#fff',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: '12px'
                    }}
                  >
                    ✅ Yes
                  </button>
                  <button
                    onClick={() => handleAnswer(q.id, false)}
                    style={{
                      flex: 1,
                      padding: '10px',
                      background: answers[q.id] === false ? '#ef4444' : '#0f172a',
                      border: `1px solid ${answers[q.id] === false ? '#ef4444' : '#334155'}`,
                      color: '#fff',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: '12px'
                    }}
                  >
                    ❌ No
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div style={{ textAlign: 'center', color: '#cbd5e1', padding: '40px' }}>
              {loading ? 'Loading questionnaire...' : 'Select a mode above'}
            </div>
          )}
        </div>
      )}

      {/* Submit Button */}
      {(mode === 'quick' || mode === 'full') && Object.keys(answers).length > 0 && (
        <button
          onClick={submitAnswers}
          disabled={loading}
          style={{
            width: '100%',
            padding: '16px',
            background: '#3b82f6',
            border: 'none',
            color: '#fff',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 700,
            fontSize: '16px',
            marginBottom: '24px'
          }}
        >
          {loading ? 'Evaluating...' : `Submit (${Object.keys(answers).length} answered)`}
        </button>
      )}

      {/* Result View */}
      {mode === 'result' && result && (
        <div style={{ display: 'grid', gap: '16px' }}>
          {/* Main Result Card */}
          <div style={{
            background: result.color === '#10b981' ? 'rgba(16, 185, 129, 0.1)' : result.color === '#f59e0b' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            border: `2px solid ${result.color}`,
            borderRadius: '12px',
            padding: '24px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>
              {result.decision === 'GO' ? '✅' : result.decision === 'CAUTION' ? '⚠️' : '❌'}
            </div>
            <p style={{ fontSize: '28px', fontWeight: 700, color: result.color, margin: '0 0 12px 0' }}>
              {result.score}%
            </p>
            <p style={{ fontSize: '16px', fontWeight: 600, color: '#f1f5f9', margin: '0 0 12px 0' }}>
              {result.decision}
            </p>
            <p style={{ fontSize: '14px', color: '#cbd5e1', margin: 0 }}>
              {result.recommendation}
            </p>
          </div>

          {/* Category Scores */}
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#f1f5f9', marginBottom: '12px' }}>📊 Category Scores</h3>
            {Object.entries(result.category_scores).map(([category, score]: [string, any]) => (
              <div key={category} style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#cbd5e1' }}>{category}</span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: score.score >= 70 ? '#10b981' : score.score >= 50 ? '#f59e0b' : '#ef4444' }}>
                    {score.score}%
                  </span>
                </div>
                <div style={{ width: '100%', height: '4px', background: '#334155', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${score.score}%`,
                    height: '100%',
                    background: score.score >= 70 ? '#10b981' : score.score >= 50 ? '#f59e0b' : '#ef4444',
                    transition: 'width 0.3s ease'
                  }} />
                </div>
              </div>
            ))}
          </div>

          {/* Issues */}
          {result.critical_failures.length > 0 && (
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', borderRadius: '12px', padding: '16px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#ef4444', marginBottom: '8px' }}>🚨 Critical Issues</h3>
              {result.critical_failures.map((issue: string, idx: number) => (
                <p key={idx} style={{ fontSize: '13px', color: '#cbd5e1', margin: '4px 0' }}>• {issue}</p>
              ))}
            </div>
          )}

          {/* Weak Areas */}
          {result.weak_areas.length > 0 && (
            <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid #f59e0b', borderRadius: '12px', padding: '16px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#f59e0b', marginBottom: '8px' }}>⚠️ Weak Areas</h3>
              {result.weak_areas.map((area: string, idx: number) => (
                <p key={idx} style={{ fontSize: '13px', color: '#cbd5e1', margin: '4px 0' }}>• {area}</p>
              ))}
            </div>
          )}

          {/* Summary */}
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '16px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#f1f5f9', marginBottom: '8px' }}>📈 Summary</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', fontSize: '13px' }}>
              <div>
                <span style={{ color: '#cbd5e1' }}>Total Questions:</span>
                <p style={{ fontSize: '16px', fontWeight: 700, color: '#f1f5f9', margin: '4px 0 0 0' }}>
                  {result.answers_summary.total_questions}
                </p>
              </div>
              <div>
                <span style={{ color: '#cbd5e1' }}>Yes Answers:</span>
                <p style={{ fontSize: '16px', fontWeight: 700, color: '#10b981', margin: '4px 0 0 0' }}>
                  {result.answers_summary.total_yes}
                </p>
              </div>
              <div>
                <span style={{ color: '#cbd5e1' }}>Confidence:</span>
                <p style={{ fontSize: '16px', fontWeight: 700, color: '#3b82f6', margin: '4px 0 0 0' }}>
                  {result.tradability.confidence_level}
                </p>
              </div>
              <div>
                <span style={{ color: '#cbd5e1' }}>Tradable:</span>
                <p style={{ fontSize: '16px', fontWeight: 700, color: result.tradability.ready ? '#10b981' : '#ef4444', margin: '4px 0 0 0' }}>
                  {result.tradability.ready ? 'YES' : 'NO'}
                </p>
              </div>
            </div>
          </div>

          {/* Back Button */}
          <button
            onClick={() => { setMode('quick'); setAnswers({}); setResult(null); }}
            style={{
              width: '100%',
              padding: '12px',
              background: '#334155',
              border: 'none',
              color: '#fff',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '14px'
            }}
          >
            ← Start New Questionnaire
          </button>
        </div>
      )}
    </div>
  )
}