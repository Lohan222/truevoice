import { useEffect, useMemo, useRef, useState } from 'react'

const emotionKeywords = {
  anger: ['angry', 'mad', 'furious', 'rage', 'irritated', 'resentful', 'annoyed'],
  resentment: ['resentment', 'resentful', 'bitter', 'bitterness'],
  hurt: ['hurt', 'stung', 'wounded', 'pain', 'painful'],
  sadness: ['sad', 'down', 'grief', 'heavy', 'heartbroken', 'depressed'],
  fear: ['afraid', 'fear', 'anxious', 'scared', 'panic', 'worried', 'unsafe'],
  shame: ['ashamed', 'embarrassed', 'humiliated', 'small', 'guilty'],
  disappointment: ['disappointed', `let down`, 'discouraged', 'frustrated'],
  confusion: ['confused', 'unsure', 'mixed', 'unclear', 'lost'],
}

const emotionOptions = [
  'anger',
  'resentment',
  'hurt',
  'sadness',
  'fear',
  'shame',
  'disappointment',
  'confusion',
  'other',
]

const emotionalQualities = [
  'invalidation',
  'rejection',
  `not being considered`,
  'betrayal',
  'abandonment',
  'misunderstanding',
  'pressure',
  'powerlessness',
  'uncertainty',
]

const emotionalQualityKeywords = {
  invalidation: ['dismissed', 'invalid', 'ignored', `shut down`, `brushed off`, 'minimized', `not heard`],
  rejection: ['rejected', 'excluded', `pushed away`, `not wanted`, `cast aside`],
  'not being considered': ['overlooked', 'forgotten', `left out`, `not considered`, 'unimportant'],
  betrayal: ['betray', 'lied', 'dishonest', `broke my trust`, 'two-faced'],
  abandonment: ['abandoned', `left me`, `left alone`, 'withdrew', `pulled away`, 'disappeared'],
  misunderstanding: ['misunderstood', 'misread', 'twisted', `not getting me`, `not understood`],
  pressure: ['pressured', 'pushed', 'cornered', 'rushed'],
  powerlessness: ['powerless', 'helpless', 'trapped', 'stuck', `no say`],
  uncertainty: ['uncertain', 'unsure', 'unclear', `don't know`, `not sure`, 'mixed'],
}

const needOptions = [
  'respect',
  'reassurance',
  'understanding',
  'space',
  'repair',
  'clarity',
  'accountability',
  'safety',
]

const boundaryOptions = [
  `slow the conversation down`,
  `name what is not okay`,
  `ask for time before responding`,
  `limit repeated disrespect`,
  `request clearer communication`,
  `step away if escalation continues`,
]

const relationshipTypeOptions = [
  `romantic partner`,
  `close friend`,
  `family member`,
  `coworker / professional`,
  `acquaintance / casual`,
  'other',
]

const relationshipImportanceOptions = [
  `very important`,
  `somewhat important`,
  `not important`,
]

const communicationModeOptions = [
  {
    value: 'processing',
    label: `I feel activated and need help sorting what I feel`,
  },
  {
    value: 'grounded',
    label: `I'm mostly clear and want help expressing something well`,
  },
]

const communicationModeLabels = {
  processing: `Emotional Processing`,
  grounded: `Grounded Expression`,
}

const communicationModeDescriptions = {
  processing:
    `For moments when you need help understanding what you are feeling first, with calm step-by-step guidance.`,
  grounded:
    `For moments when you are ready to express yourself clearly, responsibly, and in a grounded way.`,
}

const toneOptionMicrocopyByState = {
  dysregulated: {
    soft: `Helps ease into the conversation`,
    balanced: `Keeps things steady and simple`,
    firm: `Use if you want to be direct, but stay calm`,
  },
  reactive: {
    soft: `Helps keep things from escalating`,
    balanced: `Keeps you grounded and understood`,
    firm: `Helps you be clear without losing control`,
  },
  reflective: {
    soft: `Keeps it open and exploratory`,
    balanced: `Helps you express what you're figuring out`,
    firm: `Use if you want to be more direct`,
  },
  grounded: {
    soft: `Keeps it open and considerate`,
    balanced: `Balanced and straightforward`,
    firm: `Direct and clearly boundaried`,
  },
}

const emptyWorkingMemory = {
  current_topic: '',
  relationship_context: '',
  emotional_state: '',
  core_feeling: '',
  likely_need: '',
  selected_tone: '',
  communication_goal: '',
  latest_draft_message: '',
}

const defaultTransformationState = {
  tone: `neutral`,
  relational: false,
  boundary: false,
}

const modeSelectionStep = {
  key: 'communicationMode',
  prompt: `Which best fits where you are right now?`,
  type: 'mode-options',
  options: communicationModeOptions,
}

const processingSteps = [
  {
    key: 'intensity',
    prompt: `Let's start with your emotional check-in. How intense does this feel right now on a 1 to 10 scale?`,
    type: 'options',
    options: Array.from({ length: 10 }, (_, index) => String(index + 1)),
  },
  {
    key: 'clarity',
    prompt: `How clear are you about what you're feeling right now?`,
    type: 'options',
    options: ['foggy', `somewhat clear`, `very clear`],
  },
  {
    key: 'reactivity',
    prompt: `How reactive do you feel in your body and thoughts?`,
    type: 'options',
    options: ['low', 'medium', 'high'],
  },
  {
    key: 'whatHappened',
    prompt: `What happened? Give me the moment in your own words.`,
    type: 'text',
    placeholder: `They interrupted me in front of everyone and then acted like I was overreacting...`,
    buttonLabel: `Share what happened`,
  },
  {
    key: 'primaryEmotion',
    prompt: `The strongest emotion I'm picking up is below. Keep it if it fits, or choose the one that feels truest.`,
    type: 'options',
    options: emotionOptions,
  },
  {
    key: 'emotionalQuality',
    prompt: `What kind of hurt is here?`,
    type: 'options',
    options: emotionalQualities,
  },
  {
    key: 'relationship_type',
    prompt: `What is your relationship to this person?`,
    type: 'options',
    options: relationshipTypeOptions,
  },
  {
    key: 'relationship_importance',
    prompt: `How important is it for you to maintain or deepen this relationship?`,
    type: 'options',
    options: relationshipImportanceOptions,
  },
  {
    key: 'meaningSplit',
    prompt: `Let’s separate what happened from what it meant.`,
    type: 'dual-text',
    fields: [
      {
        key: 'facts',
        label: `What actually happened?`,
        placeholder: `They said, "You always do this," in front of the team and left the meeting.`,
        helperText: `Try one simple sentence about what the person did.`,
      },
      {
        key: 'interpretation',
        label: `What did it feel like or mean to you?`,
        placeholder: `It made me feel dismissed and like they wanted to embarrass me.`,
      },
    ],
    buttonLabel: `Keep going`,
  },
  {
    key: 'needs',
    prompt: `What do you need most in this situation? You can pick a prompt or write your own.`,
    type: 'text-with-options',
    options: needOptions,
    placeholder: `I need respect, direct communication, and some acknowledgment of the impact.`,
    buttonLabel: `Name needs`,
  },
  {
    key: 'rawMessage',
    prompt: `Say the raw, unrehearsed thing you want to say. No need to make it polished yet.`,
    type: 'text',
    placeholder: `I'm angry that you talked to me like that and then made me feel unreasonable for reacting.`,
    buttonLabel: `Write raw message`,
  },
  {
    key: 'boundaryChoice',
    prompt: `Is there a boundary you want to make clear in this conversation?`,
    type: 'options',
    options: [`Yes`, `No`],
  },
  {
    key: 'boundary',
    prompt: `What boundary do you want to make clear?`,
    type: 'text',
    placeholder: `This matters to me and needs attention.`,
    helperText: `State what matters to you or what you want to be different going forward.`,
    buttonLabel: `Add boundary`,
  },
]

const groundedSteps = [
  {
    key: 'whatHappened',
    prompt: `What happened? Name the concrete moment you want to address.`,
    type: 'text',
    placeholder: `Yesterday, when the deadline changed, I did not hear about it until after the meeting.`,
    buttonLabel: `Share what happened`,
  },
  {
    key: 'otherPersonContext',
    prompt: `What might be going on for the other person?`,
    type: 'text',
    placeholder: `I know your schedule has been packed and you may not have realized how it landed.`,
    buttonLabel: `Add context`,
  },
  {
    key: 'groundedImpact',
    prompt: `What matters to you here?`,
    type: 'text',
    placeholder: `It made planning harder for me and I want communication to feel more dependable.`,
    buttonLabel: `Name what matters`,
  },
  {
    key: 'groundedRequest',
    prompt: `What do you want going forward?`,
    type: 'text',
    placeholder: `Going forward, I need a quick heads-up if the plan changes.`,
    buttonLabel: `State the request`,
  },
  {
    key: 'groundedAction',
    prompt: `Optional: what simple action would help?`,
    type: 'text',
    placeholder: `A short text or a quick update in the group chat would help.`,
    buttonLabel: `Add practical help`,
    optional: true,
    skipLabel: `Skip for now`,
  },
  {
    key: 'boundaryChoice',
    prompt: `Is there a boundary you want to make clear in this conversation?`,
    type: 'options',
    options: [`Yes", "No`],
  },
  {
    key: 'boundary',
    prompt: `What boundary do you want to make clear?`,
    type: 'text',
    placeholder: `I need this to be more reliable going forward.`,
    helperText: `State what matters to you or what you want to be different going forward.`,
    buttonLabel: `Add boundary`,
  },
]

const stepGuidance = {
  communicationMode: [
    `Choose the path that fits your nervous system right now.`,
    `You can switch later if your words suggest a better fit.`,
  ],
  intensity: [
    `Pause for one breath and notice where this lands in you right now.`,
    `You do not have to get it perfect. Just give the number that feels closest.`,
  ],
  clarity: [
    `It is okay if this still feels messy.`,
    `Just notice how clear or unclear it feels right now.`,
  ],
  reactivity: [
    `Check in with your body and your thoughts for a second.`,
    `How activated do you feel right now?`,
  ],
  whatHappened: [
    `Take a second. Just say what happened, the way you experienced it.`,
    `You can keep it simple and direct.`,
  ],
  primaryEmotion: [
    `What you are describing has some emotional weight to it.`,
    `What are you feeling most right now?`,
  ],
  emotionalQuality: [
    `Go underneath the first reaction.`,
  ],
  relationship_type: [
    `A little context helps shape the tone of what comes next.`,
    `What kind of relationship is this for you?`,
  ],
  relationship_importance: [
    `This helps us match the response to what matters here.`,
    `How much do you want to protect or preserve this relationship?`,
  ],
  meaningSplit: [
    `Let’s go a little deeper.`,
    `Separate what happened from what it felt like or meant to you.`,
  ],
  needs: [
    `Under the reaction, there is usually something you are needing.`,
    `Name what would actually help here.`,
  ],
  boundaries: [
    `Now let’s make it protective and grounded.`,
    `What boundary would help you stay steady?`,
  ],
  rawMessage: [
    `If you said it without filtering, what would come out?`,
    `Let it be honest before it becomes polished.`,
  ],
  boundaryChoice: [
    `Only include a boundary if you genuinely want to make one clear.`,
    `You can say no and keep the message focused on understanding and request.`,
  ],
  boundary: [
    `Keep the boundary calm, clear, and grounded in what matters to you.`,
    `Say it plainly without threats or escalation.`,
  ],
  customEmotion: [
    `If the suggested emotion misses it, trust your own word for it.`,
    `Name the feeling that fits best.`,
  ],
  otherPersonContext: [
    `Acknowledge what may be true on their side without excusing the behavior.`,
    `Keep it simple and realistic.`,
  ],
  groundedImpact: [
    `Name the impact lightly and specifically.`,
    `Focus on what matters to you, not on proving they were wrong.`,
  ],
  groundedRequest: [
    `Ask clearly for what you want going forward.`,
    `Keep it practical and direct.`,
  ],
  groundedAction: [
    `If there is an easy next step, name it.`,
    `You can skip this if the request already feels complete.`,
  ],
}

const stepTransitions = {
  primaryEmotion: `Let's slow this down and look at what's underneath.`,
  rawMessage: `That gives us something clear to work with.`,
  groundedRequest: `That gives us something clear to work with.`,
}

const assistantAvatar = 'TV'
const isDev = import.meta.env.DEV
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL
console.log(`API URL:`, import.meta.env.VITE_API_BASE_URL)
const openingGroundingLines = [
  `Let’s take a second.`,
  `Take one breath with me.`,
  `Nothing to fix right now.`,
]
const voiceEnabledStepKeys = new Set([
  'whatHappened',
  'meaningSplit',
  'rawMessage',
  'otherPersonContext',
  'groundedImpact',
  'groundedRequest',
  'groundedAction',
  'boundary',
])

const recorderMimeCandidates = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4',
  'audio/ogg;codecs=opus',
  'audio/ogg',
]

const continuationStarters = new Set([
  'and',
  'but',
  'so',
  'because',
  'then',
  'if',
  'when',
  'while',
  'though',
  'although',
  'like',
  'just',
  'still',
  'really',
  'maybe',
  'kind',
  'sort',
  'or',
  'yet',
])

function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }

  return `id-${Math.random().toString(36).substring(2, 9)}`
}

function createMessage(role, content, meta = {}) {
  return {
    id: `${role}-${generateId()}`,
    role,
    content,
    ...meta,
  }
}

const FLOW_STATE_STORAGE_KEY = `truevoice-active-flow`

