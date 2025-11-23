'use client'

import { useEffect, useState } from 'react'
import axios from 'axios'
import logger from '../../../utils/logger'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
const USER_ID = 'user123'

interface Question {
  id: string
  question: string
  weight: number
}

interface Template {
  id: string
  strategy_name: string
  strategy_type: string
  description: string
  questions: Question[]
  is_favorite: boolean
  usage_count: number
  question_count: number
}

interface Analytics {
  total_validations: number
  go_decisions: number
  high_discipline_validations: number
  adherence_rate: number
  average_discipline_score: number
  median_discipline_score: number
  best_emotional_state: string
  emotional_distribution: Record<string, number>
  recommendation: string
}

export default function TradingDisciplinePage() {
  const [activeTab, setActiveTab] = useState<'templates' | 'validate' | 'create' | 'analytics'>('templates')
  const [templates, setTemplates] = useState<Template[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [createForm, setCreateForm] = useState({
    strategy_name: '',
    strategy_type: 'scalping',
    description: '',
    questions: [{ id: '1', question: '', weight: 8 }]
  })

  const [validateForm, setValidateForm] = useState({
    questionnaire_score: 50,
    decision: 'GO',
    emotional_state: 'neutral'
  })

  const emotionalStates = [
    { id: 'focused', emoji: '🎯', label: 'Focused' },
    { id: 'calm', emoji: '🧘', label: 'Calm' },
    { id: 'neutral', emoji: '😐', label: 'Neutral' },
    { id: 'anxious', emoji: '😰', label: 'Anxious' },
    { id: 'overconfident', emoji: '😎', label: 'Overconfident' },
    { id: 'frustrated', emoji: '😤', label: 'Frustrated' },
    { id: 'tired', emoji: '😴', label: 'Tired' }
  ]

  const fetchTemplates = async () => {
    try {
      setLoading(true)
      const response = await axios.get(
        `${API_URL}/api/v1/trading-discipline/templates/list`,
        { params: { user_id: USER_ID } }
      )
      setTemplates(response.data.templates || [])
      setError('')
    } catch (err) {
      logger.error('Error fetching templates:', err)
      setError('Failed to fetch templates')
    } finally {
      setLoading(false)
    }
  }

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      const response = await axios.get(
        `${API_URL}/api/v1/trading-discipline/statistics`,
        { params: { user_id: USER_ID, days: 30 } }
      )
      setAnalytics(response.data.statistics)
      setError('')
    } catch (err) {
      logger.error('Error fetching analytics:', err)
      setError('Failed to fetch analytics')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setLoading(true)
      const questions = createForm.questions.filter(q => q.question.trim())
      if (!questions.length) {
        setError('Please add at least one question')
        return
      }

      const params = new URLSearchParams({
        user_id: USER_ID,
        strategy_name: createForm.strategy_name,
        strategy_type: createForm.strategy_type,
        description: createForm.description,
        questions: JSON.stringify(questions)
      })

      await axios.post(
        `${API_URL}/api/v1/trading-discipline/templates/save?${params.toString()}`
      )

      setSuccess('Template created successfully!')
      setCreateForm({
        strategy_name: '',
        strategy_type: 'scalping',
        description: '',
        questions: [{ id: '1', question: '', weight: 8 }]
      })
      await fetchTemplates()
      setTimeout(() => {
        setActiveTab('templates')
        setSuccess('')
      }, 1500)
    } catch (err) {
      const e = err as { response?: { data?: { detail?: string } }; message?: string }
      logger.error('Error:', e)
      setError(e.response?.data?.detail || e.message || 'Failed to create template')
    } finally {
      setLoading(false)
    }
  }

  const handleValidateTrade = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTemplate) {
      setError('Please select a template')
      return
    }

    try {
      setLoading(true)
      const params = new URLSearchParams({
        user_id: USER_ID,
        template_id: selectedTemplate.id,
        strategy_name: selectedTemplate.strategy_name,
        questionnaire_score: validateForm.questionnaire_score.toString(),
        decision: validateForm.decision,
        emotional_state: validateForm.emotional_state,
        answers: '{}'
      })

      const response = await axios.post(
        `${API_URL}/api/v1/trading-discipline/validate-trade?${params.toString()}`
      )

      const score = response.data.discipline_score?.final_discipline_score?.toFixed(1) || '0'
      setSuccess(`✅ Trade validated! Discipline Score: ${score}`)
      setValidateForm({
        questionnaire_score: 50,
        decision: 'GO',
        emotional_state: 'neutral'
      })
      
      // Refresh analytics
      setTimeout(() => fetchAnalytics(), 500)
      
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      const e = err as { response?: { data?: { detail?: string } }; message?: string }
      logger.error('Error:', e)
      setError(e.response?.data?.detail || e.message || 'Failed to validate trade')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTemplates()
    fetchAnalytics()
  }, [])

  return (
    <div style={{ padding: '20px', background: '#0f172a', minHeight: '100vh', color: '#fff' }}>
      {/* Header */}
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: 0 }}>📊 Trading Discipline</h1>
        <p style={{ color: '#aaa', marginTop: '5px' }}>Create templates, validate trades & track discipline</p>
      </div>

      {/* Messages */}
      {error && (
        <div style={{
          background: '#dc2626',
          color: '#fff',
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          ❌ {error}
        </div>
      )}

      {success && (
        <div style={{
          background: '#10b981',
          color: '#fff',
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          {success}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '1px solid #334155' }}>
        {['templates', 'validate', 'create', 'analytics'].map(tab => (
          <button
            key={tab}
            onClick={() => {
              setError('')
              setActiveTab(tab as unknown)
            }}
            style={{
              padding: '12px 24px',
              background: activeTab === tab ? '#3b82f6' : 'transparent',
              border: 'none',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: activeTab === tab ? '600' : '400',
              borderBottom: activeTab === tab ? '2px solid #3b82f6' : 'none'
            }}
          >
            {tab === 'templates' && '📋 Templates'}
            {tab === 'validate' && '✅ Validate'}
            {tab === 'create' && '➕ Create'}
            {tab === 'analytics' && '📈 Analytics'}
          </button>
        ))}
      </div>

      {/* TEMPLATES TAB */}
      {activeTab === 'templates' && (
        <div>
          <button
            onClick={fetchTemplates}
            style={{
              marginBottom: '20px',
              padding: '10px 20px',
              background: '#3b82f6',
              border: 'none',
              color: '#fff',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            🔄 Refresh
          </button>

          {loading ? (
            <p>Loading...</p>
          ) : templates.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#aaa', padding: '40px' }}>
              <p>No templates yet. Create one to get started!</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
              {templates.map(template => (
                <div
                  key={template.id}
                  style={{
                    background: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    padding: '20px'
                  }}
                >
                  <h3 style={{ margin: '0 0 10px 0', fontSize: '18px' }}>{template.strategy_name}</h3>
                  <p style={{ color: '#aaa', margin: '5px 0', fontSize: '13px' }}>
                    📍 {template.strategy_type} • {template.question_count} questions
                  </p>
                  <p style={{ color: '#aaa', margin: '5px 0', fontSize: '13px' }}>
                    ✅ Used {template.usage_count} times
                  </p>
                  {template.description && (
                    <p style={{ color: '#bbb', margin: '10px 0 0 0', fontSize: '13px' }}>
                      {template.description}
                    </p>
                  )}
                  <button
                    onClick={() => {
                      setSelectedTemplate(template)
                      setActiveTab('validate')
                    }}
                    style={{
                      marginTop: '15px',
                      padding: '8px 16px',
                      background: '#3b82f6',
                      border: 'none',
                      color: '#fff',
                      borderRadius: '5px',
                      cursor: 'pointer',
                      width: '100%'
                    }}
                  >
                    Use This Template →
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* VALIDATE TAB */}
      {activeTab === 'validate' && (
        <div style={{ maxWidth: '500px' }}>
          <form onSubmit={handleValidateTrade}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                📋 Select Template
              </label>
              <select
                value={selectedTemplate?.id || ''}
                onChange={(e) => {
                  const t = templates.find(t => t.id === e.target.value)
                  setSelectedTemplate(t || null)
                }}
                style={{
                  width: '100%',
                  padding: '10px',
                  background: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '5px',
                  color: '#fff',
                  fontSize: '14px'
                }}
              >
                <option value="">-- Select --</option>
                {templates.map(t => (
                  <option key={t.id} value={t.id}>{t.strategy_name}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                📊 Questionnaire Score: {validateForm.questionnaire_score}
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={validateForm.questionnaire_score}
                onChange={(e) => setValidateForm({ ...validateForm, questionnaire_score: Number(e.target.value) })}
                style={{ width: '100%' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#aaa' }}>
                <span>0</span>
                <span>50</span>
                <span>100</span>
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>🎯 Decision</label>
              <select
                value={validateForm.decision}
                onChange={(e) => setValidateForm({ ...validateForm, decision: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px',
                  background: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '5px',
                  color: '#fff'
                }}
              >
                <option value="GO">✅ GO - Execute</option>
                <option value="CAUTION">⚠️ CAUTION - Be Careful</option>
                <option value="NO-GO">❌ NO-GO - Skip</option>
              </select>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '12px', fontWeight: '500' }}>😊 Emotional State</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', gap: '8px' }}>
                {emotionalStates.map(state => (
                  <button
                    key={state.id}
                    type="button"
                    onClick={() => setValidateForm({ ...validateForm, emotional_state: state.id })}
                    style={{
                      padding: '10px',
                      background: validateForm.emotional_state === state.id ? '#3b82f6' : '#1e293b',
                      border: `1px solid ${validateForm.emotional_state === state.id ? '#3b82f6' : '#334155'}`,
                      borderRadius: '5px',
                      color: '#fff',
                      cursor: 'pointer',
                      fontSize: '12px',
                      transition: 'all 0.2s'
                    }}
                  >
                    {state.emoji} {state.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !selectedTemplate}
              style={{
                width: '100%',
                padding: '12px',
                background: '#10b981',
                border: 'none',
                color: '#fff',
                borderRadius: '5px',
                cursor: 'pointer',
                fontWeight: '600',
                opacity: loading || !selectedTemplate ? 0.5 : 1
              }}
            >
              {loading ? '⏳ Validating...' : '✅ Validate Trade'}
            </button>
          </form>
        </div>
      )}

      {/* CREATE TAB */}
      {activeTab === 'create' && (
        <div style={{ maxWidth: '500px' }}>
          <form onSubmit={handleCreateTemplate}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Strategy Name *</label>
              <input
                type="text"
                value={createForm.strategy_name}
                onChange={(e) => setCreateForm({ ...createForm, strategy_name: e.target.value })}
                placeholder="e.g., EUR/USD Scalping"
                required
                style={{
                  width: '100%',
                  padding: '10px',
                  background: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '5px',
                  color: '#fff',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Strategy Type *</label>
              <select
                value={createForm.strategy_type}
                onChange={(e) => setCreateForm({ ...createForm, strategy_type: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px',
                  background: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '5px',
                  color: '#fff',
                  boxSizing: 'border-box'
                }}
              >
                <option value="scalping">Scalping</option>
                <option value="day-trading">Day Trading</option>
                <option value="swing">Swing Trading</option>
                <option value="breakout">Breakout</option>
                <option value="trend">Trend Following</option>
              </select>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Description</label>
              <textarea
                value={createForm.description}
                onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                placeholder="Describe your strategy..."
                style={{
                  width: '100%',
                  padding: '10px',
                  background: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '5px',
                  color: '#fff',
                  minHeight: '80px',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>📋 Questions *</label>
              {createForm.questions.map((q, idx) => (
                <input
                  key={idx}
                  type="text"
                  value={q.question}
                  onChange={(e) => {
                    const newQ = [...createForm.questions]
                    newQ[idx].question = e.target.value
                    setCreateForm({ ...createForm, questions: newQ })
                  }}
                  placeholder={`Question ${idx + 1}...`}
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '5px',
                    color: '#fff',
                    marginBottom: '8px',
                    boxSizing: 'border-box'
                  }}
                />
              ))}
              <button
                type="button"
                onClick={() => {
                  const newId = (parseInt(createForm.questions[createForm.questions.length - 1].id) + 1).toString()
                  setCreateForm({
                    ...createForm,
                    questions: [...createForm.questions, { id: newId, question: '', weight: 8 }]
                  })
                }}
                style={{
                  padding: '8px 16px',
                  background: '#334155',
                  border: 'none',
                  color: '#fff',
                  borderRadius: '5px',
                  cursor: 'pointer'
                }}
              >
                + Add Question
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px',
                background: '#3b82f6',
                border: 'none',
                color: '#fff',
                borderRadius: '5px',
                cursor: 'pointer',
                fontWeight: '600',
                opacity: loading ? 0.5 : 1
              }}
            >
              {loading ? '⏳ Creating...' : '➕ Create Template'}
            </button>
          </form>
        </div>
      )}

      {/* ANALYTICS TAB */}
      {activeTab === 'analytics' && (
        <div>
          <button
            onClick={fetchAnalytics}
            style={{
              marginBottom: '20px',
              padding: '10px 20px',
              background: '#3b82f6',
              border: 'none',
              color: '#fff',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            🔄 Refresh Analytics
          </button>

          {loading ? (
            <p>Loading...</p>
          ) : !analytics || analytics.total_validations === 0 ? (
            <div style={{ textAlign: 'center', color: '#aaa', padding: '40px' }}>
              <p>No data yet. Validate some trades first!</p>
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px' }}>
                <div style={{ background: '#1e293b', padding: '15px', borderRadius: '8px', border: '1px solid #334155' }}>
                  <div style={{ color: '#aaa', fontSize: '12px' }}>Total Validations</div>
                  <div style={{ fontSize: '28px', fontWeight: 'bold', marginTop: '8px' }}>{analytics.total_validations}</div>
                </div>

                <div style={{ background: '#1e293b', padding: '15px', borderRadius: '8px', border: '1px solid #334155' }}>
                  <div style={{ color: '#aaa', fontSize: '12px' }}>GO Decisions</div>
                  <div style={{ fontSize: '28px', fontWeight: 'bold', marginTop: '8px' }}>{analytics.go_decisions}</div>
                </div>

                <div style={{ background: '#1e293b', padding: '15px', borderRadius: '8px', border: '1px solid #334155' }}>
                  <div style={{ color: '#aaa', fontSize: '12px' }}>Avg Discipline Score</div>
                  <div style={{ fontSize: '28px', fontWeight: 'bold', marginTop: '8px' }}>
                    {analytics.average_discipline_score.toFixed(1)}
                  </div>
                </div>

                <div style={{ background: '#1e293b', padding: '15px', borderRadius: '8px', border: '1px solid #334155' }}>
                  <div style={{ color: '#aaa', fontSize: '12px' }}>Adherence Rate</div>
                  <div style={{ fontSize: '28px', fontWeight: 'bold', marginTop: '8px' }}>
                    {analytics.adherence_rate.toFixed(1)}%
                  </div>
                </div>

                <div style={{ background: '#1e293b', padding: '15px', borderRadius: '8px', border: '1px solid #334155' }}>
                  <div style={{ color: '#aaa', fontSize: '12px' }}>High Discipline (≥80)</div>
                  <div style={{ fontSize: '28px', fontWeight: 'bold', marginTop: '8px' }}>
                    {analytics.high_discipline_validations}
                  </div>
                </div>

                <div style={{ background: '#1e293b', padding: '15px', borderRadius: '8px', border: '1px solid #334155' }}>
                  <div style={{ color: '#aaa', fontSize: '12px' }}>Best Emotional State</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', marginTop: '8px' }}>
                    {emotionalStates.find(e => e.id === analytics.best_emotional_state)?.emoji} {analytics.best_emotional_state}
                  </div>
                </div>
              </div>

              {analytics.recommendation && (
                <div style={{
                  background: '#1e293b',
                  padding: '15px',
                  borderRadius: '8px',
                  border: '1px solid #334155'
                }}>
                  <div style={{ color: '#aaa', fontSize: '12px', marginBottom: '8px' }}>💡 Recommendation</div>
                  <p style={{ margin: 0 }}>{analytics.recommendation}</p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}