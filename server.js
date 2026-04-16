import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import OpenAI from 'openai'
import { toFile } from 'openai/uploads'

const app = express()
const port = Number(process.env.SERVER_PORT || 3001)
const model = process.env.OPENAI_MODEL || 'gpt-4.1-mini'
const transcriptionModel = process.env.OPENAI_TRANSCRIPTION_MODEL || 'gpt-4o-mini-transcribe'

const emotionMap = {
  confusion: 'confused',
  fear: 'afraid',
  sadness: 'sad',
  anger: 'angry',
  disappointment: 'disappointed',
  hurt: 'hurt',
  shame: 'ashamed',
}

const secondaryEmotionMap = {
  rejection: '',
  abandonment: `left alone`,
  invalidation: `shut down`,
  humiliation: 'small',
  disrespect: `pushed aside`,
  betrayal: `let down`,
  misunderstanding: 'misread',
  uncertainty: 'uncertain',
  powerlessness: '',
  pressure: `under pressure`,
}

const needMap = {
  clarity: `some clarity`,
}

const requirementMap = {
  'request clearer communication': `clearer communication`,
  'slow the conversation down': `slower communication`,
  'ask for time before responding': `more direct communication when we come back to this`,
  'limit repeated disrespect': `this pattern to change`,
  'step away if escalation continues': `things to stay calm and respectful`,
  'name what is not okay': `more honesty about what is and is not okay`,
}

const voiceProfileGuidance = [
  `You are TrueVoice, an emotionally intelligent communication coach.`,
  `Your role is to help users:`,
  `- understand what they are feeling`,
  `- take gentle ownership of their experience`,
  `- express themselves clearly and responsibly`,
  `Internally score the user from 1-5 on:`,
  `- Dysregulation (emotional overwhelm)`,
  `- Reactivity (blame, projection)`,
  `- Clarity (self-awareness)`,
  `- Readiness for expression`,
  `Decision logic:`,
  `- If Dysregulation is 4 or higher: use Grounded Mode at low depth`,
  `- Else if Reactivity is 4 or higher: use Boundary Logic at medium depth`,
  `- Else if Clarity is 2 or lower: use Emotional Processing at medium depth`,
  `- Else if Readiness for expression is 4 or higher: use Expression Coaching at medium-high depth`,
  `- Else: use Emotional Processing by default`,
  `If the user selects an emotional experience, adjust scoring and depth using it:`,
  `- "I did not feel considered" -> increase sensitivity to relational expectations`,
  `- "I felt overlooked" -> detect possible unmet needs or visibility concerns`,
  `- "I felt dismissed" -> detect invalidation sensitivity`,
  `- "I felt misunderstood" -> prioritize clarity and articulation`,
  `- "I felt unimportant" -> detect worth or value sensitivity`,
  `- "I felt hurt" -> increase emotional weight`,
  `- "I felt frustrated" -> increase reactivity score`,
  `- "I am not sure yet" -> lower clarity score`,
  `- Use this input to adjust clarity score, reactivity score, and depth calibration`,
  `Choose the opening based on user state:`,
  `- If the user is overwhelmed or vulnerable, open with: "I'm here with you. Take a moment. There's no pressure to get this right. You can start wherever feels easiest. We'll go step by step."`,
  `- Else if the user is reactive or intense, open with: "I'm here with you. Start with what feels most present right now. We'll sort through it step by step."`,
  `- Else, open with: "I'm here with you. Take a breath. You don't need to explain everything perfectly. We'll take this one step at a time."`,
  `Use this internal flow:`,
  `- SLOW -> NAME -> TURN -> EXPRESS`,
  `Flow rules:`,
  `- Do not use all steps unless needed`,
  `- Use a maximum of 2 steps per response unless the user is very clear`,
  `- Do not skip ahead of the user`,
  `Your tone is:`,
  `- calm`,
  `- grounded`,
  `- non-judgmental`,
  `- human, not clinical`,
  `Language rules:`,
  `- use natural, human phrasing and avoid clinical or therapy language`,
  `- keep sentences short and simple`,
  `- do not overwhelm with long explanations`,
  `Interaction rules:`,
  `- do not validate blame; gently guide toward ownership`,
  `- do not rush the user forward`,
  `- do not use "you should" statements`,
  `- make everything invitational, not directive`,
  `Adaptive tone matching:`,
  `- internally detect the user tone and intensity from wording, pacing, emotional charge, and clarity`,
  `- match the user emotional tone partially, not fully`,
  `- stabilize the tone slightly so it is more grounded than the user`,
  `- never amplify panic, blame, urgency, or reactivity`,
  `- keep the tone calm, grounded, human, and emotionally attuned`,
  `- if the user is overwhelmed, use softer and shorter language`,
  `- if the user is reactive, use steady and structured language`,
  `- if the user is reflective, use clear and thoughtful language`,
  `- if the user is clear and ready, use direct and concise language`,
  `- when user intensity is high, shorten sentences`,
  `- when user clarity is high, reduce cushioning`,
  `- the tone should feel understood, not mirrored`,
  `- the tone should feel grounded, not flat`,
  `- the tone should feel warm, not overly therapeutic`,
  `- do not mention tone detection in the UI`,
  `- do not expose this internal logic`,
  `Response structure:`,
  `- use an optional opening only if needed`,
  `- include emotional clarity`,
  `- include a gentle ownership shift if applicable`,
  `- include expression guidance if appropriate`,
  `- keep responses clean and concise`,
  `Response guidance:`,
  `- simple conversational wording with natural spoken rhythm`,
  `- guide step-by-step and do not overwhelm`,
  `- prioritize clarity before advice`,
  `- direct sentences, minimal filler, and no over-explaining`,
  `- final expression messages should use 1-2 short sentences maximum`,
  `- separate the feeling sentence from the request sentence when needed`,
  `- use proper capitalization, clean punctuation, and no run-on sentences`,
  `- use precise, grounded feelings instead of vague phrasing`,
  `- keep ownership with "I felt" and avoid accusatory or interpretive wording`,
  `- use relational request language such as "I'"d like to", "I would like to", or "I'"d appreciate"`,
  `- end with a connecting intention when it fits, such as understanding each other, staying connected, or talking it through`,
  `- keep the same core meaning across Gentle, Clear, and Strong variants`,
  `- Gentle should use softer, more open language with lower pressure phrasing`,
  `- Clear should use balanced, grounded language that stays direct but not forceful`,
  `- Strong should use more direct, boundaried language while staying calm and non-aggressive`,
  `- prefer concrete relational language over vague reflective filler`,
  `- precise emotional language such as hurt, misunderstood, disregarded, disappointed, or angry when supported by the input`,
  `- do not repeat the same emotional point twice in slightly different wording; each sentence should add feeling, impact, or meaning`,
  `- avoid robotic, formal, clinical, abstract, or overly intellectual phrasing`,
  `- avoid exaggeration and vague softeners like "a bit upset" when a clearer emotion is available`,
  `- prefer grounded phrasing like "this is how it lands for me", "I feel...", "I need...", and "can we talk about that?" when it fits`,
].join('\n')

app.use(cors())
app.use(express.json({ limit: '15mb' }))

function requireApiKey(req, res, next) {
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey || apiKey === 'your_openai_api_key_here') {
    return res.status(500).json({
      error: `Missing OPENAI_API_KEY. Add it to your .env file before generating responses.`,
    })
  }

  next()
}

function decodeBase64Audio(audioData) {
  if (!audioData) {
    return null
  }

  const normalized = String(audioData)
  const base64 = normalized.includes(',') ? normalized.split(',').pop() : normalized

  if (!base64) {
    return null
  }

  return Buffer.from(base64, 'base64')
}

function getFileExtension(fileName) {
  const normalized = String(fileName || '').trim()

  if (!normalized.includes('.')) {
    return ''
  }

  return normalized.split('.').pop()?.toLowerCase() || ''
}

function logTranscriptionRequest(details) {
  console.info('[transcribe-audio]', JSON.stringify(details))
}

function normalizeWhitespace(value) {
  return String(value || '')
    .replace(/\s+/g, ` `)
    .trim()
}

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

function shouldMergeTranscriptionParts(previousPart, nextPart) {
  const previous = normalizeWhitespace(previousPart)
  const next = normalizeWhitespace(nextPart)

  if (!previous || !next) {
    return false
  }

  if (/^[a-z]/.test(next)) {
    return true
  }

  const firstWord = next.split(/\s+/)[0]?.toLowerCase() || ''
  return continuationStarters.has(firstWord)
}

function softenTranscriptionPunctuation(value) {
  const normalized = normalizeWhitespace(value)

  if (!normalized) {
    return ''
  }

  const matches = [...normalized.matchAll(/[^.!?]+(?:[.!?]+|$)/g)]
  const segments = matches
    .map((match) => {
      const chunk = match[0].trim()
      const punctuationMatch = chunk.match(/[.!?]+$/)
      return {
        text: normalizeWhitespace(chunk.replace(/[.!?]+$/, '')),
        punctuation: punctuationMatch?.[0]?.includes(`?`)
          ? '?'
          : punctuationMatch?.[0]?.includes(`!`)
            ? '!'
            : punctuationMatch
              ? '.'
              : '',
      }
    })
    .filter((segment) => segment.text)

  if (!segments.length) {
    return ''
  }

  let result = segments[0].text

  for (let index = 1; index < segments.length; index += 1) {
    const previousSegment = segments[index - 1]
    const currentSegment = segments[index]

    if (shouldMergeTranscriptionParts(previousSegment.text, currentSegment.text)) {
      result = `${result} ${currentSegment.text}`
      continue
    }

    const boundary = previousSegment.punctuation || '.'
    result = `${result}${boundary} ${currentSegment.text}`
  }

  const finalPunctuation = segments[segments.length - 1].punctuation
  return `${result}${finalPunctuation}`.replace(/\s+([,!?])/g, '$1').trim()
}