function getInitialMessages(initialSteps) {
  return [
    createMessage(
      `assistant`,
      `I'm here with you. We'll go step by step, understand what you're feeling, gently turn toward your experience, and shape a clear way to express it without overwhelm.`,
    ),
    createMessage(`assistant`, initialSteps[0]?.prompt || ``),
  ]
}

function readPersistedFlowState(initialSteps) {
  if (typeof window === `undefined`) {
    return null
  }

  try {
    const raw = window.sessionStorage.getItem(FLOW_STATE_STORAGE_KEY)

    if (!raw) {
      return null
    }

    const parsed = JSON.parse(raw)
    const fallbackMessages = getInitialMessages(initialSteps)
    const legacyTone =
      String(parsed.selectedToneVariant || ``) === `soft`
        ? `soft`
        : String(parsed.selectedToneVariant || ``) === `firm`
          ? `direct`
          : `neutral`
    const normalizedTransformationState =
      parsed.transformationState && typeof parsed.transformationState === `object`
        ? {
            tone: [`neutral`, `soft`, `direct`].includes(parsed.transformationState.tone)
              ? parsed.transformationState.tone
              : legacyTone,
            relational: Boolean(parsed.transformationState.relational),
            boundary: Boolean(parsed.transformationState.boundary),
          }
        : {
            tone: legacyTone,
            relational: Boolean(parsed.messageAdjustments?.relational),
            boundary: Boolean(parsed.messageAdjustments?.boundary),
          }

    return {
      messages: Array.isArray(parsed.messages) && parsed.messages.length ? parsed.messages : fallbackMessages,
      form: parsed.form && typeof parsed.form === `object` ? parsed.form : {},
      draftValues: parsed.draftValues && typeof parsed.draftValues === `object` ? parsed.draftValues : {},
      completedStepKeys: Array.isArray(parsed.completedStepKeys) ? parsed.completedStepKeys : [],
      stepIndex: Number.isInteger(parsed.stepIndex) ? parsed.stepIndex : 0,
      completed: Boolean(parsed.completed),
      showGroundingIntro:
        typeof parsed.showGroundingIntro === `boolean` ? parsed.showGroundingIntro : true,
      transformationState: normalizedTransformationState,
      workingMemory:
        parsed.workingMemory && typeof parsed.workingMemory === `object` ? parsed.workingMemory : emptyWorkingMemory,
      modeSuggestion: parsed.modeSuggestion && typeof parsed.modeSuggestion === `object` ? parsed.modeSuggestion : null,
    }
  } catch (error) {
    console.warn(`Unable to restore flow state`, error)
    return null
  }
}

function persistFlowStateSnapshot(snapshot) {
  if (typeof window === `undefined`) {
    return
  }

  try {
    window.sessionStorage.setItem(FLOW_STATE_STORAGE_KEY, JSON.stringify(snapshot))
  } catch (error) {
    console.warn(`Unable to persist flow state`, error)
  }
}

function clearPersistedFlowState() {
  if (typeof window === `undefined`) {
    return
  }

  try {
    window.sessionStorage.removeItem(FLOW_STATE_STORAGE_KEY)
  } catch (error) {
    console.warn(`Unable to clear flow state`, error)
  }
}

function detectEmotion(text) {
  const normalized = text.toLowerCase()
  let best = ''
  let bestScore = 0
  const uncertaintySignals = [
    `i don't know`,
    `im not sure`,
    `i'm not sure`,
    `what happened`,
    `what even happened`,
    'unclear',
    'unsure',
    'confused',
  ]

  for (const [emotion, words] of Object.entries(emotionKeywords)) {
    const weight = emotion === 'confusion' ? 0.6 : emotion === 'resentment' ? 1.15 : 1
    const score = words.reduce(
      (total, word) => total + (normalized.includes(word) ? weight : 0),
      0,
    )
    if (score > bestScore) {
      best = emotion
      bestScore = score
    }
  }

  if (bestScore > 0) {
    if (best === 'confusion') {
      const hasStrongerEmotion = Object.entries(emotionKeywords).some(([emotion, words]) => {
        if (emotion === 'confusion') return false
        return words.some((word) => normalized.includes(word))
      })

      if (hasStrongerEmotion) {
        const strongestNonConfusion = Object.entries(emotionKeywords)
          .filter(([emotion]) => emotion !== 'confusion')
          .map(([emotion, words]) => ({
            emotion,
            score: words.reduce((total, word) => total + (normalized.includes(word) ? 1 : 0), 0),
          }))
          .sort((a, b) => b.score - a.score)[0]

        if (strongestNonConfusion?.score > 0) {
          return strongestNonConfusion.emotion
        }
      }
    }

    return best
  }

  if (normalized.includes(`should have`) || normalized.includes(`let down`)) return 'disappointment'
  if (uncertaintySignals.some((signal) => normalized.includes(signal))) return 'confusion'

  return 'hurt'
}

function getSuggestedEmotionalQualities(text, limit = 2) {
  const normalized = String(text || '').toLowerCase()

  if (!normalized.trim()) {
    return { suggestions: [], confidence: 'low' }
  }

  const ranked = emotionalQualities
    .map((quality) => {
      const keywords = emotionalQualityKeywords[quality] || []
      const score = keywords.reduce(
        (total, keyword) => total + (normalized.includes(keyword) ? keyword.split(` `).length : 0),
        0,
      )

      return { quality, score }
    })
    .filter((entry) => entry.score > 0)
    .sort((first, second) => second.score - first.score)

  if (!ranked.length) {
    return { suggestions: [], confidence: 'low' }
  }

  const topScore = ranked[0]?.score || 0
  const confidence = topScore >= 3 ? 'high' : topScore >= 2 ? 'medium' : 'low'

  return {
    suggestions: ranked.slice(0, limit).map((entry) => entry.quality),
    confidence,
  }
}

function getStepsForMode(mode) {
  if (mode === 'processing') return [modeSelectionStep, ...processingSteps]
  if (mode === 'grounded') return [modeSelectionStep, ...groundedSteps]
  return [modeSelectionStep]
}

function getStepIndexForKey(mode, key) {
  return getStepsForMode(mode).findIndex((step) => step.key === key)
}

function detectCommunicationMode(text) {
  const normalized = String(text || '').toLowerCase()

  if (!normalized.trim()) {
    return null
  }

  const processingSignals = [
    'angry',
    'hurt',
    'devastated',
    'resentful',
    'betrayed',
    'triggered',
    'overwhelmed',
    'confused',
    'reactive',
    `i don't know what i feel`,
    `i do not know what i feel`,
    `i want to lash out`,
    'furious',
    'shaken',
    'spiraling',
  ]

  const groundedSignals = [
    `i'm not that upset`,
    `im not that upset`,
    `i just want to express this well`,
    `i want to say this clearly`,
    `i want to bring something up respectfully`,
    `i need to make a request`,
    `i want to say something authentic but calm`,
    `mostly clear`,
    `say this well`,
    `say this calmly`,
    `bring this up respectfully`,
  ]

  const processingScore = processingSignals.reduce(
    (score, signal) => score + (normalized.includes(signal) ? 1 : 0),
    0,
  )
  const groundedScore = groundedSignals.reduce(
    (score, signal) => score + (normalized.includes(signal) ? 1 : 0),
    0,
  )

  if (processingScore === 0 && groundedScore === 0) {
    return null
  }

  return processingScore >= groundedScore ? 'processing' : 'grounded'
}

function detectUserState(form) {
  const intensity = Number.parseInt(String(form.intensity || '').trim(), 10)
  const clarity = String(form.clarity || '').toLowerCase()
  const reactivity = String(form.reactivity || '').toLowerCase()

  if (Number.isFinite(intensity) && intensity >= 8) {
    return 'dysregulated'
  }

  if (clarity === 'foggy') {
    return 'dysregulated'
  }

  if (reactivity === 'high') {
    return 'reactive'
  }

  if (form.communicationMode === 'grounded' || clarity === `very clear`) {
    return 'grounded'
  }

  return 'reflective'
}

function normalizeThreadText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ` `)
    .replace(/\s+/g, ` `)
    .trim()
}

function getThreadKeywords(value) {
  const stopWords = new Set([
    'the',
    'and',
    'for',
    'that',
    'with',
    'this',
    'have',
    'from',
    'just',
    'what',
    'when',
    'your',
    'they',
    'them',
    'were',
    'been',
    'about',
    'into',
    'because',
    'there',
    'would',
    'could',
    'should',
  ])

  return normalizeThreadText(value)
    .split(` `)
    .filter((part) => part.length > 3 && !stopWords.has(part))
}

function isSameActiveThread(previousMemory, nextMemory) {
  if (!previousMemory.current_topic) {
    return true
  }

  const combinedText = [
    nextMemory.current_topic,
    nextMemory.communication_goal,
    nextMemory.latest_draft_message,
  ]
    .filter(Boolean)
    .join(` `)
    .toLowerCase()

  if (/\b(start over|reset|new issue|new situation|different person|different conversation)\b/.test(combinedText)) {
    return false
  }

  if (
    previousMemory.relationship_context &&
    nextMemory.relationship_context &&
    previousMemory.relationship_context !== nextMemory.relationship_context
  ) {
    return false
  }

  if (!nextMemory.current_topic) {
    return true
  }

  const previousKeywords = getThreadKeywords(previousMemory.current_topic)
  const nextKeywords = getThreadKeywords(nextMemory.current_topic)
  const sharedKeywords = nextKeywords.filter((keyword) => previousKeywords.includes(keyword))

  if (
    normalizeThreadText(previousMemory.current_topic).includes(normalizeThreadText(nextMemory.current_topic)) ||
    normalizeThreadText(nextMemory.current_topic).includes(normalizeThreadText(previousMemory.current_topic))
  ) {
    return true
  }

  return sharedKeywords.length >= 2
}

function deriveWorkingMemory(form, transformationState, latestDraftMessage) {
  const coreFeeling =
    form.primaryEmotion === 'other'
      ? String(form.customEmotion || '').trim()
      : String(form.customEmotion || form.primaryEmotion || '').trim()

  return {
    current_topic: String(form.whatHappened || '').trim(),
    relationship_context: String(form.relationship_type || '').trim(),
    emotional_state: detectUserState(form),
    core_feeling: coreFeeling,
    likely_need: String(form.needs || form.groundedImpact || '').trim(),
    selected_tone: String(transformationState?.tone || ''),
    communication_goal: String(form.groundedRequest || form.boundary || form.needs || '').trim(),
    latest_draft_message: String(latestDraftMessage || '').trim(),
  }
}

function hasWorkingMemory(memory) {
  return Object.values(memory).some(Boolean)
}

function titleCase(value) {
  return value
    .split(` `)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(` `)
}

function summarizeValue(value) {
  const text = String(value || '').trim()

  if (!text) {
    return ''
  }

  return text.length > 110 ? `${text.slice(0, 107)}...` : text
}

const behaviorClarificationMessage =
  `I need one clearer sentence about what the person actually did.\nExamples:\n- They accused me of flirting\n- They refused to call my dog by his name\n- They tried to get me to fix something that was not mine`

const boundaryGuidanceMessage =
  `State what matters to you or what you want to be different going forward.\nExamples:\n- I do not want my sleep interrupted anymore.\n- This needs to be handled more consistently.\n- I need this to be more reliable going forward.`

function isBehaviorClarificationError(message) {
  return /Unable to extract a concrete behavior/i.test(String(message || ''))
}

function getSubmissionValidationMeta(step) {
  if (!step) {
    return {
      field: 'none',
      validator: 'none',
    }
  }

  if (step.key === 'meaningSplit') {
    return {
      field: 'facts',
      validator: 'behavior',
    }
  }

  if (step.key === 'boundary') {
    return {
      field: 'boundary',
      validator: 'boundaryText',
    }
  }

  return {
    field: step.key,
    validator: 'none',
  }
}

function validateStepValue(step, value) {
  if (!step) {
    return null
  }

  if (step.key === 'boundary') {
    const text = String(value || '').trim()
    const looksTooThin = text.length < 10 || text.split(/\s+/).filter(Boolean).length < 3

    if (looksTooThin) {
      return {
        field: 'boundary',
        validator: 'boundaryText',
        message: boundaryGuidanceMessage,
      }
    }
  }

  return null
}

