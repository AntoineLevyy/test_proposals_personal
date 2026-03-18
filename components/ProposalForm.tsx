'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { slugify } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Step {
  id: string
  label: string
  // Message Spec
  step_message: string
  template_name: string
  send_timing: string
  primary_kpi: string
  secondary_kpis: string
  guardrails: string
  // Personalization
  seg_1: string
  seg_2: string
  seg_3: string
  // Creative Strategy
  strategic_angle: string
  claims: string
  proof_assets: string
  message_structure: string
}

const EMPTY_STEP: Omit<Step, 'id' | 'label'> = {
  step_message: '', template_name: '', send_timing: '',
  primary_kpi: '', secondary_kpis: '', guardrails: '',
  seg_1: '', seg_2: '', seg_3: '',
  strategic_angle: '', claims: '', proof_assets: '', message_structure: '',
}

function newStep(index: number): Step {
  return { id: crypto.randomUUID(), label: `Message ${index + 1}`, ...EMPTY_STEP }
}

interface ProposalFormProps {
  mode: 'new' | 'edit'
  initialData: Record<string, unknown>
  onSave: (data: Record<string, unknown>) => void
  onDelete?: () => void
  saving: boolean
  saveError: string
  saveStatus?: 'idle' | 'saved' | 'saving' | 'error'
}

// ─── Field components (defined OUTSIDE ProposalForm to prevent remount) ───────

interface FieldProps {
  label: string; placeholder?: string; optional?: boolean
  value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}
function Field({ label, placeholder, optional, value, onChange }: FieldProps) {
  return (
    <div className="form-group">
      <label className="form-label">
        {label}{optional && <span className="optional">(optional)</span>}
      </label>
      <input type="text" className="form-input" placeholder={placeholder} value={value} onChange={onChange} />
    </div>
  )
}

interface TextAreaProps {
  label: string; placeholder?: string; optional?: boolean
  value: string; onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
}
function TextArea({ label, placeholder, optional, value, onChange }: TextAreaProps) {
  return (
    <div className="form-group">
      <label className="form-label">
        {label}{optional && <span className="optional">(optional)</span>}
      </label>
      <textarea className="form-textarea" placeholder={placeholder} value={value} onChange={onChange} />
    </div>
  )
}

interface SelectProps {
  label: string; options: string[]
  value: string; onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void
}
function Select({ label, options, value, onChange }: SelectProps) {
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <select className="form-input form-select" value={value} onChange={onChange}>
        <option value="">Select KPI…</option>
        {options.map((o) => <option key={o}>{o}</option>)}
      </select>
    </div>
  )
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function SaveIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
    <polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
  </svg>
}
function ArrowLeftIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 12H5M12 19l-7-7 7-7"/>
  </svg>
}
function CheckIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
    <polyline points="20 6 9 17 4 12"/>
  </svg>
}
function TrashIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    <path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>
}
function PlusIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 5v14M5 12h14"/>
  </svg>
}

// ─── Main component ───────────────────────────────────────────────────────────

const PROPOSAL_FIELDS = [
  'test_name', 'flow_name', 'canvas_link', 'entry_trigger', 'entry_rules', 'exit_rules',
  'primary_goal', 'secondary_goals', 'test_direction', 'test_hypothesis',
  'hypothesis_reasons', 'hypothesis_exclusion',
  'expected_learning_1', 'expected_learning_2', 'expected_learning_3',
  'next_test_1', 'next_test_2', 'next_test_3',
]

type ProposalData = Record<string, string>