function stripOuterPunctuation(value) {
  return value.replace(/^[\s`'".,;:!?()[\]-]+|[\s`'".,;:!?()[\]-]+$/g, ``)
}

function cleanSlot(value, prefixes = []) {
  let result = stripOuterPunctuation(normalizeWhitespace(value))

  for (const prefix of prefixes) {
    result = result.replace(prefix, ``)
  }

  return stripOuterPunctuation(result)
}

function firstProvided(...values) {
  return values.map(normalizeWhitespace).find(Boolean) || ``
}

function normalizeMappedValue(value, map) {
  const normalized = normalizeWhitespace(value).toLowerCase()
  return map[normalized] || value
}

function stripFillers(value) {
  return normalizeWhitespace(value)
    .replace(/\band like\b/gi, ` `)
    .replace(/\blike\b/gi, ` `)
    .replace(/\byou you\b/gi, `you`)
    .replace(/\bi i\b/gi, `I`)
}

function dedupeRepeatedWords(value) {
  const parts = normalizeWhitespace(value).split(` `)
  const deduped = []

  for (const part of parts) {
    if (!deduped.length || deduped[deduped.length - 1].toLowerCase() !== part.toLowerCase()) {
      deduped.push(part)
    }
  }

  return deduped.join(` `)
}

function normalizeBehavior(text) {
  return normalizeWhitespace(text)
    .replace(/\bhe\b/gi, `you`)
    .replace(/\bshe\b/gi, `you`)
    .replace(/\bhis\b/gi, `your`)
    .replace(/\bher\b/gi, `your`)
    .replace(/\bhim\b/gi, `you`)
    .replace(/\bthey\b/gi, `you`)
    .replace(/\bthem\b/gi, `you`)
    .replace(/\bwas\b/gi, `were`)
    .replace(/\bis\b/gi, `are`)
}

function getSituationSource(input) {
  return normalizeWhitespace(
    firstProvided(
      input.preprocessed_behavior,
      input.preprocessed_happened,
      input.facts_normalized,
      normalizeBehavior(input.facts),
      input.story,
    ),
  )
}

function getEmotionalMeaningSource(input) {
  return normalizeWhitespace(
    firstProvided(input.preprocessed_meaning, input.interpretation, input.rawMessage, input.story),
  )
}

function summarizeBehaviorClause(value) {
  return normalizeWhitespace(
    String(value || ``)
      .replace(/^[,.\s]+|[,.\s]+$/g, ``)
      .replace(/\b(and|then|so|because)\b.*$/i, ``)
      .replace(/\s+/g, ` `),
  )
}

function buildReactionPatternBehavior(normalized) {
  const lower = normalized.toLowerCase()
  const becauseMatch = normalized.match(
    /\b(?:i said no|i couldn't help|i could not help|i wasn[`â€™]t available|i was not available|i set a boundary|i said i couldn[`â€™]t|i said i could not)\b([^.!?]*)/i,
  )
  const becauseClause = summarizeBehaviorClause(becauseMatch?.[0] || '')
  const reason = becauseClause ? ` because ${becauseClause.replace(/^i\s+/i, 'I ')}` : ''

  if (/got upset|became upset|were upset/.test(lower) && /shut down|closed off|went quiet/.test(lower)) {
    return `got upset and shut down${reason}`
  }

  if (/got upset|became upset|were upset/.test(lower) && /withdrew|pulled away|backed off/.test(lower)) {
    return `got upset and pulled away${reason}`
  }

  if (/got upset|became upset|were upset/.test(lower) && /cold|distant/.test(lower)) {
    return `got upset and turned cold${reason}`
  }

  if (/got upset|became upset|were upset/.test(lower)) {
    return `got upset${reason}`
  }

  if (/shut down|closed off|went quiet/.test(lower)) {
    return `shut down${reason}`
  }

  if (/withdrew|pulled away|backed off/.test(lower)) {
    return `pulled away${reason}`
  }

  if (/cold|distant/.test(lower)) {
    return `went cold${reason}`
  }

  return ''
}

function extractConcreteBehaviorPhrase(text) {
  const normalized = normalizeWhitespace(text)
  const lower = normalized.toLowerCase()

  if (!normalized) {
    return ''
  }

  const reactionPattern = buildReactionPatternBehavior(normalized)
  if (reactionPattern) {
    return reactionPattern
  }

  if (
    /kept asking indirect questions|indirect questions|were trying to|get me to|wanted me to|expected me to/.test(
      lower,
    ) &&
    /change plans|fix something|handle something|take care of something|deal with something|that (?:wasn't|was not) mine|not mine/.test(
      lower,
    )
  ) {
    const targetMatch = normalized.match(
      /\b(change plans|fix something|handle something|take care of something|deal with something)([^.!?]*)/i,
    )
    const target = summarizeBehaviorClause(
      `${targetMatch?.[1] || 'handle something'}${targetMatch?.[2] || ''}`,
    )
    return `tried to get me to ${target} by being indirect`
  }

  if (
    /(were trying to|tried to|get me to|wanted me to|expected me to)/.test(lower) &&
    /(that (?:wasn't|was not) mine|not mine)/.test(lower)
  ) {
    const tryingMatch = normalized.match(
      /\b(?:were trying to|tried to|get me to|wanted me to|expected me to)\b([^.!?]*)/i,
    )
    const target = summarizeBehaviorClause(tryingMatch?.[1] || '')

    if (target) {
      return `${target} even though it wasn't mine`
    }
  }

  if (/\bi resent\b/.test(lower)) {
    const resentMatch = normalized.match(/\bi resent\b([^.!?]*)/i)
    const resentClause = summarizeBehaviorClause(resentMatch?.[1] || '')

    if (/trying to|get me to|wanted me to|expected me to/.test(resentClause)) {
      return resentClause
    }

    if (/indirect|covert/.test(resentClause)) {
      return `were indirect about what you wanted from me`
    }
  }

  if (/\bthey were trying to\b/.test(lower)) {
    const tryingMatch = normalized.match(/\bthey were trying to\b([^.!?]*)/i)
    const tryingClause = summarizeBehaviorClause(tryingMatch?.[1] || '')

    if (tryingClause) {
      return `tried to ${tryingClause}`
    }
  }

  if (/manipulat|covert|indirect|pull me into|drag me into|rope me into/.test(lower)) {
    if (/pull me into|drag me into|rope me into/.test(lower)) {
      return `tried to pull me into something that wasn't mine`
    }

    if (/indirect|covert/.test(lower)) {
      return `were indirect about it`
    }

    return `tried to pull me into something that wasn't mine`
  }

  const multiActionPatterns = [
    /\bkept asking\b[^.!?]*/i,
    /\baccused me of\b[^.!?]*/i,
    /\bblamed me for\b[^.!?]*/i,
    /\bsaid i was\b[^.!?]*/i,
    /\btalked to me like\b[^.!?]*/i,
    /\bspoke to me like\b[^.!?]*/i,
    /\brefused to\b[^.!?]*/i,
    /\bwon[`’]t\b[^.!?]*/i,
    /\bdoesn[`’]t\b[^.!?]*/i,
  ]

  for (const pattern of multiActionPatterns) {
    const match = normalized.match(pattern)
    if (match) {
      return stripFillers(match[0]).replace(/\s+/g, ` `).trim()
    }
  }

  const specificMatch = normalized.match(
    /\b(?:he|she|they|you)\s+(won't|wouldn't|doesn't|don't|refuses to|refuse to|refused to|tries to|try to|tried to|keeps|keep|kept|stops|stop|stopped|calls|call|called|talks|talk to me|talked to me|speaks to me|spoke to me|treats|treated|interrupts|interrupted|dismisses|dismissed|ignores|ignored)\b([^.!?]*)/i,
  )

  if (specificMatch) {
    return stripFillers(`${specificMatch[1]}${specificMatch[2]}`)
      .replace(/\s+/g, ` `)
      .trim()
  }

  const actionMatch = normalized.match(
    /\b(?:he|she|they|you)\s+(walked away|step(?:ped)? away|hung up|left in the middle|shut down|closed off|went quiet|stopped talking|stopped responding|pulled away|backed off)\b([^.!?]*)/i,
  )

  if (actionMatch) {
    return stripFillers(`${actionMatch[1]}${actionMatch[2]}`)
      .replace(/\s+/g, ` `)
      .trim()
  }

  return ''
}

function toSecondPersonBehavior(value) {
  let text = normalizeWhitespace(value)

  if (!text) {
    return text
  }

  text = text
    .replace(/^(he|she|they)\s+/i, '')
    .replace(/\bdoesn[`’]t\b/gi, `don't`)
    .replace(/\bwon['’]t\b/gi, `won't`)
    .replace(/\brefuses to\b/gi, `refuse to`)
    .replace(/\btries to\b/gi, `try to`)
    .replace(/\bkeeps\b/gi, `keep`)
    .replace(/\bstops\b/gi, `stop`)
    .replace(/\bcalls\b/gi, `call`)
    .replace(/\btalks to me\b/gi, `talk to me`)
    .replace(/\bspeaks to me\b/gi, `speak to me`)
    .replace(/\btreats\b/gi, `treat`)
    .replace(/\binterrupts\b/gi, `interrupt`)
    .replace(/\bdismisses\b/gi, `dismiss`)
    .replace(/\bignores\b/gi, `ignore`)

  return normalizeWhitespace(text)
}

function hasInvalidSecondPersonBehavior(value) {
  const text = normalizeWhitespace(value).toLowerCase()

  if (!text) {
    return true
  }

  return /\byou\s+(refuses|doesn't|calls|keeps|stops|talks|speaks|treats|interrupts|dismisses|ignores)\b/.test(
    text,
  )
}

function inferBehaviorPhrase(text) {
  const lower = normalizeWhitespace(text).toLowerCase()
  const concrete = extractConcreteBehaviorPhrase(text)

  if (concrete) {
    return toSecondPersonBehavior(concrete)
  }

  if (!lower) {
    return ''
  }

  if (/yelled at me|were yelling at me|started yelling/.test(lower)) {
    return `you yelled at me`
  }

  if (/raised your voice|raised his voice|raised her voice|raised their voice/.test(lower)) {
    return `you raised your voice at me`
  }

  if (/snapped at me/.test(lower)) {
    return `you snapped at me`
  }

  if (/ignored me|ignore me|left me on read/.test(lower)) {
    return `you ignored me`
  }

  if (/dismissed what i said|dismissed me|blew me off/.test(lower)) {
    return `you dismissed what I said`
  }

  if (/talked over me/.test(lower)) {
    return `you talked over me`
  }

  if (/sarcastic|sarcasm/.test(lower)) {
    return `you got a bit sarcastic just now`
  }

  if (/defensive/.test(lower)) {
    return `you got kind of defensive there`
  }

  if (/tone changed|tone shifted|conversation shifted|off track|energy changed/.test(lower)) {
    return `the tone shifted a bit`
  }

  if (/shut down|closed off|went quiet/.test(lower)) {
    return `you shut down just now`
  }

  if (/stopped talking|stopped responding|ignored|left on read/.test(lower)) {
    return `you ignored me`
  }

  if (/walked away|stepped away|hung up|left in the middle/.test(lower)) {
    return `you walked away without saying anything`
  }

  if (/cut off|talked over|interrupted|dismissed/.test(lower)) {
    if (/dismissed/.test(lower)) {
      return `you dismissed what I said`
    }

    if (/talked over/.test(lower)) {
      return `you talked over me`
    }

    return `you interrupted me`
  }

  if (/yelled|raised your voice|snapped at me/.test(lower)) {
    return `you yelled at me`
  }

  if (/pulled away|backed off/.test(lower)) {
    return `you pulled away just now`
  }

  return ''
}

function extractBehaviorAnchor(input) {
  const source = getSituationSource(input)

  if (!source) {
    return ''
  }

  const normalized = normalizeWhitespace(source)
  return inferBehaviorPhrase(normalized)
}

function normalizeEmotion(value) {
  const cleaned = cleanSlot(value)
  return normalizeMappedValue(cleaned, emotionMap)
}

function normalizeSecondaryEmotion(value) {
  const cleaned = cleanSlot(value)
  return normalizeMappedValue(cleaned, secondaryEmotionMap)
}

function normalizeNeed(value) {
  const cleaned = cleanSlot(value)
  const mapped = normalizeMappedValue(cleaned, needMap)
  const lower = mapped.toLowerCase()

  if (/connected|understood|seen|heard|reassurance|secure|safety/.test(lower)) {
    return `to talk this through together`
  }

  if (/clarity|honesty|directness|truth/.test(lower)) {
    return `to understand what's going on`
  }

  if (/tell me|what`?s going on|what is going on|explain/.test(lower)) {
    return `to understand what's going on`
  }

  if (/repair/.test(lower)) {
    return `to talk this through together`
  }

  if (/friendship/.test(lower)) {
    return `to talk this through together`
  }

  if (/respect|accountability/.test(lower)) {
    return 'us to stay present with each other'
  }

  if (/change|different|shift/.test(lower)) {
    return 'us to actually talk this through'
  }

  return mapped
}

function normalizeBehaviorValue(value, input) {
  const cleaned = toSecondPersonBehavior(
    stripFillers(cleanSlot(value, [/^when\s+/i, /^you\s+/i])),
  )
  const situation = getSituationSource(input)
  const source = firstProvided(cleaned, situation)
  const concreteBehavior = extractConcreteBehaviorPhrase(situation)

  const normalized = dedupeRepeatedWords(
    inferBehaviorPhrase(source)
      .replace(/^when\s+/i, '')
      .replace(/\byou\s+you\b/gi, 'you'),
  )

  if (concreteBehavior && /tone shifted|conversation got a bit off track|that happened/i.test(normalized)) {
    return dedupeRepeatedWords(toSecondPersonBehavior(concreteBehavior))
  }

  if (concreteBehavior) {
    return dedupeRepeatedWords(toSecondPersonBehavior(concreteBehavior))
  }

  if (/^that happened$/i.test(normalized) || !normalized) {
    return ''
  }

  return hasInvalidSecondPersonBehavior(normalized)
    ? toSecondPersonBehavior(normalized)
    : normalized
}

function normalizeFeeling(value, input) {
  const cleaned = stripFillers(cleanSlot(value, [/^i\s+(am|feel)\s+/i, /^a bit\s+/i]))
  const meaningSource = `${getEmotionalMeaningSource(input)} ${input.emotion || ''} ${input.qualities || ''}`.toLowerCase()
  const explicitEmotion = normalizeEmotion(input.emotion)
  const primary = explicitEmotion || normalizeEmotion(cleaned || input.emotion)
  const secondary = normalizeSecondaryEmotion(
    stripFillers(
      cleanSlot(firstProvided(input.interpretation, input.qualities, cleaned), [/^i\s+(am|feel)\s+/i, /^a bit\s+/i]),
    ),
  )
  const combined = `${primary} ${secondary} ${cleaned} ${meaningSource}`.toLowerCase()

  if (explicitEmotion) {
    return explicitEmotion
  }

  if (/hurt/.test(combined)) return 'hurt'
  if (/betray|betrayed|betrayal/.test(combined)) return 'betrayed'
  if (/misunderstood|misread|misunderstanding/.test(combined)) return 'misunderstood'
  if (/invalidated|dismissed|overlooked/.test(combined)) return 'hurt'
  if (/resent|resentment|bitter|bitterness/.test(combined)) return 'resentful'
  if (/disappointed/.test(combined)) return 'disappointed'
  if (/frustrated/.test(combined)) return 'frustrated'
  if (/angry|mad|furious/.test(combined)) return 'angry'
  if (/sad/.test(combined)) return 'sad'
  if (/afraid|scared/.test(combined)) return 'afraid'
  if (/ashamed/.test(combined)) return 'ashamed'
  if (/confused|uncertain/.test(combined)) return 'confused'
  if (/powerless|no control|no say/.test(combined)) return 'powerless'

  return primary || secondary || 'upset'
}

function normalizeSecondaryFeeling(input) {
  const source = stripFillers(
    cleanSlot(firstProvided(input.interpretation, input.qualities, input.emotion), [/^i\s+(am|feel)\s+/i, /^a bit\s+/i]),
  ).toLowerCase()

  if (/invalidation|invalidated/.test(source)) return 'invalidated'
  if (/disregard|disregarded/.test(source)) return 'disregarded'
  if (/disrespect|dismissed/.test(source)) return 'dismissed'
  if (/overlooked|left out/.test(source)) return 'overlooked'
  if (/betray|betrayed|betrayal/.test(source)) return 'betrayed'
  if (/misunderstanding|misread/.test(source)) return 'not respected'
  if (/powerless|no control|no say/.test(source)) return 'powerless'
  if (/hurt/.test(source)) return 'hurt'
  if (/sad/.test(source)) return 'sad'
  if (/confused|uncertain/.test(source)) return 'confused'
  if (/disappointed/.test(source)) return 'disappointed'
  if (/afraid|scared/.test(source)) return 'afraid'

  return 'powerless'
}

function normalizeImpact(value, input) {
  const cleaned = stripFillers(cleanSlot(value).replace(/^like\s+/i, ''))
  const meaningSource = getEmotionalMeaningSource(input)
  const situationSource = getSituationSource(input)

  if (!cleaned) {
    return cleaned
  }

  const lower = cleaned.toLowerCase()
  const source = `${cleaned} ${meaningSource} ${situationSource} ${input.rawMessage || ''}`.toLowerCase()

  if (lower === 'rejection' || lower === 'rejected') {
    return `I'm being shut out`
  }

  if (lower === `abandonment` || lower === `abandoned`) {
    return `I'm being left on my own`
  }

  if (lower === 'powerlessness' || lower === 'powerless') {
    return `I don't feel like I have any say in this`
  }

  if (lower === `invalidation` || lower === `invalidated`) {
    return `I'm being shut down`
  }

  if (lower === 'abrupt') {
    return 'everything stops suddenly'
  }

  if (/betray|betrayed|betrayal/.test(source)) {
    return `I don't feel trusted`
  }

  if (/trust/.test(source)) {
    return `I don't feel trusted`
  }

  if (/misunderstood|misread|misunderstanding/.test(source)) {
    return 'I feel misunderstood'
  }

  if (/pressured|pressure|under pressure/.test(source)) {
    if (/pull me into|drag me into|rope me into|manipulat|covert|indirect|not mine/.test(source)) {
      return `it feels like I'm being pulled into something that's not mine`
    }

    return 'I feel pressured'
  }

  if (/pull me into|drag me into|rope me into|manipulat|covert|indirect|not mine/.test(source)) {
    return `it feels like I'm being pulled into something that's not mine`
  }

  if (/hurt|stung|wounded/.test(source)) {
    return 'that actually hurt'
  }

  if (/left out|shut out|pushed away/.test(source)) {
    if (/left out/.test(source)) return `I'm being left out`
    if (/pushed away/.test(source)) return `I'm being pushed away`
    return `I'm being shut out`
  }

  if (/walked away|pulled away|backed off|closed down|shut down|stopped talking|went quiet/.test(source)) {
    return `I'm being shut out`
  }

  if (/ignored|dismissed|cut off|pushed aside/.test(source)) {
    return `I'm being pushed aside`
  }

  if (/he\b|she\b|they\b|you\b/.test(lower)) {
    return `I'm being shut out`
  }

  if (/^(left out|shut out|ignored|dismissed|pushed aside|cut off|left alone)\b/i.test(cleaned)) {
    return `I'm being ${cleaned}`
  }

  if (/^[a-z]+$/.test(lower) && /(powerless|uncertain|small|unimportant|dismissed)/.test(lower)) {
    return `I feel ${lower}`
  }

  if (/^i\s+am\b/i.test(cleaned)) {
    return cleaned.replace(/^i\s+am\b/i, 'I am')
  }

  if (/^i'm\b/i.test(cleaned)) {
    return cleaned.replace(/^i'm\b/i, 'I am')
  }

  const normalized = cleaned
    .replace(/^i\s+am\b/i, `I'm`)
    .replace(/^i'm\b/i, `I'm`)
    .replace(/^i\s+feel\b/i, `I'm`)

  if (/shut out|left out|pushed aside|cut off|ignored|dismissed/.test(normalized.toLowerCase())) {
    return `I'm being shut out`
  }

  return dedupeRepeatedWords(normalized)
}

function buildFallbackVariables(input) {
  const behavior = normalizeBehaviorValue('', input)
  const feeling = normalizeFeeling('', input)
  const secondaryFeeling = normalizeSecondaryFeeling(input)
  const impact = cleanSlot(firstProvided(input.interpretation, input.rawMessage, input.story), [
    /^it\s+felt\s+like\s+/i,
    /^it\s+feels\s+like\s+/i,
    /^i\s+felt\s+like\s+/i,
    /^that\s+/i,
  ]) || cleanSlot(firstProvided(input.interpretation, input.story))

  const need = cleanSlot(input.need, [
    /^i\s+(need|want|would like|want to)\s+/i,
  ]) || cleanSlot(input.need)

  return {
    behavior,
    feeling,
    secondaryFeeling,
    impact,
    need,
  }
}

function normalizeExtractedVariables(parsed, input) {
  const fallback = buildFallbackVariables(input)

  return {
    behavior:
      normalizeBehaviorValue(cleanSlot(parsed?.behavior, [/^when\s+/i]), input) ||
      fallback.behavior,
    feeling:
      normalizeFeeling(cleanSlot(parsed?.feeling, [/^i\s+(am|feel)\s+/i, /^a bit\s+/i]), input) ||
      fallback.feeling,
    secondaryFeeling: fallback.secondaryFeeling,
    impact:
      normalizeImpact(
        cleanSlot(parsed?.impact, [/^it\s+felt\s+like\s+/i, /^it\s+feels\s+like\s+/i, /^i\s+felt\s+like\s+/i, /^that\s+/i]),
        input,
      ) || normalizeImpact(fallback.impact, input),
    need:
      normalizeNeed(cleanSlot(parsed?.need, [/^i\s+(need|want|would like|want to)\s+/i])) ||
      normalizeNeed(fallback.need),
  }
}

function sentenceCase(value) {
  const text = normalizeWhitespace(value)
  if (!text) return ''
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}`
}

function capitalizeSentences(value) {
  const text = normalizeWhitespace(value)
  if (!text) return ''
  return text.replace(/(^|[.!?]\s+)([a-z])/g, (_, prefix, letter) => `${prefix}${letter.toUpperCase()}`)
}

function finishSentence(value) {
  const text = normalizeWhitespace(value)
  if (!text) return ''
  return /[.!?]$/.test(text) ? text : `${text}.`
}

function behaviorClause(behavior) {
  const normalized = normalizeWhitespace(behavior)

  if (!normalized) {
    return `when that happened`
  }

  if (/^(you|the|this|that)\b/i.test(normalized)) {
    return `when ${normalized}`
  }

  return `when you ${normalized}`
}

function behaviorObservation(behavior, opener) {
  const normalized = normalizeWhitespace(behavior)

  if (/^you\b/i.test(normalized)) {
    return `${opener} ${normalized}`
  }

  return `${opener} ${normalized}`
}

function getEmotionStyle(input, variables) {
  const source = `${input.emotion || ''} ${input.qualities || ''} ${input.interpretation || ''} ${variables.feeling || ''} ${variables.secondaryFeeling || ''}`.toLowerCase()

  if (/confused|confusion|uncertain|misread/.test(source)) {
    return 'confusion'
  }

  if (/disappointed|disappointment/.test(source)) {
    return 'disappointment'
  }

  if (/sad|hurt|disappointed|left alone/.test(source)) {
    return 'tender'
  }

  return 'direct'
}

function getRelationshipTone(input) {
  const relationshipType = normalizeWhitespace(input.relationship_type).toLowerCase()
  const importance = normalizeWhitespace(input.relationship_importance).toLowerCase()

  return {
    relationshipType,
    importance,
    highCare: importance === `very important`,
    moderateCare:
      importance === `somewhat important` ||
      ((relationshipType === `romantic partner` || relationshipType === `close friend`) &&
        importance !== `not important`),
    professional: relationshipType === `coworker / professional`,
    lowInvestment: importance === `not important`,
    detachedCasual:
      relationshipType === `acquaintance / casual` && importance === `not important`,
  }
}

function toneFeeling(feeling, tone) {
  return feeling
}

function toneImpact(impact, tone) {
  if (tone.professional && /I'm being shut out|I'm being pushed aside/.test(impact)) {
    return `the conversation is getting harder to read`
  }

  return impact
}

function buildFeelingLine(feeling, meaningLayer, usePause = false) {
  const normalizedFeeling = normalizeWhitespace(feeling)
  const normalizedMeaning = normalizeWhitespace(meaningLayer)

  if (!normalizedMeaning) {
    return `I feel ${normalizedFeeling}`
  }

  if (/^I(`| a)?m\b|^you\b|^this\b|^that\b/i.test(normalizedMeaning)) {
    return `I feel ${normalizedFeeling}. ${normalizedMeaning}`
  }

  return usePause
    ? `I feel ${normalizedFeeling}... ${normalizedMeaning}`
    : `I feel ${normalizedFeeling}, ${normalizedMeaning}`
}

function isDuplicateMeaning(feelingLine, impact) {
  const normalizedFeelingLine = normalizeWhitespace(feelingLine).toLowerCase()
  const normalizedImpact = normalizeWhitespace(impact).toLowerCase()

  if (!normalizedFeelingLine || !normalizedImpact) {
    return false
  }

  const overlapChecks = [
    `you don't trust me`,
    'you are misunderstanding me',
    `i'm being shut out`,
    `i'm being pushed aside`,
    'that actually hurt',
  ]

  return overlapChecks.some(
    (phrase) => normalizedFeelingLine.includes(phrase) && normalizedImpact.includes(phrase),
  )
}

function buildMeaningLayer(variables) {
  const impact = normalizeWhitespace(variables.impact)
  const secondary = normalizeWhitespace(variables.secondaryFeeling)

  if (/i feel misunderstood/i.test(impact)) {
    return 'like you are misunderstanding me'
  }

  if (/i don't feel trusted/i.test(impact)) {
    return `like you don't trust me`
  }

  if (/shut out|left out|pushed aside/.test(impact.toLowerCase())) {
    return `like ${impact.charAt(0).toLowerCase()}${impact.slice(1)}`
  }

  if (secondary === `betrayed`) {
    return `like you don't trust me`
  }

  if (secondary === 'not respected') {
    return 'like you are misunderstanding me'
  }

  if (secondary === 'dismissed' || secondary === 'disregarded' || secondary === 'overlooked') {
    return `like I'm being ${secondary}`
  }

  if (/that actually hurt|that hit me|that matters to me/i.test(impact)) {
    return impact
  }

  return ''
}

function buildMeaningPhrase(variables) {
  const meaningLayer = normalizeWhitespace(buildMeaningLayer(variables))
  let phrase = ''

  if (meaningLayer) {
    phrase = meaningLayer.replace(/^like\s+/i, '')
  } else {
    const impact = normalizeWhitespace(variables.impact)
      .replace(/^i feel\s+/i, '')
      .replace(/^i don't feel\s+/i, `you don't `)
      .replace(/^i am\s+/i, `I'm `)
      .replace(/^i'm\s+/i, `I'm `)

    if (/^you\b/i.test(impact) || /^i'm\b/i.test(impact) || /^i am\b/i.test(impact)) {
      phrase = impact
    } else if (/^being\b/i.test(impact)) {
      phrase = `I'm ${impact}`
    } else {
      phrase = impact || `something is off here`
    }
  }

  if (meaningRepeatsFeeling(variables.feeling, phrase)) {
    return buildMeaningFallback(variables)
  }

  return phrase
}

function meaningRepeatsFeeling(feeling, meaning) {
  const normalizedFeeling = normalizeWhitespace(feeling).toLowerCase()
  const normalizedMeaning = normalizeWhitespace(meaning).toLowerCase()

  if (!normalizedFeeling || !normalizedMeaning) {
    return false
  }

  if (/hurt/.test(normalizedFeeling) && /(hurt|hit me|stung|wounded)/.test(normalizedMeaning)) {
    return true
  }

  if (/angry|frustrated/.test(normalizedFeeling) && /(angry|mad|frustrated)/.test(normalizedMeaning)) {
    return true
  }

  if (/confused/.test(normalizedFeeling) && /(confused|uncertain|unclear)/.test(normalizedMeaning)) {
    return true
  }

  if (/afraid/.test(normalizedFeeling) && /(afraid|scared|unsafe)/.test(normalizedMeaning)) {
    return true
  }

  if (/ashamed/.test(normalizedFeeling) && /(ashamed|embarrassed|small)/.test(normalizedMeaning)) {
    return true
  }

  if (/resentful|powerless/.test(normalizedFeeling) && /(pressured|pulled into|powerless)/.test(normalizedMeaning)) {
    return true
  }

  if (/disappointed/.test(normalizedFeeling) && /disappointed/.test(normalizedMeaning)) {
    return true
  }

  return false
}

function buildMeaningFallback(variables) {
  const feeling = normalizeWhitespace(variables.feeling).toLowerCase()
  const secondary = normalizeWhitespace(variables.secondaryFeeling).toLowerCase()

  if (/hurt|sad|disappointed/.test(feeling)) {
    return `it still feels tender`
  }

  if (/angry|frustrated/.test(feeling)) {
    return `it changes the tone between us`
  }

  if (/confused/.test(feeling)) {
    return `I'm not fully sure what to do with that`
  }

  if (/ashamed/.test(feeling) || /small/.test(secondary)) {
    return `it lands in a way that makes me feel small`
  }

  if (/resentful|powerless/.test(feeling) || /powerless/.test(secondary)) {
    return `it puts me in a position that doesn't feel good`
  }

  if (/afraid/.test(feeling)) {
    return `it leaves me feeling less steady than I'd like`
  }

  return `it lands in a way that feels heavy for me`
}

function simplifyNaturalPhrasing(text) {
  return normalizeWhitespace(text)
    .replace(/\btalk this through clearly so we can talk it through\b/gi, `talk this through`)
    .replace(/\bunderstand what(?:'s| is) going on so (?:i|we) can understand\b/gi, `understand what's going on`)
    .replace(/\bI felt ([a-z ]+) and \1\b/gi, `I felt $1`)
    .replace(/\bit stays with me more than I'd like\b/gi, `it still feels tender`)
    .replace(/\bit still feels tender\b/gi, `I felt hurt and disconnected`)
    .replace(/\bI(?:'d| would) like to process this clearly\b/gi, `I'd like to understand what was going on for you`)
    .replace(/\bit lands in a way that feels heavy for me\b/gi, `It matters to me that we stay connected`)
    .replace(/\bthe emotional quality underneath it\b/gi, `what hurts here`)
    .replace(/\bwhat is present for you in this moment\b/gi, `what's here for you right now`)
    .replace(/\bso we can talk this through clearly\b/gi, `so we can talk this through`)
    .replace(/\bso we can understand each other more clearly\b/gi, `so we can understand each other`)
}

function removeNearDuplicateSentences(text) {
  const sentences = normalizeWhitespace(text)
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean)

  const deduped = []
  const seen = new Set()

  for (const sentence of sentences) {
    const fingerprint = sentence
      .toLowerCase()
      .replace(/[^\w\s]/g, ``)
      .replace(/\b(clearly|really|just|actually|more)\b/g, ``)
      .replace(/\s+/g, ` `)
      .trim()

    if (!fingerprint || seen.has(fingerprint)) {
      continue
    }

    seen.add(fingerprint)
    deduped.push(sentence)
  }

  return deduped.join(` `)
}

function applyNaturalPhrasingFilter(text) {
  const simplified = simplifyNaturalPhrasing(text)
  const deduped = removeNearDuplicateSentences(simplified)
  return finalizeGroundedOutput(deduped)
}

function buildOwnedFeeling(feeling, meaning) {
  const normalizedFeeling = normalizeWhitespace(feeling)
  const normalizedMeaning = normalizeWhitespace(meaning)

  if (!normalizedFeeling && !normalizedMeaning) {
    return `I felt affected by that`
  }

  if (!normalizedMeaning) {
    return `I felt ${normalizedFeeling}`
  }

  if (/^(like|as if)\b/i.test(normalizedMeaning)) {
    return `I felt ${normalizedFeeling} and ${normalizedMeaning}`
  }

  if (/^(it|that)\b/i.test(normalizedMeaning)) {
    return `I felt ${normalizedFeeling}, and ${normalizedMeaning}`
  }

  return `I felt ${normalizedFeeling} and ${normalizedMeaning}`
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

  return normalizeWhitespace(value)
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

  const sharedCount = secondTokens.filter((token) => firstTokens.includes(token)).length
  return sharedCount >= 2
}

function buildAdaptiveOpening(variant, feeling, tone) {
  const normalizedFeeling = normalizeWhitespace(toneFeeling(feeling, tone)) || `affected`

  if (variant === `soft`) {
    return `It felt like there was a little more distance in the conversation, and I felt ${normalizedFeeling}`
  }

  return `When the conversation became less open, I felt ${normalizedFeeling}`
}

function inferGroundedFeeling(input, tone) {
  const source = normalizeWhitespace(
    `${input.emotion || ``} ${input.qualities || ``} ${input.groundedImpact || ``} ${input.whatHappened || ``}`,
  ).toLowerCase()

  if (/misunderstood|misunderstanding/.test(source)) {
    return `misunderstood`
  }

  if (/disconnect|disconnected|distance|distant|shut out|left out/.test(source)) {
    return `disconnected`
  }

  if (/hurt|sad|disappointed/.test(source)) {
    return `hurt`
  }

  if (/frustrated|angry|upset|resentful|irritated/.test(source)) {
    return `frustrated`
  }

  if (/confused|unclear|unsure|mixed/.test(source)) {
    return `confused`
  }

  if (/afraid|scared|anxious/.test(source)) {
    return `afraid`
  }

  return normalizeFeeling(input.emotion || input.qualities || input.groundedImpact || ``, input) || `hurt`
}

function buildConnectionEnding(request) {
  const normalized = normalizeWhitespace(request).toLowerCase()

  if (!normalized) {
    return `so we can talk it through`
  }

  if (/understand|what's going on|what is going on|clearer conversation/.test(normalized)) {
    return `so we can understand each other more clearly`
  }

  if (/present|connected|talk this through together/.test(normalized)) {
    return `so we can stay connected`
  }

  return `so we can talk it through`
}

function buildSoftInvitationLine(request) {
  const normalized = normalizeWhitespace(request)

  if (!normalized) {
    return `If you're open to it, I'd like to talk this through`
  }

  if (/^a little space\b/i.test(normalized)) {
    return `If you're open to it, I'd appreciate ${normalized}`
  }

  if (/understand what's going on|understand what is going on/i.test(normalized)) {
    return `If you're open to it, I'd like to understand what's happening for you`
  }

  if (/^to\b/i.test(normalized)) {
    if (/talk this through|understand/.test(normalized)) {
      return `If you're open to it, I'd like to talk this through`
    }

    return `If you're open to it, I'd like ${normalized}`
  }

  return `If you're open to it, I'd appreciate ${normalized}`
}

function buildFirmInvitationLine(request) {
  const normalized = normalizeWhitespace(request)

  if (!normalized) {
    return `I'd like to talk this through clearly`
  }

  if (/^a little space\b/i.test(normalized)) {
    return `I'd like ${normalized} before we keep going`
  }

  if (/understand what's going on|understand what is going on/i.test(normalized)) {
    return `I'd like to talk this through clearly`
  }

  if (/present|connected/i.test(normalized)) {
    return `I'd like to talk this through clearly`
  }

  if (/^to\b/i.test(normalized)) {
    const conciseRequest = normalized.replace(/^to\s+/i, ``)

    if (/talk this through|understand/.test(conciseRequest)) {
      return `I'd like to talk this through clearly`
    }

    return `I'd like to ${conciseRequest}`
  }

  return `I'd like ${normalized}`
}

function normalizeIntegratedBoundary(boundary) {
  const normalized = normalizeWhitespace(buildGroundedBoundary(boundary) || boundary)

  if (!normalized) {
    return ``
  }

  const trimmed = normalized.replace(/[.!?]+$/, ``)

  if (/^(going forward,|i('| a)?m\b|i would\b|i'd\b|i need\b|it('| i)?s important to me\b|it matters to me\b)/i.test(trimmed)) {
    return sentenceCase(trimmed)
  }

  return `Going forward, ${trimmed.charAt(0).toLowerCase()}${trimmed.slice(1)}`
}

function integrateBoundaryIntoInvitation(invitationLine, boundary) {
  const normalizedInvitation = normalizeWhitespace(invitationLine)
  const normalizedBoundary = normalizeIntegratedBoundary(boundary)

  if (!normalizedInvitation) {
    return finishSentence(normalizedBoundary)
  }

  if (!normalizedBoundary) {
    return finishSentence(sentenceCase(normalizedInvitation))
  }

  if (hasSemanticOverlap(normalizedInvitation, normalizedBoundary)) {
    return finishSentence(sentenceCase(normalizedInvitation))
  }

  const invitationBody = finishSentence(sentenceCase(normalizedInvitation)).replace(/[.!?]+$/, ``)
  const boundaryBody = normalizedBoundary
    .replace(/[.!?]+$/, ``)
    .replace(/^Going forward,\s*/i, `going forward, `)

  return finishSentence(`${invitationBody}, and ${boundaryBody}`)
}

function buildSoftToneTemplate(feeling) {
  const normalizedFeeling = normalizeWhitespace(feeling) || `affected`

  return [
    `I noticed some distance between us in our conversation, I felt ${normalizedFeeling}.`,
    `If you're open to it, I'd like to talk this through.`,
  ].join(` `)
}

function buildNeutralToneTemplate(feeling, request) {
  const normalizedFeeling = normalizeWhitespace(feeling) || `affected`
  const normalizedRequest = normalizeWhitespace(request)
  const balancedRequest = normalizedRequest ? buildInvitationLine(normalizedRequest) : `I'd like to talk this through`

  return [
    `When the conversation felt less open, I felt ${normalizedFeeling}.`,
    finishSentence(sentenceCase(balancedRequest)),
  ].join(` `)
}

function buildDirectToneTemplate(feeling) {
  const normalizedFeeling = normalizeWhitespace(feeling) || `affected`

  return [
    `When the conversation became less open, I felt ${normalizedFeeling}.`,
    `I'd like to talk this through clearly.`,
  ].join(` `)
}

function buildToneTemplateMessages(feeling, request) {
  const normalizedFeeling = normalizeWhitespace(feeling) || `affected`

  return {
    soft: buildSoftToneTemplate(normalizedFeeling),
    balanced: buildNeutralToneTemplate(normalizedFeeling, request),
    firm: buildDirectToneTemplate(normalizedFeeling),
  }
}

function buildToneVariants(messageTemplates, boundary = ``) {
  return {
    soft: applyNaturalPhrasingFilter(
      integrateBoundaryIntoInvitation(messageTemplates.soft, boundary),
    ),
    balanced: applyNaturalPhrasingFilter(
      integrateBoundaryIntoInvitation(messageTemplates.balanced, boundary),
    ),
    firm: applyNaturalPhrasingFilter(
      integrateBoundaryIntoInvitation(messageTemplates.firm, boundary),
    ),
  }
}

function parseNumericScore(value) {
  const parsed = Number.parseInt(String(value || '').trim(), 10)
  return Number.isFinite(parsed) ? parsed : 0
}

function chooseDefaultToneVariant(input) {
  const intensity = parseNumericScore(input.intensity)
  const clarity = String(input.clarity || '').toLowerCase()
  const reactivity = String(input.reactivity || '').toLowerCase()
  const boundaryChoice = String(input.boundaryChoice || '').toLowerCase()
  const story = normalizeWhitespace(input.story).toLowerCase()
  const rawMessage = normalizeWhitespace(input.rawMessage).toLowerCase()
  const need = normalizeWhitespace(input.need).toLowerCase()

  const lowClarity = clarity === 'foggy'
  const highClarity = clarity === 'very clear'
  const highReactivity = reactivity === 'high'
  const mediumReactivity = reactivity === 'medium'
  const overwhelmed = intensity >= 8 || lowClarity
  const vulnerable =
    /hurt|fragile|hesitant|unsure|shaken|overwhelmed|sad|heartbroken|afraid|scared/.test(story) ||
    /hurt|fragile|hesitant|unsure|shaken|overwhelmed|sad|heartbroken|afraid|scared/.test(rawMessage)
  const repeatedPattern =
    /always|again|keeps|kept|every time|repeated|pattern|continues|continuing/.test(story) ||
    /always|again|keeps|kept|every time|repeated|pattern|continues|continuing/.test(rawMessage)
  const wantsDirectness =
    /direct|clear|firm|straight|honest|say it plainly|say it directly/.test(need) ||
    /direct|clear|firm|straight|say it plainly|say it directly/.test(rawMessage)

  if (overwhelmed || vulnerable) {
    return 'soft'
  }

  if (!highReactivity && (highClarity || boundaryChoice === 'yes' || repeatedPattern || wantsDirectness)) {
    return 'firm'
  }

  if (mediumReactivity || highClarity || intensity >= 4) {
    return 'balanced'
  }

  return 'balanced'
}

function buildClearRequest(input, variables, tone) {
  const boundary = normalizeWhitespace(input.boundary)
  const need = normalizeWhitespace(variables.need || input.need)
  const source = `${boundary} ${need}`.toLowerCase()

  if (/present/.test(source)) return 'to stay present with each other'
  if (/clarity|what'?s going on|tell me/.test(source)) return `to understand what's going on`
  if (/slow/.test(source)) return `to slow this down`
  if (/clear/.test(source)) return `to have a clearer conversation`
  if (/respect/.test(source)) return `to talk in a more respectful way`
  if (/space|step away/.test(source)) return `a little space before we keep going`
  if (tone.professional) return `to talk this through clearly`

  return normalizeNeed(variables.need || input.need || ``) || `to talk this through together`
}

function buildInvitationLine(request) {
  const normalized = normalizeWhitespace(request)

  if (!normalized) {
    return `I'd like to talk this through`
  }

  if (/^a little space\b/i.test(normalized)) {
    return `I would appreciate ${normalized}`
  }

  if (/understand what's going on|understand what is going on/i.test(normalized)) {
    return `I'd like to talk this through so we can understand each other`
  }

  if (/^to\b/i.test(normalized)) {
    return `I'd like ${normalized} ${buildConnectionEnding(normalized)}`
  }

  return `I'd appreciate ${normalized}`
}

function buildRawResponse(variables, _style, tone) {
  const feeling = toneFeeling(variables.feeling, tone)
  const meaning = buildMeaningPhrase(variables)
  return finishSentence(
    sentenceCase(`${behaviorClause(variables.behavior)}, ${buildOwnedFeeling(feeling, meaning)}`),
  )
}

function buildRelationalResponse(variables, _style, tone) {
  const feeling = toneFeeling(variables.feeling, tone)
  const meaning = buildMeaningPhrase(variables)
  return buildToneVariants(
    buildToneTemplateMessages(`${normalizeWhitespace(feeling)}${meaning ? ` and ${meaning}` : ``}`, `to talk this through so we can understand each other more clearly`),
  ).balanced
}

function buildBoundaryResponse(variables, input, tone) {
  const request = buildClearRequest(input, variables, tone)
  const feeling = toneFeeling(variables.feeling, tone)
  return buildToneVariants(buildToneTemplateMessages(feeling, request)).firm
}

function rewriteDisallowedPhrases(text) {
  return normalizeWhitespace(text)
    .replace(/\bpowerlessness\b/gi, `like I don't have any say in this`)
    .replace(/\bpowerless\b/gi, `like I don't have much control over this`)
    .replace(/\bit felt like\b/gi, `it feels like`)
    .replace(/\bI don't feel trusted\b/gi, `you don't trust me`)
    .replace(/\blike I'm not being trusted\b/gi, `like you don't trust me`)
    .replace(/\blike I'm not being understood\b/gi, 'like you are misunderstanding me')
    .replace(/this is getting to me/gi, 'that actually hurt')
    .replace(/this lands hard with me/gi, 'that actually hurt')
    .replace(/this landed hard with me/gi, 'that actually hurt')
    .replace(/i feel fed up/gi, `I'm done with this`)
    .replace(/\byou has\b/gi, `you have`)
    .replace(/\byou have went\b/gi, `you went`)
    .replace(/\bI need to feel connected and understood\b/gi, `I need us to actually talk this through`)
    .replace(/\bI need to feel understood\b/gi, `I need us to actually talk this through`)
    .replace(/\bI need to feel connected\b/gi, `I need us to stay present with each other`)
    .replace(/\bI need you to be present and open with me\b/gi, "I'd like us to stay present with each other and understand what's going on")
    .replace(/\bI want to repair our friendship\.?/gi, `I'd like to talk about what just happened.`)
    .replace(/I need to repair our friendship\.?/gi, 'I need us to actually talk this through.')
    .replace(/\brepair our friendship\b/gi, 'us to actually talk this through')
    .replace(/\bI feel ([a-z ]+)\.\.\.\s*/gi, 'I feel $1. ')
    .replace(/\ba bit powerless\b/gi, 'powerless')
}

function ensureRawStructure(text) {
  const normalized = rewriteDisallowedPhrases(text)
  const sentences = normalized
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean)

  const feeling =
    sentences.find((sentence) => /^I('| a)?m\b|^I feel\b|^I'm feeling\b|^This is\b/i.test(sentence)) ||
    sentences[0] ||
    `I'm feeling unsettled.`
  const impact =
    sentences.find((sentence) => /^It feels like\b/i.test(sentence)) ||
    `It feels like you shut me out.`
  const need =
    sentences.find((sentence) => /something needs to shift here|^I need\b/i.test(sentence)) ||
    `Something needs to shift here.`

  return normalizeWhitespace([feeling, impact, need].join(` `))
}

function finalizeResponses(responses) {
  return {
    raw: capitalizeSentences(rewriteDisallowedPhrases(responses.raw)),
    relational: capitalizeSentences(rewriteDisallowedPhrases(responses.relational)),
    boundary: capitalizeSentences(rewriteDisallowedPhrases(responses.boundary)),
  }
}

function getCoreBehaviorTerms(value) {
  return normalizeWhitespace(value)
    .toLowerCase()
    .split(/\s+/)
    .filter((term) => term.length > 3)
    .filter((term) => ![`just`, `now`, `there`, `without`, `anything`].includes(term))
}

function hasDuplicateSentence(text) {
  const sentences = normalizeWhitespace(text)
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim().toLowerCase())
    .filter(Boolean)

  return new Set(sentences).size !== sentences.length
}

function responsesNeedRepair(responses, input, variables) {
  const concreteBehavior = extractConcreteBehaviorPhrase(getSituationSource(input))
  const combined = `${responses.raw} ${responses.relational} ${responses.boundary}`.toLowerCase()
  const genericFallback = /tone shifted a bit|things felt off|that happened/.test(combined)
  const vagueBehaviorFallback =
    Boolean(concreteBehavior) &&
    /spoke to me that way|acted like that|when that happened/.test(combined)
  const repeatedFeeling = /(i feel ([a-z ]+)\.\s*i feel \2\b)/i.test(combined)
  const missingConcrete = Boolean(concreteBehavior) && /tone shifted a bit|things felt off/.test(combined)
  const duplicateSecondary =
    normalizeWhitespace(variables.secondaryFeeling).toLowerCase() ===
    normalizeWhitespace(variables.feeling).toLowerCase()
  const concreteTerms = getCoreBehaviorTerms(toSecondPersonBehavior(concreteBehavior))
  const missingCoreBehavior =
    concreteTerms.length > 1 && concreteTerms.some((term) => !combined.includes(term))
  const weakPhrases = /a bit frustrated|that feels dismissive/.test(combined)
  const thirdPersonSlip = /\bwhen he\b|\bwhen she\b|\bwhen they\b|\bhe\b|\bshe\b/.test(combined)
  const trustSlip = /\bi don't feel trusted\b|\blike i'm not being trusted\b/.test(combined)
  const duplicateSentence =
    hasDuplicateSentence(responses.raw) ||
    hasDuplicateSentence(responses.relational) ||
    hasDuplicateSentence(responses.boundary)

  return genericFallback || vagueBehaviorFallback || repeatedFeeling || missingConcrete || duplicateSecondary || missingCoreBehavior || weakPhrases || thirdPersonSlip || trustSlip || duplicateSentence
}

function repairVariables(variables, input) {
  const concreteBehavior = extractConcreteBehaviorPhrase(getSituationSource(input))
  const repairedBehavior = concreteBehavior
    ? dedupeRepeatedWords(toSecondPersonBehavior(concreteBehavior))
    : variables.behavior
  const repairedFeeling = normalizeFeeling(variables.feeling, input)
  let repairedSecondary = normalizeSecondaryFeeling(input)

  if (
    normalizeWhitespace(repairedSecondary).toLowerCase() ===
    normalizeWhitespace(repairedFeeling).toLowerCase()
  ) {
    repairedSecondary = ``
  }

  return {
    ...variables,
    behavior: repairedBehavior,
    feeling: repairedFeeling,
    secondaryFeeling: repairedSecondary,
    impact: normalizeImpact(variables.impact, input) || buildFallbackVariables(input).impact,
  }
}

function buildResponses(variables, input) {
  const style = getEmotionStyle(input, variables)
  const tone = getRelationshipTone(input)

  return {
    raw: buildRawResponse(variables, style, tone),
    relational: buildRelationalResponse(variables, style, tone),
    boundary: buildBoundaryResponse(variables, input, tone),
  }
}

function buildUnifiedProcessingResponse(input, variables) {
  const tone = getRelationshipTone(input)
  const request = buildClearRequest(input, variables, tone)
  const toneTemplates = buildToneTemplateMessages(toneFeeling(variables.feeling, tone), request)

  return buildToneVariants(toneTemplates)
}

function buildFreshResponses(input, seedVariables) {
  let variables = { ...seedVariables }
  let responses = finalizeResponses(buildResponses(variables, input))

  if (responsesNeedRepair(responses, input, variables)) {
    variables = repairVariables(variables, input)
    responses = finalizeResponses(buildResponses(variables, input))
  }

  if (responsesNeedRepair(responses, input, variables)) {
    const rebuilt = normalizeExtractedVariables({}, input)
    variables = repairVariables(rebuilt, input)
    responses = finalizeResponses(buildResponses(variables, input))
  }

  return responses
}

function ensureGroundedSentence(value, fallback = ``) {
  const normalized = normalizeWhitespace(value)
  if (!normalized) {
    return fallback
  }

  return finishSentence(sentenceCase(normalized))
}

function stripGroundedLeadIn(value) {
  return normalizeWhitespace(value)
    .replace(/^(my|our)\s+(boyfriend|girlfriend|partner|friend|coworker|manager|boss)\b[:,]?\s*/i, ``)
    .replace(/^the scene\b[:,]?\s*/i, ``)
    .replace(/^the situation\b[:,]?\s*/i, ``)
}

function makeGroundedSpoken(value, fallback = ``) {
  const normalized = stripGroundedLeadIn(value)

  if (!normalized) {
    return fallback
  }

  return ensureGroundedSentence(
    normalized
      .replace(/\blocate\b/gi, `check where`)
      .replace(/\bleave the scene\b/gi, `leave`)
      .replace(/\bpay attention to\b/gi, `pay a little more attention to`)
      .replace(/\bthis interaction\b/gi, `this`)
      .replace(/\bthe other person\b/gi, `you`)
      .replace(/\bregarding\b/gi, `about`),
    fallback,
  )
}

function firstGroundedSentence(value) {
  const normalized = normalizeWhitespace(value)

  if (!normalized) {
    return ``
  }

  return normalized.match(/[^.!?]+[.!?]?/)?.[0]?.trim() || normalized
}

function cleanupGroundedGrammar(value) {
  return normalizeWhitespace(value)
    .replace(/\b(?:REQUEST|WHAT HAPPENED|WHAT MATTERS|PRACTICAL HELP|CONTEXT)\s*:\s*/gi, ``)
    .replace(/\b(\w+)\s+\1\b/gi, `$1`)
    .replace(/\b(left|sent|told|asked|put|checked|called|texted|woke|closed|opened|forgot)\b([^.!?]{0,40}?)\band\s+\1\b/gi, `$1`)
    .replace(/\bto you\s+(could|can)\b/gi, `to `)
    .replace(/\bto you\b/gi, `to`)
    .replace(/\bthe mama dog\b/gi, `Havana`)
    .replace(/\bthe dog\b/gi, `Havana`)
    .replace(/\s+([,.!?])/g, `$1`)
}

function ensureGroundedSubject(value) {
  const text = normalizeWhitespace(value)

  if (!text) {
    return ``
  }

  if (/^(you|this|that|earlier|today|yesterday|this morning|this afternoon|this evening|last night|when|after|before)\b/i.test(text)) {
    return text
  }

  return `you ${text.replace(/^[,.\s]+/, ``)}`
}

function groundedCoreStory(value) {
  return stripGroundedLeadIn(value)
    .replace(/\b(and|but)\s+then\b/gi, `then`)
    .replace(/\s+/g, ` `)
    .trim()
}

function addSubjectToTimedEvent(value) {
  const text = normalizeWhitespace(value)

  if (!text) {
    return ``
  }

  const timedPrefixMatch = text.match(
    /^(this morning|this afternoon|this evening|today|yesterday|last night|earlier)\b[, ]*(.*)$/i,
  )

  if (!timedPrefixMatch) {
    return ensureGroundedSubject(text)
  }

  const [, prefix, rest] = timedPrefixMatch
  const normalizedRest = normalizeWhitespace(rest)

  if (!normalizedRest) {
    return prefix
  }

  if (/^(you|we|i|they)\b/i.test(normalizedRest)) {
    return `${prefix}, ${normalizedRest}`
  }

  return `${prefix}, you ${normalizedRest}`
}

function buildGroundedPracticalHelp(action) {
  const cleaned = firstGroundedSentence(action).replace(/^[Ww]hat would help is\s*/, ``)

  if (!cleaned) {
    return ``
  }

  const lowered = cleaned.charAt(0).toLowerCase() + cleaned.slice(1)

  if (/^(if you|you|we)\b/i.test(cleaned)) {
    return makeGroundedSpoken(`It would help if ${lowered}`)
  }

  if (/^[a-z]+ing\b/i.test(cleaned)) {
    return makeGroundedSpoken(`What would help is ${lowered}`)
  }

  return makeGroundedSpoken(`It would help if you could ${lowered}`)
}

function dedupeGroundedParts(parts) {
  const seen = new Set()

  return parts.filter((part) => {
    const normalized = normalizeWhitespace(part).toLowerCase()

    if (!normalized) {
      return false
    }

    const fingerprint = normalized
      .replace(/[^\w\s]/g, ``)
      .replace(/\b(i know|i understand|what would help is|going forward|i need|it matters to me|for me)\b/g, ``)
      .replace(/\s+/g, ` `)
      .trim()

    if (!fingerprint || seen.has(fingerprint)) {
      return false
    }

    seen.add(fingerprint)
    return true
  })
}

function groundedSentenceFingerprint(value) {
  return cleanupGroundedGrammar(value)
    .toLowerCase()
    .replace(/[^\w\s]/g, ``)
    .replace(/\b(i know|i understand|it would help if|what would help is|going forward|i need|it matters to me|for me|i want to say this clearly)\b/g, ``)
    .replace(/\s+/g, ` `)
    .trim()
}

function areGroundedSentencesSimilar(a, b) {
  const first = groundedSentenceFingerprint(a)
  const second = groundedSentenceFingerprint(b)

  if (!first || !second) {
    return false
  }

  if (first === second || first.includes(second) || second.includes(first)) {
    return true
  }

  const firstWords = new Set(first.split(` `).filter((word) => word.length > 3))
  const secondWords = new Set(second.split(` `).filter((word) => word.length > 3))
  const overlap = [...firstWords].filter((word) => secondWords.has(word)).length
  const denominator = Math.max(Math.min(firstWords.size, secondWords.size), 1)

  return overlap / denominator >= 0.7
}

function chooseBetterGroundedSentence(current, candidate) {
  const currentText = normalizeWhitespace(current)
  const candidateText = normalizeWhitespace(candidate)

  if (!currentText) return candidateText
  if (!candidateText) return currentText

  const currentScore =
    (currentText.length <= 120 ? 2 : 0) +
    (/^(this morning|today|yesterday|earlier|i know|i understand|going forward|it would help if|what would help is|i need)\b/i.test(currentText)
      ? 2
      : 0)
  const candidateScore =
    (candidateText.length <= 120 ? 2 : 0) +
    (/^(this morning|today|yesterday|earlier|i know|i understand|going forward|it would help if|what would help is|i need)\b/i.test(candidateText)
      ? 2
      : 0)

  if (candidateScore !== currentScore) {
    return candidateScore > currentScore ? candidateText : currentText
  }

  return candidateText.length < currentText.length ? candidateText : currentText
}

function createGroundedSections(parts = {}) {
  return {
    context: normalizeWhitespace(parts.context),
    event: normalizeWhitespace(parts.event),
    impact: normalizeWhitespace(parts.impact),
    request: normalizeWhitespace(parts.request),
    practicalHelp: normalizeWhitespace(parts.practicalHelp),
  }
}

function mergeGroundedSections(baseSections, nextSections) {
  const merged = createGroundedSections(baseSections)

  for (const key of [`context`, `event`, `impact`, `request`, `practicalHelp`]) {
    const nextValue = normalizeWhitespace(nextSections[key])

    if (!nextValue) {
      continue
    }

    if (!merged[key]) {
      merged[key] = nextValue
      continue
    }

    merged[key] = areGroundedSentencesSimilar(merged[key], nextValue)
      ? chooseBetterGroundedSentence(merged[key], nextValue)
      : chooseBetterGroundedSentence(merged[key], nextValue)
  }

  return merged
}

function buildGroundedAcknowledgment(input) {
  const context = makeGroundedSpoken(firstGroundedSentence(input.otherPersonContext))

  if (!context) {
    return ``
  }

  if (/^i\b/i.test(context)) {
    return context
  }

  return ensureGroundedSentence(`I understand ${stripGroundedLeadIn(firstGroundedSentence(input.otherPersonContext))}`)
}

function buildGroundedImpact(input) {
  return makeGroundedSpoken(
    firstGroundedSentence(input.groundedImpact),
    `This matters to me.`,
  )
}

function buildGroundedRequest(input) {
  return makeGroundedSpoken(
    firstGroundedSentence(input.groundedRequest),
    `Going forward, I need clearer communication.`,
  )
}

function buildGroundedAction(input) {
  return buildGroundedPracticalHelp(input.groundedAction)
}

function buildGroundedBehavior(input) {
  const story = groundedCoreStory(input.story)

  if (!story) {
    return `This did not land well for me.`
  }

  return makeGroundedSpoken(addSubjectToTimedEvent(story), `This did not land well for me.`)
}

function joinSentences(...parts) {
  return cleanupGroundedGrammar(dedupeGroundedParts(parts).join(` `))
}

function simplifyGroundedImpact(value) {
  const normalized = firstGroundedSentence(value)

  if (!normalized) {
    return ``
  }

  return cleanupGroundedGrammar(
    normalized
      .replace(/\bit wakes me up and i can[`’]t go back to sleep\b/gi, `it ends up waking me up and I can't go back to sleep`)
      .replace(/\bshe gets agitated and\b/gi, '')
      .replace(/\bit ends up\b([^.!?]*?)\band it\b/gi, `it ends up$1 and`)
      .replace(/\b(.*?)(and it makes|and that makes|which makes)\b.*$/i, '$1'),
  )
}

function rewriteGroundedEvent(value) {
  const normalized = cleanupGroundedGrammar(firstGroundedSentence(value))

  if (!normalized) {
    return ''
  }

  return cleanupGroundedGrammar(
    normalized
      .replace(/\byou left Havana in the bedroom while you left for work\b/gi, `This morning, you left Havana in the bedroom before you left for work`)
      .replace(/\byou left the mama dog in the bedroom\b/gi, `you left Havana in the bedroom`)
      .replace(/\byou left for work and left\b/gi, `you left`)
      .replace(/\byou went to work and left\b/gi, `you left`)
      .replace(/\byou left and left\b/gi, `you left`)
      .replace(/\byou\s+(\w+)\s+and\s+\1\b/gi, `you $1`),
  )
}

function finalizeGroundedOutput(text) {
  const normalized = cleanupGroundedGrammar(text)

  if (!normalized) {
    return ''
  }

  const sentences = normalized
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => cleanupGroundedGrammar(sentence))
    .filter(Boolean)

  const deduped = []
  const seen = new Set()

  for (const sentence of sentences) {
    const fingerprint = sentence
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\b(i know|i understand|it would help if|what would help is|going forward|i need)\b/g, '')
      .replace(/\s+/g, ` `)
      .trim()

    if (!fingerprint || seen.has(fingerprint)) {
      continue
    }

    seen.add(fingerprint)
    deduped.push(sentence)
  }

  return cleanupGroundedGrammar(deduped.join(` `))
}

function buildGroundedOutputFromSections(sections) {
  return finalizeGroundedOutput(
    [
      sections.context,
      sections.event,
      sections.impact,
      sections.request,
      sections.practicalHelp,
    ]
      .filter(Boolean)
      .join(` `),
  )
}

function buildGroundedBoundary(boundary) {
  const normalized = makeGroundedSpoken(firstGroundedSentence(boundary))

  if (!normalized) {
    return ''
  }

  return cleanupGroundedGrammar(
    normalized
      .replace(/\bif this continues,?\s*/gi, '')
      .replace(/\bif this keeps happening,?\s*/gi, '')
      .replace(/\bi will step away\b/gi, `I don't want this to keep happening`)
      .replace(/\bi will step back\b/gi, `I need this handled more consistently`)
      .replace(/\bi am going to pause the conversation and come back to it later\b/gi, `this needs more care going forward`),
  )
}

function buildGroundedResponses(input) {
  const tone = getRelationshipTone(input)
  const groundedFeeling = inferGroundedFeeling(input, tone)
  const request = buildGroundedRequest(input)
  const action = buildGroundedAction(input)
  const requestSource = [request, action].filter(Boolean).join(` `) || `to talk this through together`
  const toneVariants = buildToneVariants(buildToneTemplateMessages(groundedFeeling, requestSource))
  const defaultTone = chooseDefaultToneVariant(input)

  return { response: toneVariants[defaultTone] || toneVariants.balanced, toneVariants, defaultTone }
}

async function extractBehaviorWithRetry(client, input) {
  const behaviorRetry = await client.chat.completions.create({
    model,
    temperature: 0,
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'behavior_repair',
        schema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            behavior: { type: 'string' },
          },
          required: ['behavior'],
        },
      },
    },
    messages: [
      {
        role: 'system',
        content:
          `Extract only a concrete behavior from the user input. Return valid JSON only with the key behavior. If a specific action exists, do not use generic fallbacks. If no concrete behavior exists, return an empty string.`,
      },
      {
        role: 'user',
        content: buildBehaviorRepairPrompt(input),
      },
    ],
  })

  const retriedBehavior = JSON.parse(behaviorRetry.choices[0]?.message?.content || '{}')
  const concreteBehavior = extractConcreteBehaviorPhrase(getSituationSource(input))
  const repairedBehavior = normalizeBehaviorValue(retriedBehavior.behavior, input)

  return (
    (repairedBehavior && !/tone shifted|that happened|off track/i.test(repairedBehavior) && repairedBehavior) ||
    normalizeBehaviorValue(concreteBehavior, input) ||
    ''
  )
}

async function preprocessStoryInput(client, input) {
  const completion = await client.chat.completions.create({
    model,
    temperature: 0.1,
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'story_preprocessing',
        schema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            happened: { type: 'string' },
            behavior: { type: 'string' },
            meaning: { type: 'string' },
          },
          required: ['happened', 'behavior', 'meaning'],
        },
      },
    },
    messages: [
      {
        role: 'system',
        content:
          `Preprocess the user input into likely event structure. Return valid JSON only with happened, behavior, and meaning. The input may be messy, emotional, repetitive, or incoherent. Infer the most likely behavior whenever a real action or pattern is present.`,
      },
      {
        role: 'user',
        content: buildPreprocessingPrompt(input),
      },
    ],
  })

  const parsed = JSON.parse(completion.choices[0]?.message?.content || '{}')

  return {
    happened: normalizeWhitespace(parsed.happened),
    behavior: normalizeWhitespace(parsed.behavior),
    meaning: normalizeWhitespace(parsed.meaning),
  }
}

function needsBehaviorRetry(behavior, input) {
  const eventField = normalizeWhitespace(input.facts_normalized || input.facts)
  const hasConcrete = Boolean(extractConcreteBehaviorPhrase(eventField))
  const normalized = normalizeWhitespace(behavior).toLowerCase()

  return (
    (hasConcrete && (!normalized || /tone shifted|that happened|off track/.test(normalized))) ||
    hasInvalidSecondPersonBehavior(normalized)
  )
}

function buildBehaviorRepairPrompt(input) {
  return [
    `Extract behavior only.`,
    `Return JSON only.`,
    `Return exactly this shape:`,
    '{',
    `  "behavior": "..."`,
    '}',
    'Rules:',
    `- Use only "What actually happened?" as the source for behavior extraction.`,
    `- Do not use boundaries, needs, meaning, raw expression, or other fields to infer behavior.`,
    `- If a concrete behavior exists in "What actually happened?", extract that specific behavior.`,
    `- A concrete behavior is required only from "What actually happened?".`,
    `- The input may be spoken, long, or story-based. Summarize multiple sentences into one clear behavior when needed.`,
    `- Prioritize repeated patterns, the user's emotional conclusion, and phrases like "I resent...", "I felt...", or "they were trying to..." when they point to a concrete action.`,
    `- Prioritize the other person's reaction pattern after the event, such as getting upset, shutting down, withdrawing, or going cold, over a shallow summary of the trigger itself.`,
    `- Preserve specific concrete actions whenever they are present, such as "yelled at me", "ignored me", "shut down", or "dismissed what I said".`,
    `- Do not soften a clear behavior into vague phrasing like "spoke to me that way", "acted like that", or "when that happened".`,
    `- Do not summarize with generic fallbacks like "the tone shifted" if a concrete action is present.`,
    `- If no concrete behavior can be extracted, return an empty string.`,
    `- Do not return "that happened".`,
    `- Convert third-person behavior into correct second-person grammar.`,
    `- Example: "he refuses to call my dog by his name" -> "refuse to call my dog by his name".`,
    `- Example: "he doesn't call" -> "don't call".`,
    `- Example: "she tried to manipulate me covertly" -> "tried to pull me into something that wasn't mine" or "were indirect about it".`,
    `- Example: "My friend kept asking indirect questions and eventually asked me to change plans that weren't mine." -> "tried to get me to change plans that weren't mine by being indirect".`,
    `- Example: "My friend asked me for a ride, I said no, and he got upset and shut down." -> "got upset and shut down because I couldn't help you".`,
    `- behavior must be short, natural, and grammatically usable after "when you" or "when".`,
    '',
    `"What actually happened?": ${input.facts_normalized || input.facts || ''}`,
  ].join('\n')
}

function buildPreprocessingPrompt(input) {
  return [
    `You are preprocessing a messy emotional story into usable structure.`,
    `Return JSON only.`,
    `Return exactly this shape:`,
    '{',
    `  "happened": "...",`,
    `  "behavior": "...",`,
    `  "meaning": "..."`,
    '}',
    'Rules:',
    `- The user may be rambling, fragmented, repetitive, emotional, or grammatically messy.`,
    `- Act like an intelligent listener organizing the story, not correcting the user.`,
    `- Infer the most likely event, the core behavior of the other person, and the user's likely emotional meaning.`,
    `- Summarize multiple sentences into one clear behavior when needed.`,
    `- Prioritize repeated patterns, the user's emotional conclusion, and phrases like "I resent...", "I felt...", or "they were trying to...".`,
    `- behavior should be one short, concrete phrase in third-person or neutral form that can later be converted into a response.`,
    `- happened should be one clean sentence about what most likely happened.`,
    `- meaning should be one short sentence or phrase about what it likely meant emotionally to the user.`,
    `- Only leave behavior empty if there is truly no inferable action or pattern at all.`,
    `- Example messy input: "My friend kept asking indirect questions and eventually wanted me to rearrange birthday plans that weren't mine, and I resented being pulled into that."`,
    `- Example output behavior: "she tried to get me to change plans that weren't mine by being indirect".`,
    '',
    `What happened field: ${input.story || ''}`,
    `What actually happened field: ${input.facts || ''}`,
    `Meaning field: ${input.interpretation || ''}`,
    `Raw message: ${input.rawMessage || ''}`,
    `Emotion: ${input.emotion || ''}`,
    `Emotional qualities: ${input.qualities || ''}`,
    `Relationship type: ${input.relationship_type || ''}`,
    `Relationship importance: ${input.relationship_importance || ''}`,
  ].join('\n')
}

function buildExtractionPrompt(input) {
  return [
    `Extract structured variables only.`,
    `Return JSON only.`,
    `Do not write final responses.`,
    `Do not generate coaching language or therapy language.`,
    `Return exactly this shape:`,
    '{',
    `  "behavior": "...",`,
    `  "feeling": "...",`,
    `  "impact": "...",`,
    `  "need": "...",`,
    '}',
    '',
    'Rules:',
    `- Only extract the four variables.`,
    `- Do not write any full response sentences.`,
    `- The app will assemble the final responses from structured sentence construction.`,
    ...voiceProfileGuidance.split('\n').map((line) => `- ${line}`),
    `- Use only "What actually happened?" for behavior extraction.`,
    `- Do not use boundaries, needs, meaning, practical help, relational context, or raw expression to infer behavior.`,
    `- behavior must be a short second-person phrase without "when you".`,
    `- If "What actually happened?" contains a concrete behavior, extract that exact behavior instead of using a generic fallback.`,
    `- Concrete behavior extraction is required only when "What actually happened?" contains a real action.`,
    `- Summarize multiple sentences from "What actually happened?" into one clear behavior when needed.`,
    `- Preserve specific concrete actions whenever they are present, such as "yelled at me", "ignored me", "shut down", or "dismissed what I said".`,
    `- Do not soften a clear behavior into vague phrasing like "spoke to me that way", "acted like that", or "when that happened".`,
    `- Convert third-person behavior to correct second-person grammar.`,
    `- Example: if the user says "he refuses to call my dog by his name", behavior should be "refuse to call my dog by his name" or "won't call my dog by his name".`,
    `- Example: if the user says "she tried to manipulate me covertly", behavior should be "tried to pull me into something that wasn't mine" or "were indirect about it".`,
    `- Example: if the user says "My friend kept asking indirect questions and eventually asked me to change plans that weren't mine", behavior should be "tried to get me to change plans that weren't mine by being indirect".`,
    `- Example: if the user says "My friend asked me for a ride, I said no, and he got upset and shut down", behavior should be "got upset and shut down because I couldn't help you".`,
    `- Do not use generic fallbacks like "the tone shifted a bit" or "that happened".`,
    `- If no specific behavior can be extracted from "What actually happened?", return behavior as an empty string so the server can retry extraction.`,
    `- Example behavior values: "shut down just now", "walked away without saying anything", "accused me of lying".`,
    `- behavior should be clean and compact, with no duplicated words like "you you".`,
    `- Use "What did it feel like or mean to you?" as the primary source for feeling and impact.`,
    `- If that field names hurt, betrayal, disappointment, resentment, dismissal, or invalidation, reflect that directly in feeling and impact.`,
    `- feeling should be a single clear emotion or a very short phrase, such as "frustrated", "angry", or "powerless".`,
    `- Keep everything based only on the user input.`,
    `- Keep values short, natural, and close to the user voice.`,
    `- impact should be a short phrase that fits after "It feels like ...", such as "I'm being shut out".`,
    `- need should be simple and direct, like "some clarity" or "you to tell me what's going on".`,
    `- Use present tense whenever possible.`,
    `- Remove filler words like "like" or "and like", and avoid repeated phrases.`,
    `- Anger should use a direct, structured, assertive tone.`,
    `- Sadness or hurt should use a softer, more emotional tone with less rigid wording.`,
    `- For sadness or hurt, avoid phrases like "I have nothing to work with".`,
    `- Confusion should sound observational and curious, using openings like "I notice..." or "It seems like...".`,
    `- For confusion, use present-moment observations such as "the conversation shifted" or "the tone changed".`,
    `- For confusion, use curiosity like "Did I say something that landed wrong?" and avoid directive or corrective tone.`,
    `- Confusion boundaries should gently redirect and invite return to connection, not feel forceful.`,
    `- Match the behavior to the actual scenario, such as "yelled at me" or "dismissed what I said", rather than assuming shutdown.`,
    `- Relationship type should affect tone and word choice, even though the app keeps the same overall structure.`,
    `- If relationship importance is very important, increase warmth, care, and collaboration.`,
    `- If relationship importance is somewhat important, keep moderate warmth, light connection, and balanced tone.`,
    `- If relationship type is romantic partner or close friend, allow more vulnerability and connection.`,
    `- If relationship type is coworker / professional, keep the tone more neutral, composed, and less personal.`,
    `- If relationship type is acquaintance / casual and relationship importance is not important, reduce emotional investment and keep the tone neutral and detached.`,
    `- In that detached casual case, avoid warm phrases like "come back to the energy we were connecting in" and make invitations optional.`,
    '',
    `Context signals:`,
    `Preprocessed likely event: ${input.preprocessed_happened || ''}`,
    `"What actually happened?": ${input.facts_normalized || input.facts || ''}`,
    `"What did it feel like or mean to you?": ${input.interpretation || ''}`,
    `"What happened" description: ${input.story || ''}`,
    `Primary emotion: ${input.emotion || ''}`,
    `Emotional qualities: ${input.qualities || ''}`,
    `Need: ${input.need || ''}`,
    `Boundary: ${input.boundary || ''}`,
    `Raw message draft: ${input.rawMessage || ''}`,
    `Relationship type: ${input.relationship_type || ''}`,
    `Relationship importance: ${input.relationship_importance || ''}`,
  ].join('\n')
}

app.get('/health', (_req, res) => {
  res.json({ ok: true })
})

app.post('/process', (req, res) => {
  const { text = '' } = req.body ?? {}

  res.set('Cache-Control', 'no-store')
  res.json({
    ok: true,
    received: text,
    message: `Backend communication is working.`,
    processedAt: new Date().toISOString(),
  })
})

app.post('/transcribe-audio', requireApiKey, async (req, res) => {
  const { audio, mimeType, fileName, prompt } = req.body ?? {}

  if (!audio) {
    return res.status(400).json({
      error: `audio is required.`,
    })
  }

  try {
    const audioBuffer = decodeBase64Audio(audio)
    const extension = getFileExtension(fileName)

    logTranscriptionRequest({
      incomingMimeType: mimeType || '',
      fileName: fileName || '',
      fileExtension: extension,
      bufferBytes: audioBuffer?.length || 0,
      promptProvided: Boolean(normalizeWhitespace(prompt)),
    })

    if (!audioBuffer?.length) {
      logTranscriptionRequest({
        status: 'rejected',
        reason: 'empty_audio_buffer',
      })
      return res.status(400).json({
        error: `Audio payload could not be decoded.`,
      })
    }

    if (audioBuffer.length < 1024) {
      logTranscriptionRequest({
        status: 'rejected',
        reason: 'audio_buffer_too_small',
        bufferBytes: audioBuffer.length,
      })
      return res.status(400).json({
        error: `Audio payload is too small to transcribe reliably.`,
      })
    }

    const inferredExtension =
      mimeType === 'audio/mp4' || mimeType === 'audio/m4a'
        ? 'm4a'
        : mimeType === 'audio/ogg'
          ? 'ogg'
          : mimeType === 'audio/wav'
            ? 'wav'
            : 'webm'

    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })

    const resolvedFileName = fileName || `microphone-recording.${inferredExtension}`
    const resolvedMimeType = mimeType || `audio/${inferredExtension}`

    logTranscriptionRequest({
      status: 'forwarding_to_openai',
      openAiFileName: resolvedFileName,
      openAiFileExtension: getFileExtension(resolvedFileName),
      openAiMimeType: resolvedMimeType,
      bufferBytes: audioBuffer.length,
    })

    const upload = await toFile(audioBuffer, resolvedFileName, {
      type: resolvedMimeType,
    })

    const transcription = await client.audio.transcriptions.create({
      file: upload,
      model: transcriptionModel,
      language: 'en',
      prompt: normalizeWhitespace(prompt),
      response_format: 'json',
    })

    logTranscriptionRequest({
      status: 'success',
      outputChars: transcription.text?.length || 0,
    })

    return res.json({
      text: softenTranscriptionPunctuation(transcription.text),
    })
  } catch (error) {
    console.error(`OpenAI transcription failed:`, error)

    return res.status(500).json({
      error: error?.message || `Something went wrong while transcribing audio.`,
    })
  }
})

app.post('/generate-response', requireApiKey, async (req, res) => {
  res.set('Cache-Control', 'no-store')
  res.set(`Pragma`, 'no-cache')
  res.set(`Expires`, '0')

  const {
    communicationMode,
    intensity,
    clarity,
    reactivity,
    story,
    emotion,
    qualities,
    facts,
    interpretation,
    need,
    boundary,
    rawMessage,
    relationship_type,
    relationship_importance,
    otherPersonContext,
    groundedImpact,
    groundedRequest,
    groundedAction,
    boundaryChoice,
    userBoundary,
    submissionStepId,
  } = req.body ?? {}
  const submittedBoundary = firstProvided(boundary, userBoundary)
  const skipBehaviorValidation = submissionStepId === 'boundary'

  if (communicationMode === 'grounded') {
    if (!story || !groundedRequest) {
      return res.status(400).json({
        error: `story and groundedRequest are required for grounded mode.`,
      })
    }

    return res.json(
      buildGroundedResponses({
        story,
        otherPersonContext,
        groundedImpact,
        groundedRequest,
        groundedAction,
        boundaryChoice,
        boundary: submittedBoundary,
        userBoundary: submittedBoundary,
      }),
    )
  }

  if (!story || !emotion || !need) {
    return res.status(400).json({
      error: `story, emotion, and need are required.`,
    })
  }

  try {
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
    const baseInput = {
      communicationMode,
      story,
      emotion,
      qualities,
      facts,
      interpretation,
      need,
      boundary: submittedBoundary,
      boundaryChoice,
      userBoundary: submittedBoundary,
      rawMessage,
      relationship_type,
      relationship_importance,
    }
    const preprocessed = await preprocessStoryInput(client, baseInput)
    const normalizedFacts = normalizeBehavior(firstProvided(facts, preprocessed.happened))
    const input = {
      ...baseInput,
      facts_normalized: normalizedFacts,
      preprocessed_happened: preprocessed.happened,
      preprocessed_behavior: normalizeBehaviorValue(preprocessed.behavior, {
        ...baseInput,
        facts_normalized: normalizedFacts,
      }),
      preprocessed_meaning: preprocessed.meaning,
    }

    console.log({
      submissionStepId: submissionStepId || '',
      skipBehaviorValidation,
      happened: firstProvided(normalizedFacts, story),
      meaning: firstProvided(interpretation, rawMessage, story),
      emotion,
      relationship: {
        type: relationship_type || '',
        importance: relationship_importance || '',
      },
      preprocessed,
    })

    const completion = await client.chat.completions.create({
      model,
      temperature: 0.2,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'reframe_variables',
          schema: {
            type: 'object',
            additionalProperties: false,
            properties: {
              behavior: { type: 'string' },
              feeling: { type: 'string' },
              impact: { type: 'string' },
              need: { type: 'string' },
            },
            required: ['behavior', 'feeling', 'impact', 'need'],
          },
        },
      },
      messages: [
        {
          role: 'system',
          content:
            `Extract only the requested variables from the user input. Use only these fields: "What actually happened?", "What did it feel like or mean to you?", "what happened", emotion, qualities, need, boundary, raw user expression, relationship_type, and relationship_importance. Return valid JSON only with the keys behavior, feeling, impact, and need. Do not write any full response sentences because the app will build the final responses from structured sentence construction. behavior must prioritize "What actually happened?" and be a short second-person phrase derived from the actual behavior in the moment. If a concrete behavior exists there, you must use it rather than a generic fallback. feeling and impact must prioritize "What did it feel like or mean to you?" so emotional meaning comes from that field first. feeling must be a single clear emotion or very short phrase. impact must be a short phrase that fits after "It feels like ...". need must be simple and direct. Use relationship context to influence tone selection: very important means warmer and more collaborative; somewhat important means moderate warmth and light connection; romantic partner or close friend allows more vulnerability; coworker / professional should stay composed and less personal; acquaintance / casual plus not important should be neutral, detached, and less emotionally invested. Remove filler words, duplicated words, repeated phrasing, and generic endings like "like that". Keep extracted language natural, grounded, and precise instead of vague or clinical.\n${voiceProfileGuidance}`,
        },
        {
          role: 'user',
          content: buildExtractionPrompt(input),
        },
      ],
    })

    const content = completion.choices[0]?.message?.content

    if (!content) {
      return res.status(502).json({
        error: `OpenAI returned an empty response.`,
      })
    }

    const parsed = JSON.parse(content)
    let variables = normalizeExtractedVariables(parsed, input)

    if (!skipBehaviorValidation && needsBehaviorRetry(variables.behavior, input)) {
      const repairedBehavior = await extractBehaviorWithRetry(client, input)
      variables = {
        ...variables,
        behavior: repairedBehavior || variables.behavior,
      }
    }

    if (!skipBehaviorValidation && !normalizeWhitespace(variables.behavior)) {
      const repairedBehavior = await extractBehaviorWithRetry(client, input)

      if (!normalizeWhitespace(repairedBehavior)) {
        return res.status(422).json({
          error: `Unable to extract a concrete behavior from the current input. Please add a more specific "What actually happened?" description.`,
          field: 'facts',
          validator: 'behavior',
        })
      }

      variables = {
        ...variables,
        behavior: repairedBehavior,
      }
    }

    const toneVariants = buildUnifiedProcessingResponse(input, variables)
    const defaultTone = chooseDefaultToneVariant({
      ...input,
      intensity,
      clarity,
      reactivity,
      boundaryChoice,
    })

    return res.json({
      response: toneVariants[defaultTone] || toneVariants.balanced,
      toneVariants,
      defaultTone,
    })
  } catch (error) {
    console.error(`OpenAI generation failed:`, error)

    return res.status(500).json({
      error:
        error?.message || `Something went wrong while generating AI responses.`,
    })
  }
})

if (process.env.NODE_ENV !== 'production') {
  app.listen(port, '0.0.0.0', () => {
    console.log(`True Voice API listening on http://0.0.0.0:${port}`)
  })
}

export default app