async function generateReframes(form, options = {}, onDebug = () => {}) {
  const resolvedEmotion =
    form.primaryEmotion === 'other' ? form.customEmotion?.trim() || form.primaryEmotion : form.primaryEmotion

  try {
    onDebug({
      fetchStarted: true,
      fetchStatus: 'started',
      lastError: '',
      validationField: 'none',
      validationValidator: 'none',
      downstreamValidationField: 'none',
      downstreamValidationValidator: 'none',
    })
    console.log(`Calling API:`, `${import.meta.env.VITE_API_BASE_URL}/generate-response`)
    const response = await fetch(`${apiBaseUrl}/generate-response`, {
      method: 'POST',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        communicationMode: form.communicationMode,
        intensity: form.intensity,
        clarity: form.clarity,
        reactivity: form.reactivity,
        story: form.whatHappened,
        emotion: resolvedEmotion,
        qualities: form.emotionalQuality,
        facts: form.facts,
        interpretation: form.interpretation,
        need: form.needs,
        rawMessage: form.rawMessage,
        relationship_type: form.relationship_type,
        relationship_importance: form.relationship_importance,
        otherPersonContext: form.otherPersonContext,
        groundedImpact: form.groundedImpact,
        groundedRequest: form.groundedRequest,
        groundedAction: form.groundedAction,
        boundaryChoice: form.boundaryChoice,
        boundary: form.boundary,
        submissionStepId: options.stepKey || '',
      }),
    })

    const payload = await response.json()
    console.log(`API response:`, payload)
    onDebug({
      fetchStarted: true,
      fetchStatus: 'succeeded',
      lastError: '',
      lastResponse:
        form.communicationMode === 'grounded'
          ? `Response: ${payload.response ? 'yes' : 'no'}`
          : `Response: ${payload.response ? 'yes' : 'no'}`,
      validationField: payload.field || 'none',
      validationValidator: payload.validator || 'none',
      downstreamValidationField: payload.field || 'none',
      downstreamValidationValidator: payload.validator || 'none',
    })

    if (!response.ok) {
      const error = new Error(payload.error || `Unable to generate responses right now.`)
      error.field = payload.field || ''
      error.validator = payload.validator || ''
      throw error
    }

    if (form.communicationMode === 'grounded') {
      return {
        response: payload.response,
        toneVariants: payload.toneVariants || null,
        defaultTone: payload.defaultTone || 'balanced',
      }
    }

    return {
      response: payload.response,
      toneVariants: payload.toneVariants || null,
      defaultTone: payload.defaultTone || 'balanced',
    }
  } catch (err) {
    console.error(`API ERROR:`, err)
    onDebug({
      fetchStarted: true,
      fetchStatus: 'failed',
      lastError: err?.message || String(err),
      lastResponse: '',
      validationField: err?.field || 'none',
      validationValidator: err?.validator || 'none',
      downstreamValidationField: err?.field || 'none',
      downstreamValidationValidator: err?.validator || 'none',
    })
    throw err
  }
}

async function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onloadend = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error(`Unable to read recorded audio.`))
    reader.readAsDataURL(blob)
  })
}

function getRecorderMimeType() {
  if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined') {
    return ''
  }

  return recorderMimeCandidates.find((mimeType) => MediaRecorder.isTypeSupported(mimeType)) || ''
}

function getAudioExtension(mimeType) {
  if (mimeType.includes('mp4') || mimeType.includes('m4a')) return 'm4a'
  if (mimeType.includes('ogg')) return 'ogg'
  if (mimeType.includes('wav')) return 'wav'
  return 'webm'
}

function startsAsContinuation(value) {
  const normalized = String(value || '').trim()

  if (!normalized) {
    return false
  }

  if (/^[a-z]/.test(normalized)) {
    return true
  }

  const firstWord = normalized.split(/\s+/)[0]?.toLowerCase() || ''
  return continuationStarters.has(firstWord)
}

async function transcribeAudio(blob, mimeType, options = {}, onDebug = () => {}) {
  const audio = await blobToBase64(blob)
  const extension = getAudioExtension(mimeType)

  try {
    onDebug({
      fetchStarted: true,
      fetchStatus: 'started',
      lastError: '',
    })
    console.log(`Calling API:`, `${import.meta.env.VITE_API_BASE_URL}/transcribe-audio`)
    const response = await fetch(`${apiBaseUrl}/transcribe-audio`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        audio,
        mimeType,
        fileName: `microphone-recording.${extension}`,
        prompt: options.prompt || '',
      }),
    })

    const payload = await response.json()
    console.log(`API response:`, payload)
    onDebug({
      fetchStarted: true,
      fetchStatus: 'succeeded',
      lastError: '',
      lastResponse: `Transcription received`,
    })

    if (!response.ok) {
      throw new Error(payload.error || `Unable to transcribe audio right now.`)
    }

    return payload.text || ''
  } catch (err) {
    console.error(`API ERROR:`, err)
    onDebug({
      fetchStarted: true,
      fetchStatus: 'failed',
      lastError: err?.message || String(err),
      lastResponse: '',
    })
    throw err
  }
}

export default function App() {
  const initialSteps = getStepsForMode()
  const [persistedFlowState] = useState(() => readPersistedFlowState(initialSteps))
  const [showDebug, setShowDebug] = useState(false)
  const [debugState, setDebugState] = useState(() => ({
    appMounted: false,
    initialRenderCompleted: false,
    apiBaseUrl,
    currentRoute:
      typeof window !== 'undefined'
        ? `${window.location.pathname}${window.location.search}${window.location.hash}`
        : '',
    fetchStarted: false,
    fetchStatus: 'idle',
    lastError: '',
    lastResponse: '',
    validationField: '',
    validationValidator: '',
    submittedFieldName: '',
    submittedValidatorName: '',
    downstreamValidationField: '',
    downstreamValidationValidator: '',
    micState: 'idle',
    micPermission: 'unknown',
    micSupported: false,
    micField: '',
    currentStepId: initialSteps[0]?.key || '',
    completedSteps: [],
    savedValuesStatus: '',
    stepChangeReason: `initial load`,
    lastWindowError: '',
    lastUnhandledRejection: '',
  }))
  const [messages, setMessages] = useState(() => persistedFlowState?.messages || getInitialMessages(initialSteps))
  const [form, setForm] = useState(() => persistedFlowState?.form || {})
  const [draftValues, setDraftValues] = useState(() => persistedFlowState?.draftValues || {})
  const [completedStepKeys, setCompletedStepKeys] = useState(() => persistedFlowState?.completedStepKeys || [])
  const [stepIndex, setStepIndex] = useState(() => persistedFlowState?.stepIndex || 0)
  const [completed, setCompleted] = useState(() => Boolean(persistedFlowState?.completed))
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationError, setGenerationError] = useState('')
  const [speakingLabel, setSpeakingLabel] = useState('')
  const [availableVoices, setAvailableVoices] = useState([])
  const [showGroundingIntro, setShowGroundingIntro] = useState(
    () => persistedFlowState?.showGroundingIntro ?? true,
  )
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [speechError, setSpeechError] = useState('')
  const [speechStatus, setSpeechStatus] = useState('')
  const [activeVoiceField, setActiveVoiceField] = useState('')
  const [transcriptionPreviewField, setTranscriptionPreviewField] = useState('')
  const [copiedLabel, setCopiedLabel] = useState('')
  const [conversationCopied, setConversationCopied] = useState(false)
  const [transformationState, setTransformationState] = useState(
    () => persistedFlowState?.transformationState || defaultTransformationState,
  )
  const [workingMemory, setWorkingMemory] = useState(() => persistedFlowState?.workingMemory || emptyWorkingMemory)
  const [modeSuggestion, setModeSuggestion] = useState(() => persistedFlowState?.modeSuggestion || null)
  const endRef = useRef(null)
  const utteranceRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const mediaStreamRef = useRef(null)
  const audioChunksRef = useRef([])
  const recorderMimeTypeRef = useRef('')
  const isRecordingRef = useRef(false)
  const activeVoiceFieldRef = useRef('')
  const copyTimeoutRef = useRef(null)
  const lastTouchActionRef = useRef(0)
  const didRestoreFlowStateRef = useRef(Boolean(persistedFlowState))
  const formRef = useRef(form)
  const draftValuesRef = useRef(draftValues)
  const completedStepKeysRef = useRef(completedStepKeys)
  const stepIndexRef = useRef(stepIndex)
  const activeSteps = useMemo(() => getStepsForMode(form.communicationMode), [form.communicationMode])
  const hasConcreteBehavior = Boolean(
  (form.facts || '').trim() || (form.whatHappened || '').trim()
)

const baseCurrentStep = activeSteps[stepIndex]

const currentStep =
  baseCurrentStep?.key === 'boundaryChoice' && hasConcreteBehavior
    ? {
        ...baseCurrentStep,
        helperText: '',
        examples: [],
      }
    : baseCurrentStep
  const communicationMode = form.communicationMode || ''
  const isCustomEmotionEntry = currentStep?.key === 'primaryEmotion' && form.primaryEmotion === 'other'
  const isCurrentStepVoiceEnabled = voiceEnabledStepKeys.has(currentStep?.key)
  const canUseInAppMic = isCurrentStepVoiceEnabled && debugState.micSupported
  const currentInputValue = isCustomEmotionEntry
    ? draftValues.customEmotion ?? form.customEmotion ?? ''
    : currentStep?.key
      ? draftValues[currentStep.key] ?? form[currentStep.key] ?? ''
      : ''
  const currentDualInput = {
    facts: draftValues.facts ?? form.facts ?? '',
    interpretation: draftValues.interpretation ?? form.interpretation ?? '',
  }
  const progress = useMemo(
    () =>
      Math.round((Math.min(completedStepKeys.length, activeSteps.length) / Math.max(activeSteps.length, 1)) * 100),
    [activeSteps.length, completedStepKeys.length],
  )
  const emotionalQualitySuggestionState = useMemo(() => {
    if (form.communicationMode !== 'processing' || currentStep?.key !== 'emotionalQuality') {
      return { suggestions: [], confidence: 'low' }
    }

    const suggestionSource = [
      form.whatHappened,
      form.facts,
      form.interpretation,
      form.rawMessage,
      form.customEmotion,
      form.primaryEmotion,
    ]
      .filter(Boolean)
      .join(` `)

    return getSuggestedEmotionalQualities(suggestionSource)
  }, [
    currentStep?.key,
    form.communicationMode,
    form.customEmotion,
    form.facts,
    form.interpretation,
    form.primaryEmotion,
    form.rawMessage,
    form.whatHappened,
  ])
  const emotionalQualitySuggestions = emotionalQualitySuggestionState.suggestions
  const emotionalQualitySuggestionLabel =
    emotionalQualitySuggestionState.confidence === 'high'
      ? "This seems like you're feeling:"
      : emotionalQualitySuggestionState.confidence === 'medium'
        ? "This might be what you're feeling:"
        : `One possibility is:`
  const userState = useMemo(() => detectUserState(form), [form])
  const toneOptionMicrocopy = toneOptionMicrocopyByState[userState]

  useEffect(() => {
    formRef.current = form
  }, [form])

  useEffect(() => {
    draftValuesRef.current = draftValues
  }, [draftValues])

  useEffect(() => {
    completedStepKeysRef.current = completedStepKeys
  }, [completedStepKeys])

  useEffect(() => {
    stepIndexRef.current = stepIndex
  }, [stepIndex])

  function updateDebugState(patch) {
    if (!isDev) {
      return
    }

    setDebugState((prev) => ({
      ...prev,
      ...patch,
      currentRoute:
        typeof window !== 'undefined'
          ? `${window.location.pathname}${window.location.search}${window.location.hash}`
          : prev.currentRoute,
      apiBaseUrl,
    }))
  }

  function updateMicDebug(patch) {
    updateDebugState(patch)
  }

  function buildSavedValuesStatus(source = formRef.current) {
    return [
      `mode:${source.communicationMode || 'unset'}`,
      `whatHappened:${source.whatHappened ? 'yes' : 'no'}`,
      `emotion:${source.primaryEmotion || source.customEmotion ? 'yes' : 'no'}`,
      `facts:${source.facts ? 'yes' : 'no'}`,
      `interpretation:${source.interpretation ? 'yes' : 'no'}`,
      `needs:${source.needs ? 'yes' : 'no'}`,
      `rawMessage:${source.rawMessage ? 'yes' : 'no'}`,
      `otherPersonContext:${source.otherPersonContext ? 'yes' : 'no'}`,
      `groundedImpact:${source.groundedImpact ? 'yes' : 'no'}`,
      `groundedRequest:${source.groundedRequest ? 'yes' : 'no'}`,
      `groundedAction:${source.groundedAction ? 'yes' : 'no'}`,
      `boundaryChoice:${source.boundaryChoice ? 'yes' : 'no'}`,
      `boundary:${source.boundary ? 'yes' : 'no'}`,
    ].join(`, `)
  }

  function logStepState(reason, nextStepIndex = stepIndexRef.current, nextForm = formRef.current, nextCompletedSteps = completedStepKeysRef.current) {
    const nextSteps = getStepsForMode(nextForm.communicationMode)
    const nextStepId = nextSteps[nextStepIndex]?.key || 'complete'
    const savedValuesStatus = buildSavedValuesStatus(nextForm)

    console.log(`Flow step change:`, {
      reason,
      currentStepId: nextStepId,
      completedSteps: nextCompletedSteps,
      savedValuesStatus,
    })

    updateDebugState({
      currentStepId: nextStepId,
      completedSteps: nextCompletedSteps,
      savedValuesStatus,
      stepChangeReason: reason,
    })
  }

  function changeStep(nextStepIndex, reason, options = {}) {
    const nextForm = options.nextForm || formRef.current
    const nextCompletedSteps = options.nextCompletedSteps || completedStepKeysRef.current

    setStepIndex(nextStepIndex)
    logStepState(reason, nextStepIndex, nextForm, nextCompletedSteps)
  }

  function updateDraftValue(key, value) {
    setDraftValues((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  function createTouchSafeHandler(action) {
    return (event) => {
      const now = Date.now()

      if (event?.type === 'touchend') {
        event.preventDefault()
        lastTouchActionRef.current = now
        action()
        return
      }

      if (now - lastTouchActionRef.current < 500) {
        return
      }

      action()
    }
  }

  useEffect(() => {
    console.log(`App mounted`)
    updateDebugState({
      appMounted: true,
      initialRenderCompleted: true,
    })
    logStepState(`app mounted`, 0, formRef.current, completedStepKeysRef.current)
  }, [])

  useEffect(() => {
    const micSupported =
      typeof navigator !== 'undefined' &&
      Boolean(navigator.mediaDevices?.getUserMedia) &&
      typeof MediaRecorder !== 'undefined'

    updateMicDebug({
      micSupported,
      micState: micSupported ? 'ready' : `unsupported browser`,
    })

    if (!micSupported || !navigator.permissions?.query) {
      return
    }

    navigator.permissions
      .query({ name: 'microphone' })
      .then((result) => {
        updateMicDebug({
          micPermission: result.state,
        })

        result.onchange = () => {
          updateMicDebug({
            micPermission: result.state,
          })
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!isDev || typeof window === 'undefined') {
      return undefined
    }

    const handleWindowError = (event) => {
      const message = event?.error?.message || event?.message || `Unknown window error`
      console.error('window.onerror:', event?.error || event)
      updateDebugState({ lastWindowError: message, lastError: message })
    }

    const handleUnhandledRejection = (event) => {
      const message =
        event?.reason?.message || (typeof event?.reason === 'string' ? event.reason : `Unhandled promise rejection`)
      console.error('window.onunhandledrejection:', event?.reason || event)
      updateDebugState({ lastUnhandledRejection: message, lastError: message })
    }

    window.addEventListener('error', handleWindowError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)

    return () => {
      window.removeEventListener('error', handleWindowError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, currentStep, completed])

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current)
      }
      window.speechSynthesis?.cancel()
      mediaRecorderRef.current?.stop?.()
      mediaStreamRef.current?.getTracks()?.forEach((track) => track.stop())
    }
  }, [])

  useEffect(() => {
    if (!window.speechSynthesis) {
      return undefined
    }

    const loadVoices = () => {
      setAvailableVoices(window.speechSynthesis.getVoices() || [])
    }

    loadVoices()
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices)

    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', loadVoices)
    }
  }, [])

  function chooseVoice() {
    const voices = availableVoices

    return (
      voices.find(
        (voice) =>
          /en/i.test(voice.lang) && /natural|aria|samantha|google us english|zira|serena/i.test(voice.name),
      ) ||
      voices.find((voice) => /en/i.test(voice.lang) && /female|woman/i.test(voice.name)) ||
      voices.find((voice) => /en/i.test(voice.lang)) ||
      null
    )
  }

  function speakResponse(label, text) {
    if (!window.speechSynthesis || !text) {
      return
    }

    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    const voice = chooseVoice()

    if (voice) {
      utterance.voice = voice
    }

    utterance.rate = 0.9
    utterance.pitch = 1
    utterance.onend = () => {
      setSpeakingLabel('')
      utteranceRef.current = null
    }
    utterance.onerror = () => {
      setSpeakingLabel('')
      utteranceRef.current = null
    }

    utteranceRef.current = utterance
    setSpeakingLabel(label)
    window.speechSynthesis.speak(utterance)
  }

  function stopSpeech() {
    window.speechSynthesis?.cancel()
    utteranceRef.current = null
    setSpeakingLabel('')
  }

  async function copyToClipboard(text) {
    const message = String(text || '').trim()

    if (!message) {
      return false
    }

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(message)
      } else {
        const textArea = document.createElement('textarea')
        textArea.value = message
        textArea.setAttribute('readonly', '')
        textArea.style.position = 'fixed'
        textArea.style.opacity = '0'
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
      }
      return true
    } catch (error) {
      console.error(`Unable to copy response:`, error)
      return false
    }
  }

  function queueCopyReset(callback) {
    if (copyTimeoutRef.current) {
      clearTimeout(copyTimeoutRef.current)
    }
    copyTimeoutRef.current = window.setTimeout(() => {
      callback()
      copyTimeoutRef.current = null
    }, 1600)
  }

  async function copyResponse(label, text) {
    const copied = await copyToClipboard(text)

    if (!copied) {
      return
    }

    setCopiedLabel(label)
    setConversationCopied(false)
    queueCopyReset(() => {
      setCopiedLabel('')
    })
  }

