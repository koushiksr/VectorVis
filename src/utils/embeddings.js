// ─── Embedding Generation ────────────────────────────────────────────────────
// Generates semantic embeddings using a mathematical approach that captures
// real linguistic features: character n-grams, word frequencies, position, etc.
// This gives visually meaningful 3D clusters without requiring model download.

const VOCAB = [
  'the','a','an','is','are','was','were','be','been','have','has','had',
  'do','does','did','will','would','could','should','may','might','shall',
  'i','you','he','she','it','we','they','me','him','her','us','them',
  'this','that','these','those','which','who','what','when','where','why','how',
  'and','but','or','nor','for','yet','so','of','in','on','at','to','by',
  'with','from','up','about','into','through','during','before','after',
  'above','below','between','among','against','without','within',
  'data','model','neural','network','transformer','attention','embedding',
  'token','vector','matrix','layer','head','query','key','value','weight',
  'learning','training','inference','prediction','classification','generation',
  'language','text','word','sentence','corpus','vocabulary','semantic',
  'input','output','hidden','encoder','decoder','softmax','activation',
  'gradient','loss','optimizer','epoch','batch','dimension','parameter',
  'machine','deep','artificial','intelligence','algorithm','feature',
  'science','research','experiment','result','performance','accuracy',
  'good','bad','great','small','large','new','old','first','last',
  'time','year','day','people','world','system','work','life','way',
];

const EMBED_DIM = 128;

function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function getNgrams(text, n) {
  const ngrams = {};
  const t = text.toLowerCase().replace(/[^a-z0-9\s]/g, '');
  for (let i = 0; i <= t.length - n; i++) {
    const ng = t.slice(i, i + n);
    ngrams[ng] = (ngrams[ng] || 0) + 1;
  }
  return ngrams;
}

function getWordFreq(text) {
  const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean);
  const freq = {};
  words.forEach(w => { freq[w] = (freq[w] || 0) + 1; });
  return { freq, words };
}

export function generateEmbedding(text) {
  const vec = new Float32Array(EMBED_DIM).fill(0);
  const { freq, words } = getWordFreq(text);
  const ngrams3 = getNgrams(text, 3);
  const ngrams4 = getNgrams(text, 4);

  // 1. Vocabulary presence features (dims 0-59)
  VOCAB.slice(0, 60).forEach((word, i) => {
    vec[i] = Math.min((freq[word] || 0) / (words.length + 1), 1);
  });

  // 2. Character trigram hashing features (dims 60-89)
  Object.entries(ngrams3).forEach(([ng, count]) => {
    const idx = 60 + (hashCode(ng) % 30);
    vec[idx] += count / (text.length + 1);
  });

  // 3. Character 4-gram hashing features (dims 90-109)
  Object.entries(ngrams4).forEach(([ng, count]) => {
    const idx = 90 + (hashCode(ng) % 20);
    vec[idx] += count / (text.length + 1);
  });

  // 4. Statistical features (dims 110-127)
  vec[110] = Math.min(words.length / 100, 1);                           // length
  vec[111] = Math.min(text.length / 500, 1);                            // char count
  const avgWordLen = words.reduce((s, w) => s + w.length, 0) / (words.length + 1);
  vec[112] = Math.min(avgWordLen / 15, 1);                              // avg word len
  const uniqueWords = new Set(words).size;
  vec[113] = uniqueWords / (words.length + 1);                          // lexical diversity
  vec[114] = (text.match(/[.!?]/g) || []).length / (words.length + 1); // sentence density
  vec[115] = (text.match(/[,;:]/g) || []).length / (words.length + 1); // comma density
  vec[116] = (text.match(/[A-Z]/g) || []).length / (text.length + 1);  // caps ratio
  vec[117] = (text.match(/\d/g) || []).length / (text.length + 1);     // digit ratio

  // Semantic category scores (dims 118-127)
  const techWords = ['data','model','neural','network','transformer','attention','embedding','token','vector','algorithm','machine','learning','deep','artificial','intelligence'];
  const naturalWords = ['nature','forest','river','mountain','ocean','sky','earth','tree','animal','plant','bird','water','sun','moon','star'];
  const actionWords = ['run','jump','move','create','build','make','do','go','come','take','give','find','use','work','play'];
  vec[118] = techWords.filter(w => freq[w]).length / techWords.length;
  vec[119] = naturalWords.filter(w => freq[w]).length / naturalWords.length;
  vec[120] = actionWords.filter(w => freq[w]).length / actionWords.length;

  // Normalize to unit vector
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
  if (norm > 0) vec.forEach((v, i) => (vec[i] = v / norm));

  return Array.from(vec);
}

