'use client'

import { useState, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { slugify } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

interface CreativeEntries {
  h1: string
  subject: string
  preview: string
  body: string
  cta: string
  cta_url: string
}

const EMPTY_CREATIVE: CreativeEntries = {
  h1: '', subject: '', preview: '', body: '', cta: '', cta_url: '',
}

interface Segmentation {
  variable: string
  creative_specificity: string
}

const EMPTY_SEG: Segmentation = { variable: '', creative_specificity: '' }

export interface Step {
  id: string
  label: string
  // Creative Strategy
  creative_strategy: string
  detailed_creative_direction: string
  // Personalization — dynamic array of { variable, creative_specificity }
  segmentations: Segmentation[]
  creative_entries: CreativeEntries
  // Rules
  rules: string[]
  // Legacy fields kept for migration
  template_name?: string
  guardrails?: string
  strategic_angle?: string
}

const EMPTY_STEP: Omit<Step, 'id' | 'label'> = {
  creative_strategy: '', detailed_creative_direction: '',
  segmentations: [{ ...EMPTY_SEG }],
  creative_entries: { ...EMPTY_CREATIVE },
  rules: [''],
}

function newStep(index: number): Step {
  return {
    id: crypto.randomUUID(),
    label: `Message ${index + 1}`,
    ...EMPTY_STEP,
    segmentations: [{ ...EMPTY_SEG }],
    creative_entries: { ...EMPTY_CREATIVE },
    rules: [''],
  }
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

// ─── Field components ─────────────────────────────────────────────────────────

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
  label: string; placeholder?: string; optional?: boolean; description?: string
  value: string; onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
}
function TextArea({ label, placeholder, optional, description, value, onChange }: TextAreaProps) {
  return (
    <div className="form-group">
      <label className="form-label">
        {label}{optional && <span className="optional">(optional)</span>}
      </label>
      {description && <p className="form-description">{description}</p>}
      <textarea className="form-textarea" placeholder={placeholder} value={value} onChange={onChange} />
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
function CopyIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
  </svg>
}
function DownloadIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
}
function ChevronIcon({ open }: { open: boolean }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={{ width: 16, height: 16, transition: 'transform 0.2s', transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}>
    <polyline points="9 18 15 12 9 6"/>
  </svg>
}

// ─── Collapsible Section ──────────────────────────────────────────────────────

function CollapsibleCard({ title, icon, iconClass, children, defaultOpen = false }: {
  title: string; icon: React.ReactNode; iconClass: string; children: React.ReactNode; defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="form-card">
      <div className="form-card-header form-card-header-clickable" onClick={() => setOpen(o => !o)}>
        <div className={`form-card-icon ${iconClass}`}>{icon}</div>
        <h2 className="form-card-title">{title}</h2>
        <div style={{ marginLeft: 'auto' }}><ChevronIcon open={open} /></div>
      </div>
      {open && <div className="form-fields">{children}</div>}
    </div>
  )
}

// ─── Markdown export ──────────────────────────────────────────────────────────

function generateMarkdown(data: Record<string, string>, steps: Step[]): string {
  let md = `# ${data.test_name || 'Untitled Proposal'}\n\n`

  if (data.flow_name || data.canvas_link || data.primary_goal) {
    md += `## Flow Details\n`
    if (data.flow_name) md += `- **Flow Name:** ${data.flow_name}\n`
    if (data.canvas_link) md += `- **Canvas Link:** ${data.canvas_link}\n`
    if (data.primary_goal) md += `- **Primary Goal:** ${data.primary_goal}\n`
    if (data.secondary_goals) md += `- **Secondary Goals:** ${data.secondary_goals}\n`
    md += `\n`
  }

  if (data.test_direction || data.test_hypothesis) {
    md += `## Testing Goals\n`
    if (data.test_direction) md += `**Overall Test Direction:** ${data.test_direction}\n\n`
    if (data.test_hypothesis) md += `**Test Hypothesis:** ${data.test_hypothesis}\n\n`
  }

  md += `## Creative Strategy\n\n`
  steps.forEach((step, i) => {
    md += `### ${step.label || `Message ${i + 1}`}\n\n`
    if (step.creative_strategy) md += `**Creative Strategy:** ${step.creative_strategy}\n\n`
    if (step.detailed_creative_direction) md += `**Detailed Creative Direction:** ${step.detailed_creative_direction}\n\n`

    if (step.segmentations.some(s => s.variable || s.creative_specificity)) {
      md += `**Personalization Strategy:**\n`
      step.segmentations.forEach((seg, si) => {
        if (seg.variable || seg.creative_specificity) {
          md += `- Seg ${si + 1}: **${seg.variable}** — ${seg.creative_specificity}\n`
        }
      })
      md += `\n`
    }

    const ce = step.creative_entries
    if (ce.subject || ce.preview || ce.h1 || ce.body || ce.cta) {
      md += `**Detailed Creative Direction (individual fields optional):**\n`
      if (ce.subject) md += `- **Subject Direction:** ${ce.subject}\n`
      if (ce.preview) md += `- **Preview Direction:** ${ce.preview}\n`
      if (ce.h1) md += `- **H1 Direction:** ${ce.h1}\n`
      if (ce.body) md += `- **Body:** ${ce.body}\n`
      if (ce.cta) md += `- **CTA Direction:** ${ce.cta}\n`
      if (ce.cta_url) md += `- **CTA URL:** ${ce.cta_url}\n`
      md += `\n`
    }

    if (step.rules.some(r => r.trim())) {
      md += `**Rules:**\n`
      step.rules.forEach((r, ri) => { if (r.trim()) md += `- Rule ${ri + 1}: ${r}\n` })
      md += `\n`
    }
  })

  return md
}

// ─── Main component ───────────────────────────────────────────────────────────

const PROPOSAL_FIELDS = [
  'test_name', 'flow_name', 'canvas_link',
  'primary_goal', 'secondary_goals', 'test_direction', 'test_hypothesis',
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
    if (Array.isArray(raw) && raw.length > 0) {
      return (raw as Record<string, unknown>[]).map(s => {
        const old = s as Record<string, unknown>
        // Migrate segmentations from old format
        let segs: Segmentation[] = []
        if (Array.isArray(old.segmentations) && old.segmentations.length > 0) {
          if (typeof old.segmentations[0] === 'string') {
            segs = (old.segmentations as string[]).filter(Boolean).map(v => ({ variable: v, creative_specificity: '' }))
          } else {
            segs = old.segmentations as Segmentation[]
          }
        }
        if (segs.length === 0) segs = [{ ...EMPTY_SEG }]

        return {
          ...newStep(0),
          ...s,
          creative_strategy: (old.creative_strategy as string) || (old.strategic_angle as string) || '',
          segmentations: segs,
          creative_entries: (old.creative_entries as CreativeEntries) || { ...EMPTY_CREATIVE },
          detailed_creative_direction: (old.detailed_creative_direction as string) || '',
          rules: (old.rules as string[]) || [''],
        } as Step
      })
    }
    return [newStep(0)]
  })

  const [activeStepIndex, setActiveStepIndex] = useState(0)

  const set = useCallback((key: string) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setData((prev) => ({ ...prev, [key]: e.target.value })), [])

  const [viewAllModal, setViewAllModal] = useState<{ stepId: string; segIndex: number } | null>(null)

  const setStep = useCallback((id: string, key: keyof Step) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setSteps((prev) => prev.map((s) => s.id === id ? { ...s, [key]: e.target.value } : s)), [])

  const setStepCreative = useCallback((id: string, key: keyof CreativeEntries) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => setSteps((prev) => prev.map((s) => s.id === id ? { ...s, creative_entries: { ...s.creative_entries, [key]: e.target.value } } : s)), [])

  // Segmentation helpers
  const addSegmentation = (id: string) => setSteps(prev => prev.map(s =>
    s.id === id ? { ...s, segmentations: [...s.segmentations, { ...EMPTY_SEG }] } : s
  ))
  const updateSeg = (id: string, index: number, field: keyof Segmentation, value: string) => setSteps(prev => prev.map(s =>
    s.id === id ? { ...s, segmentations: s.segmentations.map((seg, i) => i === index ? { ...seg, [field]: value } : seg) } : s
  ))
  const removeSegmentation = (id: string, index: number) => setSteps(prev => prev.map(s =>
    s.id === id ? { ...s, segmentations: s.segmentations.filter((_, i) => i !== index) } : s
  ))

  // Rule helpers
  const addRule = (id: string) => setSteps(prev => prev.map(s =>
    s.id === id ? { ...s, rules: [...s.rules, ''] } : s
  ))
  const updateRule = (id: string, index: number, value: string) => setSteps(prev => prev.map(s =>
    s.id === id ? { ...s, rules: s.rules.map((r, i) => i === index ? value : r) } : s
  ))
  const removeRule = (id: string, index: number) => setSteps(prev => prev.map(s =>
    s.id === id ? { ...s, rules: s.rules.filter((_, i) => i !== index) } : s
  ))

  // Step management
  const addStep = () => {
    setSteps(prev => [...prev, newStep(prev.length)])
    setActiveStepIndex(steps.length)
  }
  const duplicateStep = () => {
    if (!activeStep) return
    const dup: Step = {
      ...JSON.parse(JSON.stringify(activeStep)),
      id: crypto.randomUUID(),
      label: `${activeStep.label} (copy)`,
    }
    setSteps(prev => [...prev, dup])
    setActiveStepIndex(steps.length)
  }
  const removeStep = (id: string) => {
    setSteps(prev => prev.filter(s => s.id !== id))
    setActiveStepIndex(i => Math.max(0, i - 1))
  }

  const slug = slugify(data.test_name || '')

  function handleSave() {
    onSave({ ...data, steps })
  }

  function handleDownloadMarkdown() {
    const md = generateMarkdown(data, steps)
    const blob = new Blob([md], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${slug || 'proposal'}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  const activeStep = steps[activeStepIndex] || steps[0]

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
            <button className="btn-download-md" onClick={handleDownloadMarkdown} title="Download as Markdown">
              <DownloadIcon /> Download .md
            </button>
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

          {/* Section 1: Flow Details — collapsible, no triggers/rules */}
          <CollapsibleCard
            title="1. Flow Details"
            iconClass="icon-navy"
            icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/></svg>}
          >
            <div className="form-row-2">
              <Field label="Flow Name" placeholder="e.g., Behavior-Based Welcome Series" value={data.flow_name} onChange={set('flow_name')} />
              <Field label="Canvas Link" placeholder="https://canvas.neonblue.app/…" value={data.canvas_link} onChange={set('canvas_link')} />
            </div>
            <div className="form-subheader">Flow Goals</div>
            <div className="form-row-2">
              <Field label="Primary Goal" placeholder="Primary objective" value={data.primary_goal} onChange={set('primary_goal')} />
              <Field label="Secondary Goals" placeholder="Secondary objectives" value={data.secondary_goals} onChange={set('secondary_goals')} />
            </div>
          </CollapsibleCard>

          {/* Section 2: Testing Goals — not optional, not greyed */}
          <CollapsibleCard
            title="2. Testing Goals"
            iconClass="icon-purple"
            defaultOpen
            icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>}
          >
            <div className="form-row-2">
              <TextArea label="Overall Test Direction" placeholder="What is the theme of this test?" value={data.test_direction} onChange={set('test_direction')} />
              <TextArea label="Test Hypothesis" placeholder="What exactly are we trying to test?" value={data.test_hypothesis} onChange={set('test_hypothesis')} />
            </div>
          </CollapsibleCard>

          {/* Section 3: Creative Strategy */}
          <div className="form-card creative-strategy-card">
            <div className="form-card-header">
              <div className="form-card-icon icon-purple">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg>
              </div>
              <h2 className="form-card-title">3. Creative Strategy</h2>
            </div>

            <div className="steps-section">
              <div className="steps-section-header">
                <p className="steps-section-subtitle">Add a message for each email, push, or SMS in the flow</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn-add-step" onClick={duplicateStep} title="Duplicate current message">
                    <CopyIcon /> Duplicate
                  </button>
                  <button className="btn-add-step" onClick={addStep}>
                    <PlusIcon /> Add Message
                  </button>
                </div>
              </div>

              {/* Step tabs */}
              <div className="step-tabs">
                {steps.map((step, i) => (
                  <button
                    key={step.id}
                    className={`step-tab ${i === activeStepIndex ? 'active' : ''}`}
                    onClick={() => setActiveStepIndex(i)}
                  >
                    <span className="step-tab-number">{i + 1}</span>
                    {step.label || `Message ${i + 1}`}
                  </button>
                ))}
              </div>

              {/* Active step content */}
              {activeStep && (
                <div className="step-card">
                  <div className="step-card-header">
                    <div className="step-number">{activeStepIndex + 1}</div>
                    <input
                      type="text"
                      className="step-label-input"
                      value={activeStep.label}
                      onChange={setStep(activeStep.id, 'label')}
                      placeholder="e.g., Email 1, Push 2…"
                    />
                    {steps.length > 1 && (
                      <button className="step-remove-btn" onClick={() => removeStep(activeStep.id)} title="Remove step">
                        <TrashIcon />
                      </button>
                    )}
                  </div>

                  <div className="step-card-body">
                    <div className="step-section">
                      <div className="form-fields">
                        <div className="form-subheader">Strategic Direction</div>
                        <TextArea
                          label="Creative Strategy"
                          placeholder="e.g., Trial Conversion with Social Proof & Product Expansion"
                          value={activeStep.creative_strategy}
                          onChange={setStep(activeStep.id, 'creative_strategy')}
                        />
                        <TextArea label="Detailed Creative Direction" placeholder="Specific direction for copy, tone, and structure…" value={activeStep.detailed_creative_direction} onChange={setStep(activeStep.id, 'detailed_creative_direction')} />

                        {/* Personalization Strategy */}
                        <div className="form-subheader">Personalization Strategy</div>
                        <p className="form-description">Define the variables you want to personalise and how to tailor the creative for each.</p>
                        {activeStep.segmentations.map((seg, si) => (
                          <div key={si} className="seg-pair">
                            <div className="seg-pair-header">
                              <span className="segment-pill">Seg {si + 1}</span>
                              {activeStep.segmentations.length > 1 && (
                                <button className="seg-remove-btn" onClick={() => removeSegmentation(activeStep.id, si)} title="Remove">&times;</button>
                              )}
                            </div>
                            <div className="form-group">
                              <label className="form-label">Segmentation Variable</label>
                              <p className="form-description-sm">The variable for which you want to personalise</p>
                              <input type="text" className="form-input" placeholder="e.g., JTBD Persona"
                                value={seg.variable} onChange={e => updateSeg(activeStep.id, si, 'variable', e.target.value)} />
                            </div>
                            <div className="form-group" style={{ marginTop: 12 }}>
                              <label className="form-label">Personalization Angle</label>
                              <p className="form-description-sm">How you want to tailor the creative based on the variable</p>
                              <div style={{ position: 'relative' }}>
                                <textarea className="form-textarea" rows={5} placeholder="e.g., Write two sentences about each JTBD's what's hard in a way that feels like someone who genuinely empathizes with them"
                                  value={seg.creative_specificity} onChange={e => updateSeg(activeStep.id, si, 'creative_specificity', e.target.value)} />
                                {seg.creative_specificity && (
                                  <button type="button" onClick={() => setViewAllModal({ stepId: activeStep.id, segIndex: si })}
                                    style={{ position: 'absolute', bottom: 8, right: 8, background: '#fff', border: '1px solid rgba(0,0,0,0.12)', borderRadius: 6, padding: '3px 10px', fontSize: '0.68rem', color: '#666', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                                    View all
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                        <button className="btn-add-seg" onClick={() => addSegmentation(activeStep.id)}>
                          <PlusIcon /> Add Segmentation
                        </button>

                        <div className="form-subheader">Detailed Creative Direction (individual fields optional)</div>
                        <TextArea label="Subject Direction" placeholder="Direction for subject line, e.g. urgency-driven, question-based…" value={activeStep.creative_entries.subject} onChange={setStepCreative(activeStep.id, 'subject')} />
                        <Field label="Preview Direction" placeholder="Direction for preview text, e.g. complement subject, tease content…" value={activeStep.creative_entries.preview} onChange={setStepCreative(activeStep.id, 'preview')} />
                        <Field label="H1 Direction" placeholder="Direction for headline, e.g. benefit-led, persona-specific…" value={activeStep.creative_entries.h1} onChange={setStepCreative(activeStep.id, 'h1')} />
                        <TextArea label="Body" placeholder="Email body content direction" value={activeStep.creative_entries.body} onChange={setStepCreative(activeStep.id, 'body')} />
                        <div className="form-row-2">
                          <Field label="CTA Direction" placeholder="Direction for CTA, e.g. action-oriented, low-commitment…" value={activeStep.creative_entries.cta} onChange={setStepCreative(activeStep.id, 'cta')} />
                          <Field label="CTA URL" placeholder="https://…" value={activeStep.creative_entries.cta_url} onChange={setStepCreative(activeStep.id, 'cta_url')} />
                        </div>

                        <div className="form-subheader">Rules</div>
                        <p className="form-description">Additional rules on top of existing hard rules</p>
                        {activeStep.rules.map((rule, ri) => (
                          <div key={ri} className="segment-row">
                            <span className="segment-pill" style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444' }}>Rule {ri + 1}</span>
                            <input type="text" className="form-input" placeholder="e.g. No discount language, Max 2 CTAs…"
                              value={rule} onChange={e => updateRule(activeStep.id, ri, e.target.value)} />
                            {activeStep.rules.length > 1 && (
                              <button className="seg-remove-btn" onClick={() => removeRule(activeStep.id, ri)} title="Remove">&times;</button>
                            )}
                          </div>
                        ))}
                        <button className="btn-add-seg" onClick={() => addRule(activeStep.id)}>
                          <PlusIcon /> Add Rule
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bottom save */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 8, paddingBottom: 24 }}>
            <button className="btn-save" onClick={handleSave} disabled={saving}>
              <SaveIcon />{saving ? 'Saving…' : 'Save Proposal'}
            </button>
          </div>

        </div>
      </div>

      {/* View All Modal */}
      {viewAllModal && (() => {
        const step = steps.find(s => s.id === viewAllModal.stepId)
        const seg = step?.segmentations[viewAllModal.segIndex]
        if (!step || !seg) return null
        return (
          <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onClick={() => setViewAllModal(null)}>
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} />
            <div style={{ position: 'relative', background: '#fff', borderRadius: 12, padding: 24, maxWidth: 640, width: '90%', maxHeight: '80vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}
              onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Personalization Angle</h3>
                  {seg.variable && <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#888' }}>Variable: {seg.variable}</p>}
                </div>
                <button onClick={() => setViewAllModal(null)}
                  style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#999', lineHeight: 1 }}>&times;</button>
              </div>
              <textarea
                className="form-textarea"
                rows={12}
                value={seg.creative_specificity}
                onChange={e => updateSeg(viewAllModal.stepId, viewAllModal.segIndex, 'creative_specificity', e.target.value)}
                style={{ width: '100%', fontSize: '0.85rem', lineHeight: 1.7 }}
              />
            </div>
          </div>
        )
      })()}
    </div>
  )
}