function splitSentences(text) {
  return String(text || '')
    .trim()
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean)
}

  function normalizeBoundaryRefinement(text) {
    const normalized = String(text || '').trim()

    if (!normalized) {
      return ''
    }

    return /[.!?]$/.test(normalized) ? normalized : `${normalized}.`
  }

  function buildBoundaryMessage() {
    const normalizedBoundary = normalizeBoundaryRefinement(form.boundary)
    const normalizedContext = String(form.whatHappened || form.rawMessage || '').toLowerCase()
    const rawBoundary = normalizedBoundary.replace(/[.!?]+$/, '').trim()

    if (/politic/.test(rawBoundary.toLowerCase()) || /politic/.test(normalizedContext)) {
      return `I'd prefer we avoid political conversations moving forward.`
    }

    if (rawBoundary) {
      const refinedBoundary = rawBoundary
        .replace(/^i do not want to discuss\s+/i, `I'd prefer we avoid `)
        .replace(/^i don't want to discuss\s+/i, `I'd prefer we avoid `)
        .replace(/^i do not want to talk about\s+/i, `I'd prefer we avoid `)
        .replace(/^i don't want to talk about\s+/i, `I'd prefer we avoid `)
        .replace(/^i do not want to\s+/i, `I think it would be better if we don't `)
        .replace(/^i don't want to\s+/i, `I think it would be better if we don't `)
        .replace(/^i would like to avoid\s+/i, `I'd prefer we avoid `)
        .replace(/^i('| a)?d like to avoid\s+/i, `I'd prefer we avoid `)
        .replace(/^i would prefer that we avoid\s+/i, `I'd prefer we avoid `)
        .replace(/^i('| a)?d prefer that we avoid\s+/i, `I'd prefer we avoid `)
        .replace(/^i would prefer to leave out\s+/i, `I'd rather leave out `)
        .replace(/^i('| a)?d prefer to leave out\s+/i, `I'd rather leave out `)
        .replace(/^please do not\s+/i, `I'd prefer we don't `)
        .replace(/^going forward,\s*/i, ``)
        .trim()

      if (!refinedBoundary) {
        return `I'd prefer we avoid political conversations moving forward.`
      }

      if (/^i think it would be better if we don't\b/i.test(refinedBoundary)) {
        return normalizeBoundaryRefinement(refinedBoundary)
      }

      if (/^i('| a)?d prefer we avoid\b/i.test(refinedBoundary)) {
        return normalizeBoundaryRefinement(refinedBoundary)
      }

      if (/^i('| a)?d rather leave out\b/i.test(refinedBoundary)) {
        return normalizeBoundaryRefinement(`${refinedBoundary} moving forward`)
      }

      if (/^i('| a)?d prefer we don't\b/i.test(refinedBoundary)) {
        return normalizeBoundaryRefinement(refinedBoundary)
      }

      return normalizeBoundaryRefinement(`I'd prefer we avoid ${refinedBoundary.replace(/^to\s+/i, ``)}`)
    }

    return `I'd prefer we avoid political conversations moving forward.`
  }

  function deriveCoreEmotion() {
    const customEmotion = String(form.customEmotion || '').trim()
    const primaryEmotion = String(form.primaryEmotion || '').trim()
    const emotionalQuality = String(form.emotionalQuality || '').trim().toLowerCase()
    const groundedImpact = String(form.groundedImpact || '').trim().toLowerCase()
    const adjectiveMap = {
      disappointment: `disappointed`,
      frustration: `frustrated`,
      confusion: `confused`,
      anger: `angry`,
      sadness: `sad`,
      fear: `afraid`,
      uncertainty: `unsure`,
      powerlessness: `powerless`,
    }
    const normalizeEmotionWord = (value) => adjectiveMap[String(value || '').toLowerCase()] || String(value || '').toLowerCase()

    if (customEmotion) {
      return normalizeEmotionWord(customEmotion)
    }

    if (primaryEmotion && primaryEmotion !== 'other') {
      return normalizeEmotionWord(primaryEmotion)
    }

    if (emotionalQuality === 'misunderstanding') {
      return 'misunderstood'
    }

    if (emotionalQuality === 'invalidation') {
      return 'dismissed'
    }

    if (emotionalQuality === 'rejection') {
      return 'rejected'
    }

    if (emotionalQuality === 'abandonment') {
      return 'alone'
    }

    if (emotionalQuality === 'disappointment') {
      return 'disappointed'
    }

    if (emotionalQuality === 'frustration') {
      return 'frustrated'
    }

    if (emotionalQuality === 'anger') {
      return 'angry'
    }

    if (emotionalQuality === 'uncertainty') {
      return 'unsure'
    }

    if (emotionalQuality === 'powerlessness') {
      return 'powerless'
    }

    if (emotionalQuality === 'not being considered') {
      return 'overlooked'
    }

    if (emotionalQuality) {
      return normalizeEmotionWord(emotionalQuality)
    }

    if (/misunderstood|misunderstanding/.test(groundedImpact)) {
      return 'misunderstood'
    }

    if (/disconnect|disconnected|distance|distant/.test(groundedImpact)) {
      return 'disconnected'
    }

    if (/hurt|sad|disappointed/.test(groundedImpact)) {
      return 'hurt'
    }

    if (/frustrated|angry|upset/.test(groundedImpact)) {
      return 'frustrated'
    }

    return normalizeEmotionWord('hurt')
  }

  function buildObservationWithFeeling(emotion, tone) {
    const feelingPhrase = tone === 'soft' ? `a little ${emotion}` : emotion
    return `I noticed some distance between us in our conversation, and I felt ${feelingPhrase}.`
  }

  function buildDefaultCoreMessage(emotion) {
    return [
      `I noticed some distance between us in our conversation, and I felt ${emotion}.`,
      `I'd like to talk this through.`,
    ].join(` `)
  }

  function buildConnectionSentence(tone, emotion) {
    const normalizedEmotion = String(emotion || '').toLowerCase()
    const softOptions = [
      `I'd like us to stay connected through this.`,
      `I don't want this to create distance between us.`,
      `It matters to me that we stay connected here.`,
    ]
    const directOptions = [
      `I want us to stay connected through this.`,
      `I don't want this to create distance between us.`,
      `This matters to me, and I want us to stay connected.`,
    ]
    const sourceOptions = tone === 'direct' ? directOptions : softOptions

    if (/hurt|sad|disconnected|overlooked/.test(normalizedEmotion)) {
      return sourceOptions[1]
    }

    if (/frustrated|angry|dismissed|misunderstood/.test(normalizedEmotion)) {
      return sourceOptions[2]
    }

    return sourceOptions[0]
  }

  function buildRequestTemplate(tone) {
    if (tone === 'soft') {
      return `If you're open to it, I'd like to talk this through.`
    }

    if (tone === 'direct') {
      return `I'd like to talk this through clearly.`
    }

    return `I'd like to talk this through.`
  }

  function getSemanticTokens(value) {
    const stopWords = new Set([
      `the`,
      `and`,
      `that`,
      `this`,
      `with`,
      `from`,
      `have`,
      `been`,
      `more`,
      `very`,
      `just`,
      `into`,
      `your`,
      `there`,
      `would`,
      `could`,
      `should`,
      `going`,
      `forward`,
      `conversation`,
      `talk`,
      `through`,
    ])

    return String(value || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ` `)
      .split(/\s+/)
      .filter((part) => part.length > 3 && !stopWords.has(part))
  }

  function hasSemanticOverlap(firstValue, secondValue) {
    const firstTokens = getSemanticTokens(firstValue)
    const secondTokens = getSemanticTokens(secondValue)

    if (!firstTokens.length || !secondTokens.length) {
      return false
    }

    return secondTokens.filter((token) => firstTokens.includes(token)).length >= 2
  }

  function integrateBoundaryIntoMessage(message, boundaryText) {
    const normalizedMessage = String(message || '').trim()
    const normalizedBoundary = normalizeBoundaryRefinement(boundaryText).replace(/[.!?]+$/, '')

    if (!normalizedMessage) {
      return normalizedBoundary ? `${normalizedBoundary}.` : ''
    }

    if (!normalizedBoundary) {
      return normalizedMessage
    }

    const sentences = splitSentences(normalizedMessage)

    if (!sentences.length) {
      return normalizedMessage
    }

    const nonBoundarySentences = sentences.filter(
      (sentence) =>
        !/i do not want to|i don't want to|i would like to avoid|i('| a)?d like to avoid|i would prefer|i('| a)?d prefer|avoid political conversations|avoid political conversation|discuss politics|political conversations moving forward/i.test(
          sentence,
        ) && !hasSemanticOverlap(sentence, normalizedBoundary),
    )

    return [...nonBoundarySentences, `${normalizedBoundary}.`].filter(Boolean).join(` `).trim()
  }

  function deriveMessageState(_unusedBaseMessage, transformation = transformationState) {
    const emotion = deriveCoreEmotion()

    if (!transformation.relational && !transformation.boundary && transformation.tone === 'neutral') {
      return {
        message: buildDefaultCoreMessage(emotion),
        appliedRelational: false,
        appliedBoundary: false,
      }
    }

    const observationWithFeeling = buildObservationWithFeeling(emotion, transformation.tone)
    const connection = transformation.relational ? buildConnectionSentence(transformation.tone, emotion) : ''
    const request = buildRequestTemplate(transformation.tone)
    const boundary =
      transformation.boundary && String(form.boundaryChoice || '').toLowerCase() === 'yes' ? buildBoundaryMessage() : ''

    const parts = [observationWithFeeling, connection, request, boundary].filter(Boolean)

    return {
      message: parts.join(` `).trim(),
      appliedRelational: Boolean(connection),
      appliedBoundary: Boolean(boundary),
    }
  }

  function getAppliedAdjustmentLabel() {
    const labels = []

    if (transformationState.tone === 'soft') {
      labels.push(`Make it softer`)
    } else if (transformationState.tone === 'direct') {
      labels.push(`Make it more direct`)
    }

    if (transformationState.relational) {
      labels.push(`Add more connection`)
    }

    if (
      transformationState.boundary &&
      String(form.boundaryChoice || '').toLowerCase() === 'yes' &&
      String(form.boundary || '').trim()
    ) {
      labels.push(`Add a boundary`)
    }

    return labels.join(`\n`)
  }

  function buildConversationCopyText(reframes, groundedResult) {
    const finalMessage = String(groundedResult?.response || '').trim()
    const emotionalQualitySelected =
      form.communicationMode === `processing`
        ? [
            form.primaryEmotion || form.customEmotion
              ? `Feeling: ${
                  form.primaryEmotion === `other`
                    ? form.customEmotion || ``
                    : form.customEmotion || form.primaryEmotion || ``
                }`
              : ``,
            form.emotionalQuality ? `Emotional quality: ${form.emotionalQuality}` : ``,
            form.intensity ? `Intensity: ${form.intensity}` : ``,
            form.clarity ? `Clarity: ${form.clarity}` : ``,
            form.reactivity ? `Reactivity: ${form.reactivity}` : ``,
          ]
            .filter(Boolean)
            .join(`\n`)
        : [
            form.groundedImpact ? `What matters: ${form.groundedImpact}` : ``,
            form.otherPersonContext ? `Their context: ${form.otherPersonContext}` : ``,
          ]
            .filter(Boolean)
            .join(`\n`)
    const clarificationOrInsight =
      form.communicationMode === `processing`
        ? [
            form.facts ? `What actually happened: ${form.facts}` : ``,
            form.interpretation ? `What it meant: ${form.interpretation}` : ``,
            form.needs ? `Need: ${form.needs}` : ``,
            form.rawMessage ? `Raw message: ${form.rawMessage}` : ``,
            form.relationship_type ? `Relationship: ${form.relationship_type}` : ``,
            form.relationship_importance ? `Importance: ${form.relationship_importance}` : ``,
          ]
            .filter(Boolean)
            .join(`\n`)
        : [
            form.groundedRequest ? `Request: ${form.groundedRequest}` : ``,
            form.groundedAction ? `Practical help: ${form.groundedAction}` : ``,
            form.relationship_type ? `Relationship: ${form.relationship_type}` : ``,
            form.relationship_importance ? `Importance: ${form.relationship_importance}` : ``,
          ]
            .filter(Boolean)
            .join(`\n`)
    const adjustmentLines = [
      workingMemory.selected_tone ? `Tone: ${titleCase(workingMemory.selected_tone)}` : ``,
      getAppliedAdjustmentLabel() ? `Adjustment: ${getAppliedAdjustmentLabel()}` : ``,
      form.boundary ? `Boundary: ${form.boundary}` : ``,
    ]
      .filter(Boolean)
      .join(`\n`)
    const sections = [
      { label: `Situation`, value: String(form.whatHappened || ``).trim() },
      { label: `Emotional quality selected`, value: emotionalQualitySelected },
      { label: `Clarification or insight`, value: clarificationOrInsight },
      { label: `Adjustment applied`, value: adjustmentLines },
      { label: `Core message`, value: finalMessage },
    ].filter((section) => section.value)

    return sections.map((section) => `${section.label}:\n${section.value}`).join('\n\n').trim()
  }

  async function copyConversation(reframes, groundedResult) {
    const fullText = buildConversationCopyText(reframes, groundedResult)
    console.log(`Copied text:`, fullText)

    let copied = false

    try {
      await navigator.clipboard.writeText(fullText)
      copied = true
    } catch (error) {
      console.error(`Navigator clipboard failed for conversation copy:`, error)
      copied = await copyToClipboard(fullText)
    }

    if (!copied) {
      return
    }

    setConversationCopied(true)
    setCopiedLabel('')
    queueCopyReset(() => {
      setConversationCopied(false)
    })
  }

  function clearVoiceState() {
    setIsRecording(false)
    setIsTranscribing(false)
    setActiveVoiceField('')
    setTranscriptionPreviewField('')
    activeVoiceFieldRef.current = ''
    isRecordingRef.current = false
    audioChunksRef.current = []
    recorderMimeTypeRef.current = ''
  }

  function getDisplayedFieldValue(targetField, currentValue) {
    if (isTranscribing && transcriptionPreviewField === targetField) {
      return `${currentValue}${currentValue.trim() ? '\n\n' : ''}Transcribing...`
    }

    return currentValue
  }

  function applyTranscriptToField(targetField, transcript) {
    if (targetField === 'facts' || targetField === 'interpretation') {
      setDraftValues((prev) => ({
        ...prev,
        [targetField]: appendTranscript(prev[targetField] || formRef.current[targetField] || '', transcript),
      }))
      return
    }

    const draftKey = targetField === 'input' ? (currentStep?.key === 'primaryEmotion' && formRef.current.primaryEmotion === 'other' ? 'customEmotion' : currentStep?.key) : targetField

    if (!draftKey) {
      return
    }

    setDraftValues((prev) => ({
      ...prev,
      [draftKey]: appendTranscript(prev[draftKey] || formRef.current[draftKey] || '', transcript),
    }))
  }

  function appendTranscript(baseText, transcript) {
    const base = baseText.trim()
    const next = transcript.trim()

    if (!next) {
      return baseText
    }

    if (!base) {
      return next
    }

    if (base.toLowerCase().endsWith(next.toLowerCase())) {
      return base
    }

    if (startsAsContinuation(next) && /[.!?][`']?$/.test(base)) {
      const softenedBase = base.replace(/[.][`']?$/, ``).trimEnd()
      return `${softenedBase}${/[\\s\\n]$/.test(baseText) ? `` : ` `}${next}`.trim()
    }

    return `${base}${/[\\s\\n]$/.test(baseText) ? `` : ` `}${next}`.trim()
  }

  async function finalizeRecording(targetField) {
    const chunks = audioChunksRef.current

    if (!chunks.length || !targetField) {
      setSpeechStatus(``)
      updateMicDebug({
        micState: `stopped`,
        micField: targetField || ``,
      })
      clearVoiceState()
      return
    }

    const audioBlob = new Blob(chunks, {
      type: recorderMimeTypeRef.current || chunks[0]?.type || `audio/webm`,
    })

    if (!audioBlob.size) {
      setSpeechStatus(``)
      setSpeechError(`The microphone recording was empty. Please try again.`)
      updateMicDebug({
        micState: `error`,
        micField: targetField,
        lastError: `The microphone recording was empty. Please try again.`,
      })
      clearVoiceState()
      return
    }

    setIsTranscribing(true)
    setTranscriptionPreviewField(targetField)
    setSpeechStatus(`Transcribing...`)
    updateMicDebug({
      micState: `transcribing`,
      micField: targetField,
    })

    try {
      const transcript = await transcribeAudio(
        audioBlob,
        recorderMimeTypeRef.current || audioBlob.type || `audio/webm`,
        {},
        updateDebugState,
      )

      if (!transcript.trim()) {
        setSpeechStatus(``)
        setSpeechError(`I could not catch that. Try again or type it instead.`)
        return
      }

      applyTranscriptToField(targetField, transcript)
      setSpeechError(``)
      setSpeechStatus(`Transcript added.`)
      updateMicDebug({
        micState: `stopped`,
        micField: targetField,
      })
    } catch (error) {
      setSpeechStatus(``)
      setSpeechError(error.message || `Unable to transcribe audio right now.`)
      updateMicDebug({
        micState: `error`,
        micField: targetField,
        lastError: error.message || `Unable to transcribe audio right now.`,
      })
    } finally {
      setIsTranscribing(false)
      clearVoiceState()
    }
  }

  async function startRecording(targetField = `input`) {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === `undefined`) {
      setSpeechError(`Microphone recording is not supported in this browser.`)
      setSpeechStatus(``)
      updateMicDebug({
        micSupported: false,
        micState: `unsupported browser`,
        micField: targetField,
        lastError: `Microphone recording is not supported in this browser.`,
      })
      return
    }

    try {
      if (isRecording || isTranscribing) {
        return
      }

      setSpeechError(``)
      setSpeechStatus(`Requesting microphone access...`)
      setActiveVoiceField(targetField)
      activeVoiceFieldRef.current = targetField
      audioChunksRef.current = []
      updateMicDebug({
        micSupported: true,
        micPermission: `requesting`,
        micState: `requesting permission`,
        micField: targetField,
        lastError: ``,
      })

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })

      mediaStreamRef.current?.getTracks()?.forEach((track) => track.stop())
      mediaStreamRef.current = stream
      setSpeechStatus(`Recording...`)
      updateMicDebug({
        micPermission: `granted`,
        micState: `recording`,
        micField: targetField,
      })

      const mimeType = getRecorderMimeType()
      recorderMimeTypeRef.current = mimeType

      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)

      recorder.ondataavailable = (event) => {
        if (event.data?.size) {
          audioChunksRef.current.push(event.data)
        }
      }

      recorder.onerror = () => {
        mediaStreamRef.current?.getTracks()?.forEach((track) => track.stop())
        mediaStreamRef.current = null
        setSpeechStatus(``)
        setSpeechError(`The microphone recording failed. Please try again.`)
        updateMicDebug({
          micState: `error`,
          micField: targetField,
          lastError: `The microphone recording failed. Please try again.`,
        })
        clearVoiceState()
      }

      recorder.onstop = async () => {
        mediaRecorderRef.current = null
        isRecordingRef.current = false
        setIsRecording(false)
        mediaStreamRef.current?.getTracks()?.forEach((track) => track.stop())
        mediaStreamRef.current = null
        updateMicDebug({
          micState: `stopped`,
          micField: targetField,
        })

        await finalizeRecording(targetField)
      }

      mediaRecorderRef.current = recorder
      recorder.start()
      isRecordingRef.current = true
      setIsRecording(true)
    } catch (error) {
      mediaStreamRef.current?.getTracks()?.forEach((track) => track.stop())
      mediaStreamRef.current = null
      setSpeechStatus(``)
      const message =
        error?.name === `NotAllowedError`
          ? `Microphone access was blocked. Please allow it and try again.`
          : `Unable to start microphone recording.`
      setSpeechError(message)
      updateMicDebug({
        micPermission: error?.name === `NotAllowedError` ? `denied` : debugState.micPermission,
        micState: error?.name === `NotAllowedError` ? `permission denied` : `error`,
        micField: targetField,
        lastError: message,
      })
      clearVoiceState()
    }
  }

  function stopRecording() {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === `inactive`) {
      clearVoiceState()
      setSpeechStatus(``)
      updateMicDebug({
        micState: `stopped`,
        micField: activeVoiceFieldRef.current || ``,
      })
      return
    }

    setSpeechStatus(`Finishing recording...`)
    updateMicDebug({
      micState: `stopping`,
      micField: activeVoiceFieldRef.current || ``,
    })
    isRecordingRef.current = false
    mediaRecorderRef.current.requestData?.()
    mediaRecorderRef.current.stop()
  }

  function queueAssistantPrompt(nextStepIndex, nextForm) {
    const nextStep = getStepsForMode(nextForm.communicationMode)[nextStepIndex]
    if (!nextStep) {
      return
    }

    const additions = []
    if (nextStep.key === `primaryEmotion`) {
      additions.push(
        createMessage(
          `assistant`,
          `Based on what you shared, I'm hearing ${titleCase(nextForm.primaryEmotion)} most strongly.`,
        ),
      )
    }

    additions.push(createMessage('assistant', nextStep.prompt))
    setMessages((prev) => [...prev, ...additions])
  }

  async function requestReframes(nextForm, options = {}) {
    const failureStepIndex = options.failureStepIndex ?? stepIndexRef.current
    const failureReason = options.failureReason || 'generation failed'
    const isGroundedMode = nextForm.communicationMode === 'grounded'

    setIsGenerating(true)
    setGenerationError('')

    try {
      const result = await generateReframes(
        nextForm,
        {
          stepKey: options.triggerStepKey || '',
        },
        updateDebugState,
      )
      setMessages((prev) => [
        ...prev,
        createMessage(
          'assistant',
          isGroundedMode
                    ? 'If you were fully authentic, it might sound like this. Use it as a guide and make it your own.'
                    : 'If you were fully authentic, it might sound like this. Use it as a guide and make it your own.',
        ),
        createMessage('assistant', '', { variant: 'final-result', finalResult: result }),
      ])
      setCompleted(true)
    } catch (error) {
      if (isBehaviorClarificationError(error.message)) {
        const friendlyMessage = behaviorClarificationMessage
        const validationField = error.field || 'facts'
        const validationValidator = error.validator || 'behavior'

        setCompleted(false)
        setDraftValues((prev) => ({
          ...prev,
          facts: nextForm.facts || form.facts || '',
          interpretation: nextForm.interpretation || form.interpretation || '',
          rawMessage: nextForm.rawMessage || form.rawMessage || '',
          boundary: nextForm.boundary || form.boundary || '',
        }))
        setGenerationError(friendlyMessage)
        updateDebugState({
          validationField,
          validationValidator,
          downstreamValidationField: validationField,
          downstreamValidationValidator: validationValidator,
          lastResponse: `Validation failed on ${validationField} using ${validationValidator}`,
        })
        setMessages((prev) => [...prev, createMessage('assistant', friendlyMessage)])
        changeStep(failureStepIndex, `${failureReason}: behavior clarification requested`, {
          nextForm,
        })
        console.log('Raw expression generation blocked by clarification need:', {
          rawExpression: nextForm.rawMessage || '',
          savedRawExpression: nextForm.rawMessage || formRef.current.rawMessage || '',
          currentStepBeforeFallback: getStepsForMode(nextForm.communicationMode)[failureStepIndex]?.key || 'complete',
          currentStepAfterFallback: getStepsForMode(nextForm.communicationMode)[failureStepIndex]?.key || 'complete',
          reason: `${failureReason}: behavior clarification requested`,
        })
        return
      }

      setGenerationError(error.message)
      setDraftValues((prev) => ({
        ...prev,
        rawMessage: nextForm.rawMessage || form.rawMessage || '',
      }))
      changeStep(failureStepIndex, failureReason, {
        nextForm,
      })
      setMessages((prev) => [
        ...prev,
        createMessage(
          'assistant',
          error.message ||
            'I ran into a problem generating the responses. Please check your API setup and try again.',
        ),
      ])
    } finally {
      setIsGenerating(false)
    }
  }

  async function advanceStep(value) {
    const activeStepIndex = stepIndexRef.current
    const step = getStepsForMode(formRef.current.communicationMode)[activeStepIndex]
    const currentForm = formRef.current
    const nextValue =
      step.key === 'primaryEmotion' ? value : typeof value === 'string' ? value.trim() : value

    if (!step?.optional && !nextValue) return

    const validationError = validateStepValue(step, nextValue)
    const submissionMeta = getSubmissionValidationMeta(step)

    console.log('Step submit validation target:', {
      currentStepId: step?.key || 'unknown',
      submittedFieldName: submissionMeta.field,
      validatorName: submissionMeta.validator,
    })
    updateDebugState({
      currentStepId: step?.key || '',
      submittedFieldName: submissionMeta.field,
      submittedValidatorName: submissionMeta.validator,
    })

    if (validationError) {
      setGenerationError(validationError.message)
      updateDebugState({
        validationField: validationError.field,
        validationValidator: validationError.validator,
        lastResponse: `Validation blocked on ${validationError.field} using ${validationError.validator}`,
      })
      return
    }

    setGenerationError('')

    if (voiceEnabledStepKeys.has(step.key)) {
      stopRecording()
    }

    const updatedForm =
      step.key === 'communicationMode'
        ? {
            ...currentForm,
            communicationMode: nextValue,
          }
        : step.key === 'meaningSplit'
        ? {
            ...currentForm,
            facts: String(value?.facts || '').trim(),
            interpretation: String(value?.interpretation || '').trim(),
          }
        : step.key === 'primaryEmotion' && currentForm.primaryEmotion === 'other'
          ? {
              ...currentForm,
              customEmotion: typeof nextValue === 'string' ? nextValue.trim() : nextValue,
            }
          : {
              ...currentForm,
              [step.key]: nextValue,
            }

    if (step.key === 'boundaryChoice' && nextValue === 'No') {
      updatedForm.boundary = ''
    }

    if (step.key === 'whatHappened') {
      updatedForm.primaryEmotion = detectEmotion(nextValue)
    }

    if (step.key === 'meaningSplit') {
      setMessages((prev) => [
        ...prev,
        createMessage('user', `What actually happened: ${updatedForm.facts}`),
        createMessage('user', `What it felt like or meant: ${updatedForm.interpretation}`),
      ])
    } else if (step.key === 'communicationMode') {
      setMessages((prev) => [
        ...prev,
        createMessage('user', communicationModeOptions.find((option) => option.value === nextValue)?.label || nextValue),
      ])
    } else if (step.key === 'primaryEmotion' && currentForm.primaryEmotion === 'other') {
      setMessages((prev) => [...prev, createMessage('user', updatedForm.customEmotion)])
    } else {
      setMessages((prev) => [...prev, createMessage('user', nextValue || (step.skipLabel || 'Skipped'))])
    }

    setForm(updatedForm)
    setDraftValues((prev) => ({
      ...prev,
      ...updatedForm,
    }))
    const nextCompletedSteps = completedStepKeysRef.current.includes(step.key)
      ? completedStepKeysRef.current
      : [...completedStepKeysRef.current, step.key]
    setCompletedStepKeys(nextCompletedSteps)

    if (step.key === 'whatHappened') {
      const suggestedMode = detectCommunicationMode(nextValue)

      if (suggestedMode && updatedForm.communicationMode && suggestedMode !== updatedForm.communicationMode) {
        setModeSuggestion({
          suggestedMode,
          currentMode: updatedForm.communicationMode,
          nextForm: updatedForm,
          nextCompletedSteps,
        })
        return
      }
    }

    let nextStepIndex = activeStepIndex + 1

    if (step.key === 'boundaryChoice' && nextValue === 'No') {
      nextStepIndex = getStepsForMode(updatedForm.communicationMode).length
    }

    if (step.key === 'rawMessage' || step.key === 'groundedAction') {
      changeStep(nextStepIndex, `advanced after completing ${step.key}`, {
        nextForm: updatedForm,
        nextCompletedSteps,
      })
      queueAssistantPrompt(nextStepIndex, updatedForm)
      return
    }

    if (step.key === 'boundary' || (step.key === 'boundaryChoice' && nextValue === 'No')) {
      console.log('Raw expression submit:', {
        rawExpression: nextValue,
        savedRawExpression: updatedForm.rawMessage || '',
        currentStepBeforeSubmit: step.key,
        currentStepAfterSubmit: 'generating',
        reason: 'final message submitted',
      })
      logStepState('final message submitted -> generating', activeStepIndex, updatedForm, nextCompletedSteps)
      await requestReframes(updatedForm, {
        failureStepIndex: activeStepIndex,
        failureReason: 'final message generation failed, staying on current step',
        triggerStepKey: step.key,
      })
      return
    }

    changeStep(nextStepIndex, `advanced after completing ${step.key}`, {
      nextForm: updatedForm,
      nextCompletedSteps,
    })
    queueAssistantPrompt(nextStepIndex, updatedForm)

    if (nextStepIndex >= getStepsForMode(updatedForm.communicationMode).length) {
      await requestReframes(updatedForm)
    }
  }

  function submitText(event) {
    event.preventDefault()
    if (currentStep?.key === 'meaningSplit') {
      if (!currentDualInput.facts.trim() || !currentDualInput.interpretation.trim()) return
      advanceStep(currentDualInput)
      return
    }
    advanceStep(currentInputValue)
  }

  async function resolveModeSuggestion(useSuggestedMode) {
    if (!modeSuggestion) {
      return
    }

    const nextMode = useSuggestedMode ? modeSuggestion.suggestedMode : modeSuggestion.currentMode
    const nextForm = {
      ...modeSuggestion.nextForm,
      communicationMode: nextMode,
    }
    const nextCompletedSteps = modeSuggestion.nextCompletedSteps
    const nextStepIndex = getStepIndexForKey(nextMode, 'whatHappened') + 1

    setModeSuggestion(null)
    setForm(nextForm)
    setDraftValues((prev) => ({
      ...prev,
      ...nextForm,
    }))
    setMessages((prev) => [
      ...prev,
      createMessage(
        'assistant',
        useSuggestedMode
          ? `A grounded fit looks more like ${communicationModeLabels[nextMode]}. I'll guide you that way from here.`
          : `We can stay with ${communicationModeLabels[nextMode]} and keep going.`,
      ),
    ])
    changeStep(nextStepIndex, `mode suggestion resolved`, {
      nextForm,
      nextCompletedSteps,
    })
    queueAssistantPrompt(nextStepIndex, nextForm)
  }

  function handleChipClick(option) {
    if (currentStep?.key === `communicationMode`) {
      advanceStep(option)
      return
    }

    if (currentStep?.key === `primaryEmotion` && option === `other`) {
      stopRecording()
      setForm((prev) => ({ ...prev, primaryEmotion: `other` }))
      updateDraftValue(`customEmotion`, formRef.current.customEmotion || ``)
      return
    }

    if (currentStep?.key === `primaryEmotion` && form.primaryEmotion === `other`) {
      setForm((prev) => ({ ...prev, customEmotion: ``, primaryEmotion: option }))
      updateDraftValue(`customEmotion`, ``)
    }

    if (currentStep?.type === `text-with-options`) {
      const nextText = currentInputValue
        ? `${currentInputValue}${currentInputValue.endsWith(',') ? ' ' : ', '}${option}`
        : option
      updateDraftValue(currentStep.key, nextText)
      return
    }

    advanceStep(option)
  }

  function resetFlow() {
    stopSpeech()
    stopRecording()
    clearPersistedFlowState()
    setForm({})
    setDraftValues({})
    setCompletedStepKeys([])
    setCompleted(false)
    setIsGenerating(false)
    setGenerationError(``)
    setShowGroundingIntro(true)
    setSpeechError(``)
    setSpeechStatus(``)
    setActiveVoiceField(``)
    setCopiedLabel(``)
    setConversationCopied(false)
    setTransformationState(defaultTransformationState)
    setWorkingMemory(emptyWorkingMemory)
    setModeSuggestion(null)
    setMessages([
      createMessage(
        `assistant`,
        `I'm here with you. We'll go step by step, understand what you're feeling, gently turn toward your experience, and shape a clear way to express it without overwhelm.`,
      ),
      createMessage('assistant', modeSelectionStep.prompt),
    ])
    changeStep(0, 'flow reset', {
      nextForm: {},
      nextCompletedSteps: [],
    })
  }

  const activePrompt = completed
    ? 'Here is your draft message.'
    : stepIndex >= activeSteps.length
      ? 'Your message is almost ready.'
      : currentStep?.prompt || ''
  const currentGuidanceKey = isCustomEmotionEntry ? 'customEmotion' : currentStep?.key
  const activeGuidance = [
    ...(stepTransitions[currentGuidanceKey] ? [stepTransitions[currentGuidanceKey]] : []),
    ...(stepGuidance[currentGuidanceKey] || []),
  ]

  const completedStepSummaries =
    form.communicationMode === 'grounded'
      ? [
          form.communicationMode ? { label: 'Mode', value: communicationModeLabels[form.communicationMode] } : null,
          form.whatHappened ? { label: 'What happened', value: summarizeValue(form.whatHappened) } : null,
          form.otherPersonContext ? { label: 'Their context', value: summarizeValue(form.otherPersonContext) } : null,
          form.groundedImpact ? { label: 'What matters', value: summarizeValue(form.groundedImpact) } : null,
          form.groundedRequest ? { label: 'Request', value: summarizeValue(form.groundedRequest) } : null,
          form.groundedAction ? { label: 'Practical help', value: summarizeValue(form.groundedAction) } : null,
          form.boundaryChoice ? { label: 'Boundary', value: form.boundaryChoice } : null,
          form.boundary ? { label: 'Boundary details', value: summarizeValue(form.boundary) } : null,
        ].filter(Boolean)
      : [
          form.communicationMode ? { label: 'Mode', value: communicationModeLabels[form.communicationMode] } : null,
          form.intensity ? { label: 'Intensity', value: form.intensity } : null,
          form.clarity ? { label: 'Clarity', value: form.clarity } : null,
          form.reactivity ? { label: 'Reactivity', value: form.reactivity } : null,
          form.whatHappened ? { label: 'What happened', value: summarizeValue(form.whatHappened) } : null,
          (form.customEmotion || form.primaryEmotion) && completedStepKeys.includes('primaryEmotion')
            ? {
                label: 'Emotion',
                value: form.primaryEmotion === 'other' ? form.customEmotion : titleCase(form.primaryEmotion),
              }
            : null,
          form.emotionalQuality ? { label: 'Emotional quality', value: form.emotionalQuality } : null,
          form.relationship_type ? { label: 'Relationship', value: form.relationship_type } : null,
          form.relationship_importance ? { label: 'Importance', value: form.relationship_importance } : null,
          form.facts ? { label: 'What actually happened', value: summarizeValue(form.facts) } : null,
          form.interpretation ? { label: 'What it meant', value: summarizeValue(form.interpretation) } : null,
          form.needs ? { label: 'Need', value: summarizeValue(form.needs) } : null,
          form.rawMessage ? { label: 'Raw message', value: summarizeValue(form.rawMessage) } : null,
          form.boundaryChoice ? { label: 'Boundary', value: form.boundaryChoice } : null,
          form.boundary ? { label: 'Boundary details', value: summarizeValue(form.boundary) } : null,
        ].filter(Boolean)
  const finalResult = messages.find((message) => message.variant === 'final-result')?.finalResult || null
  const finalToneVariants = finalResult?.toneVariants || null
  const baseFinalMessage =
    (transformationState.tone === 'soft'
      ? finalToneVariants?.soft
      : transformationState.tone === 'direct'
        ? finalToneVariants?.firm
        : null) ||
    finalToneVariants?.balanced ||
    finalResult?.response ||
    ''
  const activeMessageState = deriveMessageState(baseFinalMessage)
  const activeFinalMessage = activeMessageState.message
  const hasBoundaryAvailable =
    String(form.boundaryChoice || '').toLowerCase() === 'yes' && !!String(form.boundary || '').trim()

  useEffect(() => {
    if (didRestoreFlowStateRef.current) {
      didRestoreFlowStateRef.current = false
      return
    }

    setTransformationState(defaultTransformationState)
  }, [completed, finalResult])

  useEffect(() => {
    persistFlowStateSnapshot({
      messages,
      form,
      draftValues,
      completedStepKeys,
      stepIndex,
      completed,
      showGroundingIntro,
      transformationState,
      workingMemory,
      modeSuggestion,
    })
  }, [
    completed,
    completedStepKeys,
    draftValues,
    form,
    messages,
    modeSuggestion,
    showGroundingIntro,
    stepIndex,
    transformationState,
    workingMemory,
  ])

  useEffect(() => {
    const nextMemory = deriveWorkingMemory(form, transformationState, activeFinalMessage)

    if (!hasWorkingMemory(nextMemory)) {
      setWorkingMemory(emptyWorkingMemory)
      return
    }

    setWorkingMemory((previousMemory) => {
      if (!hasWorkingMemory(previousMemory)) {
        return nextMemory
      }

      if (!isSameActiveThread(previousMemory, nextMemory)) {
        return nextMemory
      }

      return {
        ...previousMemory,
        ...Object.fromEntries(Object.entries(nextMemory).filter(([, value]) => value)),
      }
    })
  }, [activeFinalMessage, form, transformationState])

  useEffect(() => {
    console.log('Render state:', {
      stepIndex,
      currentStep: currentStep?.key || '',
      completed,
      isGenerating,
      generationError,
      messages: messages.length,
      finalResult: Boolean(finalResult),
      completedSteps: completedStepKeys,
      savedValuesStatus: buildSavedValuesStatus(form),
    })
  }, [stepIndex, currentStep, completed, isGenerating, generationError, messages.length, finalResult, completedStepKeys, form])

  return (
    <div className="min-h-screen bg-[#eef3ee] text-slate-800">
      {isDev && (
        <>
          <button
            type="button"
            onClick={() => setShowDebug((prev) => !prev)}
            className="fixed right-2 top-2 z-50 min-h-[40px] rounded-full border border-slate-200 bg-white/90 px-3 py-2 text-xs font-semibold text-pine shadow-sm backdrop-blur"
          >
            {showDebug ? 'Hide Debug' : 'Debug'}
          </button>
          {showDebug && (
            <div className="fixed inset-x-2 bottom-2 z-50 rounded-[20px] border border-slate-200 bg-white/95 px-3 py-2 text-[11px] leading-5 text-slate-700 shadow-lg backdrop-blur">
              <p className="font-semibold text-pine">Debug</p>
              <p>App mounted: {debugState.appMounted ? 'yes' : 'no'}</p>
              <p>API base URL: {debugState.apiBaseUrl || 'missing'}</p>
              <p>Route: {debugState.currentRoute || '/'}</p>
              <p>Initial render completed: {debugState.initialRenderCompleted ? 'yes' : 'no'}</p>
              <p>Fetch started: {debugState.fetchStarted ? 'yes' : 'no'}</p>
              <p>Fetch status: {debugState.fetchStatus}</p>
              <p>Caught error: {debugState.lastError || 'none'}</p>
              <p>Last response summary: {debugState.lastResponse || 'none'}</p>
              <p>Current step id: {debugState.currentStepId || 'none'}</p>
              <p>Submitted field name: {debugState.submittedFieldName || 'none'}</p>
              <p>Submitted validator: {debugState.submittedValidatorName || 'none'}</p>
              <p>Validation field: {debugState.validationField || 'none'}</p>
              <p>Validator: {debugState.validationValidator || 'none'}</p>
              <p>Downstream validation field: {debugState.downstreamValidationField || 'none'}</p>
              <p>Downstream validator: {debugState.downstreamValidationValidator || 'none'}</p>
              <p>Mic supported: {debugState.micSupported ? 'yes' : 'no'}</p>
              <p>Mic permission: {debugState.micPermission}</p>
              <p>Mic state: {debugState.micState}</p>
              <p>Mic field: {debugState.micField || 'none'}</p>
              <p>window.onerror: {debugState.lastWindowError || 'none'}</p>
              <p>unhandledrejection: {debugState.lastUnhandledRejection || 'none'}</p>
            </div>
          )}
        </>
      )}
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-4 px-3 py-3 sm:px-5 sm:py-5 lg:flex-row lg:gap-6 lg:px-8">
        <aside className="hidden rounded-[28px] border border-white/60 bg-[linear-gradient(160deg,rgba(255,255,255,0.9),rgba(239,231,218,0.76))] p-4 shadow-calm backdrop-blur sm:p-5 lg:block lg:w-[340px] lg:rounded-[32px] lg:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-pine/60 sm:text-sm">True Voice</p>
              <h1 className="mt-2 text-2xl font-semibold leading-tight text-pine sm:text-3xl">Emotional clarity coach</h1>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-[20px] bg-pine text-sm font-semibold text-white sm:h-14 sm:w-14 sm:rounded-3xl">
              {assistantAvatar}
            </div>
          </div>

          <p className="mt-4 text-sm leading-7 text-slate-600">
            A simple guided chat to help you move from emotional charge to a clearer expression of
            what happened, what it meant, and what you need next.
          </p>

          {communicationMode && (
            <div className="mt-4 rounded-[20px] bg-[#f3f7f3] px-4 py-3 text-sm text-pine">
              <p className="font-semibold">Mode: {communicationModeLabels[communicationMode]}</p>
              <p className="mt-1 leading-6 text-slate-600">
                {communicationModeDescriptions[communicationMode]}
              </p>
            </div>
          )}

          {hasWorkingMemory(workingMemory) && (
            <div className="mt-4 rounded-[20px] bg-white/80 px-4 py-3 text-sm text-slate-600">
              <p className="font-semibold text-pine">Current thread</p>
              <div className="mt-2 grid gap-2">
                {workingMemory.current_topic && (
                  <p>
                    <span className="font-medium text-pine">Situation:</span> {summarizeValue(workingMemory.current_topic)}
                  </p>
                )}
                {workingMemory.core_feeling && (
                  <p>
                    <span className="font-medium text-pine">Feeling:</span> {summarizeValue(workingMemory.core_feeling)}
                  </p>
                )}
                {workingMemory.selected_tone && (
                  <p>
                    <span className="font-medium text-pine">Tone:</span> {titleCase(workingMemory.selected_tone)}
                  </p>
                )}
                {workingMemory.communication_goal && (
                  <p>
                    <span className="font-medium text-pine">Goal:</span> {summarizeValue(workingMemory.communication_goal)}
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="mt-5 rounded-[24px] bg-white/80 p-4">
            <div className="flex items-center justify-between text-sm text-slate-500">
              <span>Conversation progress</span>
              <span>{completed ? 100 : progress}%</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-gradient-to-r from-pine to-sage transition-all duration-500"
                style={{ width: `${completed ? 100 : Math.max(progress, 8)}%` }}
              />
            </div>
          </div>

          <div className="mt-5 grid gap-3 text-sm text-slate-600">
            <div className="rounded-[24px] bg-white/80 p-4">
              <p className="font-semibold text-pine">Flow</p>
              <p className="mt-2 leading-6">
                Check in, name what happened, and shape it into one clear message you can actually use.
              </p>
            </div>
            <div className="rounded-[24px] bg-[#f6fbf7] p-4">
              <p className="font-semibold text-pine">Use It Fast</p>
              <p className="mt-2 leading-6">
                Speak or type in the moment, pause, and keep moving. The prompts stay calm and the
                controls stay within thumb reach.
              </p>
            </div>
          </div>
        </aside>

        <main className="flex min-h-[72vh] flex-1 flex-col overflow-hidden rounded-[28px] border border-white/70 bg-white/88 shadow-calm backdrop-blur lg:min-h-[75vh] lg:rounded-[32px]">
          <div className="border-b border-slate-200/80 bg-white/70 px-4 py-4 sm:px-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-pine/55 sm:text-xs">Conversation</p>
                <p className="mt-1 text-base font-semibold leading-6 text-pine sm:text-lg">
                  {communicationMode === 'grounded'
                    ? 'Express what matters with calm clarity.'
                    : 'Sort the feeling before sending the message.'}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                {communicationMode && (
                  <div className="rounded-full bg-[#eef7ef] px-3 py-1 text-[11px] font-semibold text-pine">
                    Mode: {communicationModeLabels[communicationMode]}
                  </div>
                )}
                <div className="rounded-full bg-[#f3f7f3] px-3 py-1.5 text-xs font-semibold text-pine">
                  {completed ? 100 : progress}%
                </div>
              </div>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-600 lg:hidden">
              One step at a time. Keep it simple and we will shape it with you.
            </p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-gradient-to-r from-pine to-sage transition-all duration-500"
                style={{ width: `${completed ? 100 : Math.max(progress, 8)}%` }}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top,_rgba(132,169,140,0.14),_transparent_32%),linear-gradient(180deg,rgba(255,255,255,0.82),rgba(244,247,244,0.98))] px-3 py-4 sm:px-6 sm:py-5">
            <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
              {showGroundingIntro ? (
                <div className="rounded-[26px] bg-[#fcf8f1] px-4 py-5 shadow-sm sm:px-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-pine/55">Arrive first</p>
                  <div className="mt-2 space-y-1">
                    {openingGroundingLines.map((line) => (
                      <p key={line} className="text-sm leading-6 text-slate-600">
                        {line}
                      </p>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowGroundingIntro(false)}
                    className="mt-4 min-h-[52px] w-full rounded-[18px] bg-pine px-4 py-3 text-base font-semibold text-white transition hover:bg-[#0f2c21] sm:w-auto sm:min-h-[48px] sm:py-2.5 sm:text-sm"
                  >
                    Continue
                  </button>
                </div>
              ) : !completed && stepIndex < activeSteps.length && (
                <div className="rounded-[26px] bg-[#fcf8f1] px-4 py-5 shadow-sm sm:px-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-pine/55">Current step</p>
                  {activeGuidance.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {activeGuidance.map((line) => (
                        <p key={line} className="text-sm leading-6 text-slate-600">
                          {line}
                        </p>
                      ))}
                    </div>
                  )}
                  <p className="mt-2 text-lg font-semibold leading-7 text-pine">{activePrompt}</p>
                  {generationError && (
                    <div className="mt-3 rounded-[18px] bg-white/80 px-4 py-3 text-sm leading-6 text-slate-600">
                      {generationError.split('\n').map((line) => (
                        <p key={line}>{line}</p>
                      ))}
                    </div>
                  )}
                  {modeSuggestion && (
                    <div className="mt-4 rounded-[20px] bg-white/85 px-4 py-4 text-sm leading-6 text-slate-600">
                      <p className="font-semibold text-pine">
                        Suggested mode: {communicationModeLabels[modeSuggestion.suggestedMode]}
                      </p>
                      <p className="mt-2">
                        Your wording sounds more like{' '}
                        {modeSuggestion.suggestedMode === 'processing'
                          ? 'an activated moment that may need sorting before expression.'
                          : 'a mostly clear moment that may work better with direct expression support.'}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {completed && finalResult && (
                <div className="w-full rounded-[24px] bg-[#f3f7f3] p-3 sm:rounded-[28px] sm:p-4">
                  <div className="mb-3 rounded-[22px] bg-white/70 px-4 py-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-pine/55">Completed</p>
                        <p className="mt-2 text-lg font-semibold leading-7 text-pine">
                          Here is the core message.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[22px] bg-white p-4 shadow-sm sm:p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pine/60 sm:text-sm">
                      Core Message
                    </p>
                    <p className="mt-3 text-[15px] leading-7 text-slate-700 sm:text-sm">{activeFinalMessage}</p>
                    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm leading-6 text-slate-600">
                        Adjust the message if you want to change how it lands.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => copyResponse('final-message', activeFinalMessage)}
                          className="min-h-[44px] rounded-full bg-pine px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0f2c21]"
                        >
                          {copiedLabel === 'final-message' ? 'Message copied' : 'Copy Message'}
                        </button>
                        <button
                          type="button"
                          onClick={() => copyConversation([], { response: activeFinalMessage })}
                          className="min-h-[44px] rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-pine transition hover:border-slate-300 hover:bg-slate-50"
                        >
                          {conversationCopied ? 'Conversation copied' : 'Copy Conversation'}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            speakingLabel === 'final-message'
                              ? stopSpeech()
                              : speakResponse('final-message', activeFinalMessage)
                          }
                          className="min-h-[44px] rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
                        >
                          {speakingLabel === 'final-message' ? 'Stop' : 'Play'}
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 rounded-[22px] bg-white/70 px-4 py-4">
                    <p className="text-sm font-semibold leading-6 text-pine">Do you want to adjust this?</p>
                    <div className="mt-3 flex flex-wrap gap-2.5">
                      {[
                        {
                          key: 'soft',
                          label: 'Make it softer',
                          disabled: !String(finalToneVariants?.soft || '').trim(),
                        },
                        {
                          key: 'direct',
                          label: 'Make it more direct',
                          disabled: !String(finalToneVariants?.firm || '').trim(),
                        },
                        {
                          key: 'boundary',
                          label: 'Add a boundary',
                          disabled: !hasBoundaryAvailable,
                        },
                        { key: 'relational', label: 'Add more connection', disabled: false },
                      ].map((item) => (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => {
                            if (item.disabled) {
                              return
                            }

                            if (item.key === 'soft') {
                              setTransformationState((current) => ({
                                ...current,
                                tone: 'soft',
                              }))
                              return
                            }

                            if (item.key === 'direct') {
                              setTransformationState((current) => ({
                                ...current,
                                tone: 'direct',
                              }))
                              return
                            }

                            if (item.key === 'boundary') {
                              if (!hasBoundaryAvailable) {
                                return
                              }

                              setTransformationState((current) => ({
                                ...current,
                                boundary: !current.boundary,
                              }))
                              return
                            }

                            if (item.key === 'relational') {
                              setTransformationState((current) => ({
                                ...current,
                                relational: !current.relational,
                              }))
                              return
                            }
                          }}
                          disabled={item.disabled}
                          className={`min-h-[46px] rounded-full border px-4 py-2 text-sm font-medium transition ${
                            ((item.key === 'soft' && transformationState.tone === 'soft') ||
                              (item.key === 'direct' && transformationState.tone === 'direct') ||
                              (item.key === 'boundary' && transformationState.boundary) ||
                              (item.key === 'relational' && transformationState.relational))
                              ? 'border-sage bg-[#eef7ef] text-pine'
                              : item.disabled
                                ? 'border-slate-200 bg-slate-50 text-slate-400'
                                : 'border-slate-200 bg-white text-slate-700 hover:border-sage hover:bg-[#f8fbf8]'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                    <div className="mt-3 rounded-[18px] bg-white/80 px-3 py-2 text-xs leading-5 text-slate-600">
                      <p>
                        Tone: {transformationState.tone === 'soft' ? 'Soft' : transformationState.tone === 'direct' ? 'Direct' : 'Neutral'}
                      </p>
                      <p>Connection: {transformationState.relational ? 'Added' : 'Off'}</p>
                      <p>Boundary: {transformationState.boundary ? 'Added' : 'Off'}</p>
                    </div>
                  </div>
                </div>
              )}

              {!!completedStepSummaries.length && (
                <details className="rounded-[24px] border border-white/70 bg-white/76 p-4 shadow-sm">
                  <summary className="cursor-pointer list-none text-sm font-semibold text-pine">
                    Progress so far
                  </summary>
                  <div className="mt-3 grid gap-2">
                    {completedStepSummaries.map((item) => (
                      <div key={item.label} className="rounded-[18px] bg-[#f8fbf8] px-3 py-2.5">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-pine/55">
                          {item.label}
                        </p>
                        <p className="mt-1 text-sm leading-6 text-slate-700">{item.value}</p>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
            <div ref={endRef} />
          </div>

          <div className="sticky bottom-0 border-t border-slate-200/80 bg-white/95 px-3 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] pt-3 shadow-[0_-10px_30px_rgba(148,163,184,0.12)] backdrop-blur sm:px-6 sm:py-4">
            {completed ? (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm leading-6 text-slate-600">
                  You can restart the flow and try the same situation again with different wording.
                </p>
                <button
                  type="button"
                  onClick={resetFlow}
                  className="min-h-[52px] rounded-[20px] bg-pine px-5 py-3 text-base font-semibold text-white transition hover:bg-[#0f2c21]"
                >
                  Start over
                </button>
              </div>
            ) : isGenerating ? (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm leading-6 text-slate-600">
                  {communicationMode === 'grounded'
                    ? 'Generating your message. This can take a moment.'
                    : 'Generating your message. This can take a moment.'}
                </p>
                <div className="rounded-full bg-[#f3f7f3] px-4 py-2 text-sm font-medium text-pine">
                  Working...
                </div>
              </div>
            ) : stepIndex >= activeSteps.length ? (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm leading-6 text-slate-600">
                  {generationError || 'Something interrupted the response generation.'}
                </p>
                <button
                  type="button"
                  onClick={() => requestReframes(form)}
                  className="min-h-[52px] rounded-[20px] bg-pine px-5 py-3 text-base font-semibold text-white transition hover:bg-[#0f2c21]"
                >
                  Try again
                </button>
              </div>
            ) : showGroundingIntro ? null : modeSuggestion ? (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm leading-6 text-slate-600">
                  We can switch to the suggested mode or stay where you are.
                </p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => resolveModeSuggestion(true)}
                    className="min-h-[52px] rounded-[20px] bg-pine px-5 py-3 text-base font-semibold text-white transition hover:bg-[#0f2c21]"
                  >
                    Switch to {communicationModeLabels[modeSuggestion.suggestedMode]}
                  </button>
                  <button
                    type="button"
                    onClick={() => resolveModeSuggestion(false)}
                    className="min-h-[52px] rounded-[20px] border border-slate-200 bg-white px-5 py-3 text-base font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    Stay in {communicationModeLabels[modeSuggestion.currentMode]}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {(currentStep?.type === 'options' ||
                  currentStep?.type === 'text-with-options' ||
                  currentStep?.type === 'mode-options') && (
                  <div className="space-y-3">
                    {currentStep.key === 'emotionalQuality' && emotionalQualitySuggestions.length > 0 && (
                      <div className="rounded-[22px] bg-[#f8fbf8] px-4 py-3">
                        <p className="text-sm font-medium text-slate-600">{emotionalQualitySuggestionLabel}</p>
                        <div className="mt-3 flex flex-wrap gap-2.5">
                          {emotionalQualitySuggestions.map((suggestion, index) => (
                            <button
                              key={`suggestion-${suggestion}`}
                              type="button"
                              onClick={() => handleChipClick(suggestion)}
                              className={`min-h-[44px] rounded-full border px-4 py-2 text-sm font-medium capitalize transition ${
                                index === 0
                                  ? 'border-pine bg-pine text-white shadow-sm'
                                  : 'border-sage bg-[#eef7ef] text-pine hover:border-pine hover:bg-[#e5f0e6]'
                              }`}
                            >
                              {suggestion}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2.5">
                      {currentStep.options.map((option) => (
                        <button
                          key={currentStep.type === 'mode-options' ? option.value : option}
                          type="button"
                          onClick={() => handleChipClick(currentStep.type === 'mode-options' ? option.value : option)}
                          className={`min-h-[46px] rounded-[22px] border px-4 py-3 text-left text-[15px] font-medium text-slate-700 transition hover:border-sage hover:bg-[#eef7ef] sm:text-sm ${
                            currentStep.type === 'mode-options'
                              ? 'w-full border-slate-200 bg-[#f7faf7] sm:w-[calc(50%-0.5rem)]'
                              : 'rounded-full border-slate-200 bg-[#f7faf7] capitalize'
                          }`}
                        >
                          {currentStep.type === 'mode-options' ? option.label : option}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {(currentStep?.type === 'text' ||
                  currentStep?.type === 'text-with-options' ||
                  currentStep?.type === 'dual-text' ||
                  isCustomEmotionEntry) && (
                  <form onSubmit={submitText} className="flex flex-col gap-4">
                    <div className="space-y-3">
                      {currentStep?.type === 'dual-text' ? (
                        <div className="space-y-4">
                          {currentStep.fields.map((field) => {
                            const fieldIsActive = activeVoiceField === field.key
                            return (
                              <div key={field.key} className="rounded-[24px] bg-[#f8fbf8] p-3.5 sm:p-4">
                                <label className="px-1 text-sm font-medium text-slate-600">{field.label}</label>
                                {field.helperText && (
                                  <p className="mt-1 px-1 text-xs leading-5 text-slate-500">{field.helperText}</p>
                                )}
                                <div className="mt-2 flex flex-col gap-3 sm:flex-row">
                                  <textarea
                                    value={getDisplayedFieldValue(field.key, currentDualInput[field.key])}
                                    onChange={(event) => updateDraftValue(field.key, event.target.value)}
                                    placeholder={field.placeholder}
                                    rows={4}
                                    readOnly={isTranscribing && transcriptionPreviewField === field.key}
                                    className="min-h-[120px] w-full resize-none rounded-[22px] border border-slate-200 bg-white px-4 py-3 text-base leading-7 text-slate-700 outline-none transition focus:border-sage focus:ring-4 focus:ring-sage/10"
                                  />
                                  {debugState.micSupported ? (
                                    <div className="grid grid-cols-2 gap-2 sm:flex sm:w-[132px] sm:flex-col">
                                      <button
                                        type="button"
                                        onClick={createTouchSafeHandler(() => startRecording(field.key))}
                                        onTouchEnd={createTouchSafeHandler(() => startRecording(field.key))}
                                        disabled={isRecording || isTranscribing}
                                        className="min-h-[52px] rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-sage hover:bg-[#eef7ef] disabled:cursor-not-allowed disabled:opacity-60"
                                      >
                                        Mic
                                      </button>
                                      <button
                                        type="button"
                                        onClick={createTouchSafeHandler(stopRecording)}
                                        onTouchEnd={createTouchSafeHandler(stopRecording)}
                                        disabled={!fieldIsActive || !isRecording}
                                        className="min-h-[52px] rounded-[20px] bg-pine px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#0f2c21] disabled:cursor-not-allowed disabled:opacity-40"
                                      >
                                        Stop
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="rounded-[20px] border border-dashed border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 sm:w-[132px]">
                                      Use your keyboard microphone to speak.
                                    </div>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                          {canUseInAppMic &&
                            (isRecording || isTranscribing || speechError || speechStatus || activeVoiceField) && (
                            <p className="px-1 text-sm text-slate-600">
                              {isRecording
                                ? 'Recording... Tap stop when you are done.'
                                : isTranscribing
                                  ? 'Transcribing your audio...'
                                  : speechError || speechStatus}
                            </p>
                          )}
                          {canUseInAppMic ? (
                            <div className="px-1 text-xs leading-5 text-slate-400">
                              <p>Speak naturally, then tap stop. Your transcript will be appended to the field.</p>
                              <p>Pauses are okay. You can record again to add more.</p>
                            </div>
                          ) : (
                            <div className="px-1 text-xs leading-5 text-slate-400">
                              <p>Use your keyboard microphone to speak.</p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <>
                          <div className="rounded-[24px] bg-[#f8fbf8] p-3.5 sm:p-4">
                            {currentStep?.helperText && (
                              <p className="mb-3 px-1 text-xs leading-5 text-slate-500">{currentStep.helperText}</p>
                            )}
                            <div className="flex flex-col gap-3 sm:flex-row">
                            <textarea
                              value={getDisplayedFieldValue('input', currentInputValue)}
                              onChange={(event) =>
                                updateDraftValue(isCustomEmotionEntry ? 'customEmotion' : currentStep.key, event.target.value)
                              }
                              placeholder={
                                isCustomEmotionEntry
                                  ? 'What emotion fits better for you? Examples: resentment, insecurity, bitterness, overwhelm...'
                                  : currentStep.placeholder
                              }
                              rows={4}
                              readOnly={isTranscribing && transcriptionPreviewField === 'input'}
                              className="min-h-[132px] w-full resize-none rounded-[22px] border border-slate-200 bg-white px-4 py-3 text-base leading-7 text-slate-700 outline-none transition focus:border-sage focus:ring-4 focus:ring-sage/10"
                            />
                            {isCurrentStepVoiceEnabled &&
                              (debugState.micSupported ? (
                                <div className="grid grid-cols-2 gap-2 sm:flex sm:w-[132px] sm:flex-col">
                                  <button
                                    type="button"
                                    onClick={createTouchSafeHandler(() => startRecording('input'))}
                                    onTouchEnd={createTouchSafeHandler(() => startRecording('input'))}
                                    disabled={isRecording || isTranscribing}
                                    className="min-h-[52px] rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-sage hover:bg-[#eef7ef] disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    Mic
                                  </button>
                                  <button
                                    type="button"
                                    onClick={createTouchSafeHandler(stopRecording)}
                                    onTouchEnd={createTouchSafeHandler(stopRecording)}
                                    disabled={activeVoiceField !== 'input' || !isRecording}
                                    className="min-h-[52px] rounded-[20px] bg-pine px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#0f2c21] disabled:cursor-not-allowed disabled:opacity-40"
                                  >
                                    Stop
                                  </button>
                                </div>
                              ) : (
                                <div className="rounded-[20px] border border-dashed border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 sm:w-[132px]">
                                  Use your keyboard microphone to speak.
                                </div>
                              ))}
                            </div>
                          </div>
                          {canUseInAppMic &&
                            (isRecording || isTranscribing || speechError || speechStatus || activeVoiceField) && (
                            <p className="px-1 text-sm text-slate-600">
                              {isRecording
                                ? 'Recording... Tap stop when you are done.'
                                : isTranscribing
                                  ? 'Transcribing your audio...'
                                  : speechError || speechStatus}
                            </p>
                          )}
                          {canUseInAppMic ? (
                            <div className="px-1 text-xs leading-5 text-slate-400">
                              <p>Speak naturally, then tap stop. Your transcript will be appended to the field.</p>
                              <p>Pauses are okay. You can record again to add more.</p>
                            </div>
                          ) : isCurrentStepVoiceEnabled ? (
                            <div className="px-1 text-xs leading-5 text-slate-400">
                              <p>Use your keyboard microphone to speak.</p>
                            </div>
                          ) : null}
                        </>
                      )}
                    </div>
                    <button
                      type="submit"
                      className="min-h-[56px] w-full rounded-[20px] bg-pine px-5 py-3 text-base font-semibold text-white transition hover:bg-[#0f2c21]"
                    >
                      {isCustomEmotionEntry ? 'Save emotion' : currentStep.buttonLabel}
                    </button>
                    {currentStep?.optional && (
                      <button
                        type="button"
                        onClick={() => advanceStep('')}
                        className="min-h-[52px] w-full rounded-[20px] border border-slate-200 bg-white px-5 py-3 text-base font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                      >
                        {currentStep.skipLabel || `Skip`}
                      </button>
                    )}
                  </form>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