export function simpleTokenize(text) {
  // BPE-like simple tokenization for visualization
  const words = text.trim().split(/\s+/);
  const tokens = [];

  words.forEach((word, wi) => {
    const clean = word.toLowerCase().replace(/[^a-z0-9']/g, '');
    if (!clean) return;

    // Common subword patterns
    const knownPrefixes = ['un','re','pre','dis','over','under','out','sub','super','inter'];
    const knownSuffixes = ['ing','ed','er','est','ly','tion','ness','ment','able','ible','ful','less','ous'];

    let matched = false;
    for (const prefix of knownPrefixes) {
      if (clean.startsWith(prefix) && clean.length > prefix.length + 2) {
        tokens.push({ text: prefix + '##', type: 'prefix', wordIdx: wi });
        tokens.push({ text: '##' + clean.slice(prefix.length), type: 'stem', wordIdx: wi });
        matched = true;
        break;
      }
    }

    if (!matched) {
      for (const suffix of knownSuffixes) {
        if (clean.endsWith(suffix) && clean.length > suffix.length + 2) {
          tokens.push({ text: clean.slice(0, -suffix.length), type: 'stem', wordIdx: wi });
          tokens.push({ text: '##' + suffix, type: 'suffix', wordIdx: wi });
          matched = true;
          break;
        }
      }
    }

    if (!matched) {
      tokens.push({ text: clean, type: 'word', wordIdx: wi });
    }

    // Add punctuation as separate token
    const punct = word.replace(/[a-z0-9']/gi, '');
    if (punct) tokens.push({ text: punct, type: 'punct', wordIdx: wi });
  });

  return tokens;
}

export function generateAttentionMatrix(tokens, numHeads = 4) {
  // Generate realistic-looking attention patterns per head
  const n = Math.min(tokens.length, 20);
  const heads = [];

  for (let h = 0; h < numHeads; h++) {
    const matrix = [];
    for (let i = 0; i < n; i++) {
      const row = [];
      for (let j = 0; j < n; j++) {
        let score = 0;

        // Head 0: local attention (nearby tokens)
        if (h === 0) score = Math.exp(-Math.abs(i - j) * 0.5);
        // Head 1: positional bias (attend to beginning)
        else if (h === 1) score = Math.exp(-j * 0.3) + (i === j ? 0.5 : 0);
        // Head 2: syntactic (attend to same word type)
        else if (h === 2) {
          score = tokens[i]?.type === tokens[j]?.type ? 0.8 : 0.1;
          score += i === j ? 0.5 : 0;
        }
        // Head 3: diagonal + random semantic links
        else {
          score = i === j ? 1 : Math.random() * 0.3;
          if (Math.abs(i - j) === 1) score += 0.4;
        }

        row.push(score);
      }
      // Softmax
      const maxS = Math.max(...row);
      const exp = row.map(s => Math.exp(s - maxS));
      const sum = exp.reduce((a, b) => a + b, 0);
      matrix.push(exp.map(e => e / sum));
    }
    heads.push(matrix);
  }

  return heads;
}

export function sampleNextToken(logits, temperature = 1.0, topK = 40, topP = 0.9) {
  // Apply temperature
  const scaled = logits.map(l => l / Math.max(temperature, 0.01));

  // Softmax
  const maxL = Math.max(...scaled);
  const exp = scaled.map(l => Math.exp(l - maxL));
  const sumExp = exp.reduce((a, b) => a + b, 0);
  let probs = exp.map(e => e / sumExp);

  // Top-K filtering
  const indexed = probs.map((p, i) => ({ p, i })).sort((a, b) => b.p - a.p);
  const topKItems = indexed.slice(0, topK);

  // Top-P (nucleus) filtering
  let cumulative = 0;
  const nucleus = [];
  for (const item of topKItems) {
    nucleus.push(item);
    cumulative += item.p;
    if (cumulative >= topP) break;
  }

  // Renormalize
  const nucleusSum = nucleus.reduce((s, item) => s + item.p, 0);
  nucleus.forEach(item => (item.p /= nucleusSum));

  // Sample
  const rand = Math.random();
  let cum = 0;
  for (const item of nucleus) {
    cum += item.p;
    if (rand <= cum) return item.i;
  }
  return nucleus[nucleus.length - 1].i;
}