export default function ProposalForm({
  mode, initialData, onSave, onDelete, saving, saveError, saveStatus = 'idle'
}: ProposalFormProps) {
  const [data, setData] = useState<ProposalData>(() => {
    const d: ProposalData = {}
    for (const f of PROPOSAL_FIELDS) d[f] = (initialData[f] as string) ?? ''
    return d
  })

  const [steps, setSteps] = useState<Step[]>(() => {
    const raw = initialData.steps
    if (Array.isArray(raw) && raw.length > 0) return raw as Step[]
    return [newStep(0)]
  })

  const set = useCallback((key: string) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setData((prev) => ({ ...prev, [key]: e.target.value })), [])

  const setStep = useCallback((id: string, key: keyof Step) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setSteps((prev) => prev.map((s) => s.id === id ? { ...s, [key]: e.target.value } : s)), [])

  const addStep = () => setSteps((prev) => [...prev, newStep(prev.length)])
  const removeStep = (id: string) => setSteps((prev) => prev.filter((s) => s.id !== id))

  const slug = slugify(data.test_name || '')
  const KPI_OPTIONS = ['Clips per User', 'Conversion Rate', 'Click-Through Rate', 'Open Rate', 'Revenue per User', 'Retention Rate']

  function handleSave() {
    onSave({ ...data, steps })
  }

  return (
    <div className="page-proposal">
      <div className="proposal-outer fade-in">

        {/* Header */}
        <div className="proposal-page-header">
          <div className="proposal-page-header-left">
            <div className="proposal-badge">
              <span className="proposal-badge-dot" />
              {mode === 'new' ? 'New Proposal' : 'Edit Proposal'}
              <span className="proposal-badge-dot" />
            </div>
            <h1 className="proposal-page-title">
              {mode === 'new' ? 'Create Test Proposal' : (data.test_name || 'Edit Proposal')}
            </h1>
            <p className="proposal-page-subtitle">
              {mode === 'new' ? 'Fill in the details below to propose a new campaign test.' : 'Update or review this test proposal.'}
            </p>
          </div>
          <div className="proposal-header-actions">
            {saveStatus === 'saved' && <span className="save-status saved"><CheckIcon /> Saved</span>}
            {saveStatus === 'saving' && <span className="save-status saving">Saving…</span>}
            {saveError && <span className="save-status error">{saveError}</span>}
            <Link href="/" className="btn-back"><ArrowLeftIcon /> All Proposals</Link>
            {mode === 'edit' && onDelete && (
              <button className="btn-delete" onClick={() => { if (confirm('Delete this proposal? This cannot be undone.')) onDelete() }} title="Delete proposal">
                <TrashIcon />
              </button>
            )}
            <button className="btn-save" onClick={handleSave} disabled={saving}>
              <SaveIcon />{saving ? 'Saving…' : 'Save Proposal'}
            </button>
          </div>
        </div>

        <div className="proposal-form">

          {/* Test Name */}
          <div className="form-card test-name-card">
            <div className="form-card-header">
              <div className="form-card-icon icon-navy" style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </div>
              <span className="form-card-title">Test Name</span>
            </div>
            <input type="text" className="test-name-input" placeholder="e.g., Behavior-Based Welcome Series"
              value={data.test_name} onChange={set('test_name')} autoFocus={mode === 'new'} />
            {slug && <div className="test-name-slug">/{slug}</div>}
          </div>

          {/* Section 1: Flow Details */}
          <div className="form-card">
            <div className="form-card-header">
              <div className="form-card-icon icon-navy">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/>
                  <path d="M18 9a9 9 0 0 1-9 9"/>
                </svg>
              </div>
              <h2 className="form-card-title">1. Flow Details</h2>
            </div>
            <div className="form-fields">
              <div className="form-row-2">
                <Field label="Flow Name" placeholder="e.g., Behavior-Based Welcome Series" value={data.flow_name} onChange={set('flow_name')} />
                <Field label="Canvas Link" placeholder="https://canvas.neonblue.app/…" value={data.canvas_link} onChange={set('canvas_link')} />
              </div>
              <div className="form-subheader">Triggers &amp; Rules</div>
              <div className="form-row-2">
                <Field label="Entry Trigger" placeholder="Event / property / segment join" value={data.entry_trigger} onChange={set('entry_trigger')} />
                <Field label="Entry Rules" placeholder="Eligibility, exclusions, cooldowns…" value={data.entry_rules} onChange={set('entry_rules')} />
              </div>
              <Field label="Exit Rules" placeholder="What removes them from the flow" value={data.exit_rules} onChange={set('exit_rules')} />
              <div className="form-subheader">Flow Goals</div>
              <div className="form-row-2">
                <Field label="Primary Goal" placeholder="Primary objective" value={data.primary_goal} onChange={set('primary_goal')} />
                <Field label="Secondary Goals" placeholder="Secondary objectives" value={data.secondary_goals} onChange={set('secondary_goals')} />
              </div>
            </div>
          </div>

          {/* Section 3: Testing Goals */}
          <div className="form-card">
            <div className="form-card-header">
              <div className="form-card-icon icon-purple">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
                </svg>
              </div>
              <h2 className="form-card-title">2. Testing Goals</h2>
            </div>
            <div className="form-fields">
              <div className="form-row-2">
                <TextArea label="Overall Test Direction" placeholder="What is the theme of this test? (e.g., Persona differentiation, feature-focus)" value={data.test_direction} onChange={set('test_direction')} />
                <TextArea label="Test Hypothesis" placeholder="What exactly are we trying to test?" value={data.test_hypothesis} onChange={set('test_hypothesis')} />
              </div>
              <div className="form-row-2">
                <TextArea label="Hypothesis Reasons" placeholder="What in previous tests or performance informs this hypothesis?" value={data.hypothesis_reasons} onChange={set('hypothesis_reasons')} />
                <TextArea label="Hypothesis Exclusion" placeholder="What could be misinterpreted as the purpose of this test?" optional value={data.hypothesis_exclusion} onChange={set('hypothesis_exclusion')} />
              </div>
            </div>
          </div>

          {/* Section 3: Results & Learning */}
          <div className="form-card">
            <div className="form-card-header">
              <div className="form-card-icon icon-teal">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                  <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                </svg>
              </div>
              <h2 className="form-card-title">3. Results &amp; Learning Capture</h2>
            </div>
            <div className="form-fields">
              <div className="form-subheader">Expected Learnings</div>
              <div className="form-row-2">
                <Field label="Learning 1" placeholder="Expected Learning 1" value={data.expected_learning_1} onChange={set('expected_learning_1')} />
                <Field label="Learning 2" placeholder="Expected Learning 2" value={data.expected_learning_2} onChange={set('expected_learning_2')} />
              </div>
              <Field label="Learning 3" placeholder="Expected Learning 3" optional value={data.expected_learning_3} onChange={set('expected_learning_3')} />
              <div className="form-subheader">Next Test Proposals</div>
              <div className="form-row-2">
                <Field label="Follow-up Test 1" placeholder="Follow-up test idea" value={data.next_test_1} onChange={set('next_test_1')} />
                <Field label="Follow-up Test 2" placeholder="Follow-up test idea" value={data.next_test_2} onChange={set('next_test_2')} />
              </div>
              <Field label="Follow-up Test 3" placeholder="Follow-up test idea" optional value={data.next_test_3} onChange={set('next_test_3')} />
            </div>
          </div>

          {/* Steps — repeatable: Message Spec + Personalization + Creative Strategy */}
          <div className="steps-section">
            <div className="steps-section-header">
              <div>
                <h2 className="steps-section-title">4. Message Steps</h2>
                <p className="steps-section-subtitle">Add a step for each email, push, or SMS in the flow</p>
              </div>
              <button className="btn-add-step" onClick={addStep}>
                <PlusIcon /> Add Step
              </button>
            </div>

            <div className="steps-list">
              {steps.map((step, i) => (
                <div key={step.id} className="step-card">
                  {/* Step header */}
                  <div className="step-card-header">
                    <div className="step-number">{i + 1}</div>
                    <input
                      type="text"
                      className="step-label-input"
                      value={step.label}
                      onChange={setStep(step.id, 'label')}
                      placeholder="e.g., Email 1, Push 2…"
                    />
                    {steps.length > 1 && (
                      <button className="step-remove-btn" onClick={() => removeStep(step.id)} title="Remove step">
                        <TrashIcon />
                      </button>
                    )}
                  </div>

                  <div className="step-card-body">
                    {/* Message Spec */}
                    <div className="step-section">
                      <div className="step-section-label">
                        <span className="step-section-dot dot-blue" />
                        Message Spec
                      </div>
                      <div className="form-fields">
                        <div className="form-row-2">
                          <Field label="Template" placeholder="Klaviyo/Braze template name" value={step.template_name} onChange={setStep(step.id, 'template_name')} />
                          <Field label="Send Timing" placeholder="e.g., Day 0, +3 days" value={step.send_timing} onChange={setStep(step.id, 'send_timing')} />
                        </div>
                        <div className="form-row-2">
                          <Select label="Primary KPI" options={KPI_OPTIONS} value={step.primary_kpi} onChange={setStep(step.id, 'primary_kpi')} />
                          <Field label="Secondary KPIs" placeholder="Other metrics to watch" value={step.secondary_kpis} onChange={setStep(step.id, 'secondary_kpis')} />
                        </div>
                        <Field label="Guardrails" placeholder="Unsubscribes, churn signals, CS tickets…" value={step.guardrails} onChange={setStep(step.id, 'guardrails')} />
                      </div>
                    </div>

                    {/* Personalization */}
                    <div className="step-section">
                      <div className="step-section-label">
                        <span className="step-section-dot dot-green" />
                        Personalization Strategy
                      </div>
                      <div className="form-fields">
                        <p style={{ margin: '0 0 12px', fontSize: '0.85rem', color: 'var(--beige-text-sec)' }}>Variables being isolated in this step</p>
                        {(['seg_1', 'seg_2', 'seg_3'] as const).map((key, si) => (
                          <div key={key} className="segment-row">
                            <span className="segment-pill">Seg {si + 1}</span>
                            <input type="text" className="form-input" placeholder={`Segmentation ${si + 1}`} value={step[key]} onChange={setStep(step.id, key)} />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Creative Strategy */}
                    <div className="step-section">
                      <div className="step-section-label">
                        <span className="step-section-dot dot-purple" />
                        Creative Strategy
                      </div>
                      <div className="form-fields">
                        <div className="form-row-2">
                          <TextArea label="Strategic Angle" placeholder="e.g. Problem/Solution, Education, Premium, Social proof…" value={step.strategic_angle} onChange={setStep(step.id, 'strategic_angle')} />
                          <TextArea label="Claims" placeholder="Specific product/brand elements to include" value={step.claims} onChange={setStep(step.id, 'claims')} />
                        </div>
                        <div className="form-row-2">
                          <TextArea label="Proof Assets" placeholder="Stats, testimonials, screenshots, product GIFs…" value={step.proof_assets} onChange={setStep(step.id, 'proof_assets')} />
                          <TextArea label="Message Structure" placeholder="Required messaging structure beyond the template" value={step.message_structure} onChange={setStep(step.id, 'message_structure')} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button className="btn-add-step btn-add-step-bottom" onClick={addStep}>
              <PlusIcon /> Add Another Step
            </button>
          </div>

          {/* Bottom save */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 8, paddingBottom: 24 }}>
            <button className="btn-save" onClick={handleSave} disabled={saving}>
              <SaveIcon />{saving ? 'Saving…' : 'Save Proposal'}
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}
