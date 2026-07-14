import { sampleNextToken, generateEmbedding } from './embeddings';
import { vectorDB } from './vectorDB';

// ── Static base vocabulary ────────────────────────────────────────────────────
const BASE_VOCAB = [
  'the','a','an','is','was','are','were','I','you','he','she','it','we','they',
  'to','of','in','and','that','have','with','this','from','on','at','by','or',
  'all','be','which','do','not','but','what','some','there','can','will','would',
  'model','neural','data','vector','attention','token','layer','head','weight',
  'language','learning','deep','network','transform','embedding','matrix','value',
  'beautiful','amazing','complex','simple','powerful','efficient','interesting',
  'generate','create','build','train','compute','process','encode','decode',
  'high','low','large','small','new','old','fast','slow','good','better','best',
  'information','system','approach','method','result','output','input','state',
  'name','person','engineer','software','developer','work','company','project',
  'called','known','professional','expert','student','researcher','scientist',
  'lives','based','works','builds','creates','designs','develops','studies',
  'user','human','assistant','answer','question','tell','know','about','who',
  'also','very','really','quite','much','more','most','many','few','just',
  'one','two','three','four','five','year','day','time','world','place',
  'passionate','skilled','experienced','talented','dedicated','enthusiastic',
];

// ── Build dynamic vocab from VectorDB text ────────────────────────────────────
export function buildDynamicVocab() {
  const allWords = new Set(BASE_VOCAB);
  vectorDB.getAll().forEach(entry => {
    const words = entry.text
      .toLowerCase()
      .replace(/[^a-z0-9'\s-]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length >= 2 && w.length <= 20);
    words.forEach(w => allWords.add(w));
  });
  return Array.from(allWords);
}

// ── Fact extraction ───────────────────────────────────────────────────────────
export function extractFacts(text) {
  const facts = {};
  const lower = text.toLowerCase();

  const nameMatch = lower.match(/(?:my name is|i am|i'm|call me|i go by|named)\s+([a-z]+)/i);
  if (nameMatch) facts.name = nameMatch[1].toLowerCase();

  const roleMatch = lower.match(/(?:i(?:'m| am) (?:a|an)|working as(?: a)?|i work as(?: a)?|i'm a|am a|job is)\s+([a-z][a-z\s]{2,30})(?=\s+(?:and|at|who|,|$|\.))/i);
  if (roleMatch) facts.role = roleMatch[1].trim().toLowerCase();

  const companyMatch = lower.match(/(?:work(?:ing)? at|work(?:ing)? for|employed (?:at|by)|at company|at the company|join(?:ed)?)\s+([a-z][a-z\s&.]{1,30})(?=\s|,|\.|$)/i);
  if (companyMatch) facts.company = companyMatch[1].trim().toLowerCase();

  const locationMatch = lower.match(/(?:live(?:s)? in|from|based in|located in|am from|i'm from)\s+([a-z][a-z\s]{1,30})(?=\s|,|\.|$)/i);
  if (locationMatch) facts.location = locationMatch[1].trim().toLowerCase();

  const likesMatch = lower.match(/(?:like|love|enjoy|passionate about|interested in|i love)\s+([a-z][a-z\s]{1,30})(?=\s|,|\.|$)/i);
  if (likesMatch) facts.likes = likesMatch[1].trim().toLowerCase();

  facts.keywords = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 3 && !['and','the','are','was','were','that','this','with','from','have','they','them','their','been','will','would','could','should'].includes(w));

  return facts;
}

// ── Retrieve all relevant facts from VectorDB ─────────────────────────────────
export function retrieveContext(prompt) {
  if (vectorDB.size === 0) return { context: null, facts: {}, similarity: 0, allResults: [] };
  const queryEmbed = generateEmbedding(prompt);
  const results = vectorDB.search(queryEmbed, 5);
  if (!results.length) return { context: null, facts: {}, similarity: 0, allResults: [] };

  const mergedFacts = {};
  results.slice(0, 3).forEach(r => {
    const f = extractFacts(r.text);
    Object.entries(f).forEach(([k, v]) => {
      if (k === 'keywords') {
        if (!mergedFacts.keywords) mergedFacts.keywords = [];
        mergedFacts.keywords.push(...(v || []));
      } else if (!mergedFacts[k]) {
        mergedFacts[k] = v;
      }
    });
  });

  if (mergedFacts.keywords) mergedFacts.keywords = [...new Set(mergedFacts.keywords)];

  return {
    context: results[0].text,
    facts: mergedFacts,
    similarity: results[0].similarity,
    allResults: results,
  };
}

// ── Context-aware logit scoring ───────────────────────────────────────────────
export function scoreLogits(prompt, vocab, facts) {
  const words = prompt.toLowerCase().trim().split(/\s+/);
  const lastWord = words[words.length - 1];
  const last2 = words.slice(-2).join(' ');
  const lower = prompt.toLowerCase();

  const subjectMatch = lower.match(/\b(?:who is|who are|about|describe|tell.*?about|what is|where is)\s+([a-z]+)/i);
  const qSubject = subjectMatch?.[1]?.toLowerCase();
  const subjectIsKnown = qSubject && facts.name && qSubject === facts.name;

  return vocab.map(word => {
    let score = Math.random() * 0.5;

    // Check if word was used recently (custom strong penalty for words we want to avoid repeating)
    const recentlyUsed = words.slice(-4).includes(word);
    
    if (recentlyUsed && ['is','a','an','the','of','to','and'].indexOf(word) === -1) {
       score -= 5; // strong penalty for repeating content words
    }

    if (Object.keys(facts).length > 0) {
      if (subjectIsKnown) {

        // BIGRAM TRANSITIONS FOR KNOWN FACTS (Simulating a good LLM)
        if (lastWord === facts.name) {
          if (word === 'is') score += 50;
        }
        if (lastWord === 'is' && last2.includes(facts.name)) {
          if (word === 'a') score += 50;
        }
        if (['a','an'].includes(lastWord) && words.includes(facts.name)) {
          if (facts.role && facts.role.startsWith(word)) score += 50;
        }
        if (facts.role && lastWord === facts.role.split(' ')[0]) {
          const roleParts = facts.role.split(' ');
          if (roleParts.length > 1 && word === roleParts[1]) score += 50;
        }
        if (facts.role && lastWord === facts.role.split(' ').pop()) {
          if (word === 'who') score += 50;
        }
        if (lastWord === 'who' && words.includes(facts.name)) {
          if (word === 'works') score += 50;
        }
        if (lastWord === 'works' && words.includes(facts.name)) {
          if (word === 'at') score += 50;
        }
        if (lastWord === 'at' && words.includes(facts.name)) {
          if (facts.company && facts.company.startsWith(word)) score += 50;
        }
        if (facts.company && lastWord === facts.company.split(' ')[0]) {
          const cParts = facts.company.split(' ');
          if (cParts.length > 1 && word === cParts[1]) score += 50;
        }
        if (facts.company && lastWord === facts.company.split(' ').pop()) {
          if (word === 'in') score += 50;
        }
        if (lastWord === 'in' && words.includes(facts.company.split(' ')[0])) {
          if (facts.location && facts.location.startsWith(word)) score += 50;
        }
        
        // Minor contextual boosts for randomness if the path breaks
        if (facts.role) facts.role.split(/\s+/).forEach(rw => { if (word === rw) score += 3; });
        if (['is','a','an','the','and','who','works','was','called','named','known'].includes(word)) score += 1;
        if (facts.company) facts.company.split(/\s+/).forEach(cw => { if (word === cw) score += 2; });
        if (facts.location) facts.location.split(/\s+/).forEach(lw => { if (word === lw) score += 2; });
        if (facts.likes) facts.likes.split(/\s+/).forEach(lw => { if (word === lw) score += 2; });
      }

      if (facts.keywords?.includes(word)) score += 0.5; // Very small generic boost

      if (facts.name && (lastWord === facts.name || last2.endsWith(facts.name))) {
        if (facts.role) facts.role.split(/\s+/).forEach(rw => { if (word === rw) score += 5; });
      }
    }

    // Grammar enforcement
    if (['is','was','are','were'].includes(lastWord)) {
      if (['a','an','the','not','very','quite','known','called','named','an'].includes(word)) score += 5;
    }
    if (['a','an'].includes(lastWord)) {
      if (['software','neural','deep','machine','data','senior','junior','experienced','passionate','skilled','professional'].includes(word)) score += 5;
      if (['engineer','developer','architect','scientist','researcher','designer','analyst'].includes(word)) score += 5;
    }
    if (['is a','is an','was a','was an'].includes(last2)) {
      if (facts.role) facts.role.split(/\s+/).forEach(rw => { if (word === rw) score += 10; });
      if (['software','neural','deep','machine','data','senior','junior','experienced'].includes(word)) score += 4;
    }
    if (['software','senior','junior','deep','machine','experienced','skilled','passionate'].includes(lastWord)) {
      if (['engineer','developer','architect','scientist','researcher','designer','analyst'].includes(word)) score += 8;
    }
    if (['and'].includes(lastWord)) {
      if (['also','works','builds','creates','develops','studies','is','I','we','he','she'].includes(word)) score += 4;
    }
    if (['works','work'].includes(lastWord)) {
      if (['at','for','in','on','with','as'].includes(word)) score += 8;
    }
    if (['from','in','at','based'].includes(lastWord)) {
      if (facts.location) facts.location.split(/\s+/).forEach(lw => { if (word === lw) score += 10; });
      if (facts.company) facts.company.split(/\s+/).forEach(cw => { if (word === cw) score += 8; });
    }
    if (['builds','creates','develops','designs'].includes(lastWord)) {
      if (['software','tools','systems','models','networks','applications','pipelines'].includes(word)) score += 8;
    }
    if (['the','a','an'].includes(lastWord)) {
      if (['model','system','network','data','approach','name','person'].includes(word)) score += 2;
    }

    if (word.length <= 2 && words.filter(w => w === word).length > 2) score -= 2;

    return score;
  });
}
