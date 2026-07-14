// ─── Comprehensive Knowledge Base ────────────────────────────────────────────
// Every technical concept in the app has a detailed tooltip entry explaining:
//   - What it is
//   - Why THIS approach vs alternatives
//   - Alternative names used in the field
//   - Mathematical background
//   - Practical implications

export const KNOWLEDGE = {

  // ── Embedding Model ────────────────────────────────────────────────────────
  embeddingModel: {
    title: '🧠 Embedding Model',
    color: '#8b5cf6',
    sections: [
      {
        heading: 'What is it?',
        text: 'An embedding model converts discrete tokens (words/subwords) into dense, continuous real-valued vectors in a high-dimensional space. Semantically similar items cluster together.',
      },
      {
        heading: 'Why this approach?',
        text: 'We use a mathematical embedding (n-gram hashing + vocabulary features) instead of a downloaded model for instant, offline operation — no 23MB+ download needed.',
      },
      {
        heading: 'Popular alternatives',
        items: [
          'all-MiniLM-L6-v2 (23MB, SBERT) — best quality/size ratio',
          'text-embedding-ada-002 (OpenAI API) — best quality, paid',
          'GloVe / Word2Vec — word-level, older approach',
          'FastText — subword-aware, language-agnostic',
          'BERT/RoBERTa CLS embeddings — contextualized',
          'E5, BGE, Instructor — modern retrieval-tuned',
        ],
      },
      {
        heading: 'Our model (128-dim)',
        text: 'Uses character trigrams, vocabulary presence, and statistical signals. Captures topical similarity but not fine-grained semantics.',
      },
    ],
  },

  // ── Vector Dimensions ──────────────────────────────────────────────────────
  embeddingDim: {
    title: '📐 Embedding Dimensions',
    color: '#a78bfa',
    sections: [
      {
        heading: 'What is it?',
        text: 'The number of floating-point values in each embedding vector. Our app uses 128-dim; production models use 768–3072.',
      },
      {
        heading: 'Tradeoffs',
        items: [
          '64-128 dim → Fast, small memory, less expressive',
          '256-512 dim → Good balance for most tasks',
          '768 dim → BERT-base standard',
          '1536 dim → OpenAI ada-002',
          '3072 dim → Large models (GPT-4 class)',
        ],
      },
      {
        heading: 'Also called',
        text: 'd_model, hidden_size, embedding_size, latent_dim, representation size',
      },
    ],
  },

  // ── Vector Database ─────────────────────────────────────────────────────────
  vectorDB: {
    title: '🗄️ Vector Database',
    color: '#00f5ff',
    sections: [
      {
        heading: 'What is it?',
        text: 'A specialized database that stores embedding vectors and supports Approximate Nearest Neighbor (ANN) search — finding the most semantically similar items to a query.',
      },
      {
        heading: 'Our implementation',
        text: 'In-memory exact cosine similarity search. O(n) per query. Perfect for <10K vectors in the browser.',
      },
      {
        heading: 'Production alternatives',
        items: [
          'Pinecone — managed cloud, most popular',
          'Weaviate — open-source, GraphQL API',
          'Qdrant — Rust-based, high performance',
          'Milvus — distributed, Alibaba-backed',
          'ChromaDB — Python-first, local-friendly',
          'FAISS (Meta) — library, not a DB, lightning fast',
          'pgvector — PostgreSQL extension',
          'Vespa — full-featured search + vectors',
        ],
      },
      {
        heading: 'ANN algorithms',
        text: 'HNSW (Hierarchical Navigable Small World), IVF (Inverted File Index), PQ (Product Quantization), LSH (Locality-Sensitive Hashing)',
      },
    ],
  },

  // ── Cosine Similarity ──────────────────────────────────────────────────────
  cosineSimilarity: {
    title: '📐 Cosine Similarity',
    color: '#34d399',
    sections: [
      {
        heading: 'Formula',
        text: 'cos(θ) = (A · B) / (‖A‖ × ‖B‖)\n\nMeasures the angle between two vectors. Range: -1 (opposite) to +1 (identical).',
      },
      {
        heading: 'Why cosine vs alternatives?',
        text: 'Cosine is magnitude-invariant — a long text and short text about the same topic score high. Euclidean distance fails when vectors have different lengths.',
      },
      {
        heading: 'Alternatives',
        items: [
          'L2 (Euclidean) distance — sensitive to magnitude',
          'Dot product — fast but biased toward long vectors',
          'Manhattan (L1) distance — robust to outliers',
          'Pearson correlation — mean-centered cosine',
          'Hamming distance — for binary/sparse vectors',
          'BM25 — keyword-based relevance score',
        ],
      },
    ],
  },

  // ── Tokenization ───────────────────────────────────────────────────────────
  tokenization: {
    title: '✂️ Tokenization',
    color: '#00f5ff',
    sections: [
      {
        heading: 'What is it?',
        text: 'Splitting raw text into smaller units (tokens) that the model can process. Tokens can be words, subwords, characters, or bytes.',
      },
      {
        heading: 'Our approach',
        text: 'Rule-based subword splitting using common prefix/suffix patterns (BPE-inspired). Identifies prefixes like "un-", "re-" and suffixes like "-ing", "-tion".',
      },
      {
        heading: 'Production algorithms',
        items: [
          'BPE (Byte-Pair Encoding) — GPT-2/GPT-4, Llama. Merges frequent byte pairs iteratively.',
          'WordPiece — BERT. Maximizes language model likelihood.',
          'SentencePiece — language-agnostic, works on raw text.',
          'Unigram LM — probabilistic token selection.',
          'Character-level — simple but very long sequences.',
          'Byte-level BPE — handles any language/emoji (GPT-4).',
        ],
      },
      {
        heading: 'Token types shown',
        items: [
          '🟣 word — standalone whole word',
          '🔵 prefix — beginning subword (e.g. "un##")',
          '🟢 stem — root after prefix/suffix removed',
          '🔴 suffix — ending subword (e.g. "##ing")',
          '🟡 punct — punctuation token',
        ],
      },
    ],
  },

  // ── Temperature ─────────────────────────────────────────────────────────────
  temperature: {
    title: '🌡️ Temperature',
    color: '#f472b6',
    sections: [
      {
        heading: 'Formula',
        text: 'P(token) = softmax(logits / T)\n\nDivides raw logits before softmax. Controls the "sharpness" of the probability distribution.',
      },
      {
        heading: 'Effect on sampling',
        items: [
          'T → 0: Argmax (greedy) — always picks highest-prob token',
          'T = 0.3: Sharp, very predictable, focused',
          'T = 0.8: Balanced — good for most tasks',
          'T = 1.0: Unmodified model distribution',
          'T = 1.5: Creative, more varied, risk of nonsense',
          'T → ∞: Uniform random — pure noise',
        ],
      },
      {
        heading: 'Why use it?',
        text: 'Same model, different temperatures → very different outputs. Creative writing: T=1.2+. Factual QA: T=0.2-0.5. Code generation: T=0.1-0.4.',
      },
      {
        heading: 'Alternative names',
        text: 'Inverse temperature (β = 1/T in physics), softmax temperature, sampling temperature, diversity control',
      },
    ],
  },

  // ── Top-K ──────────────────────────────────────────────────────────────────
  topK: {
    title: '🔝 Top-K Sampling',
    color: '#8b5cf6',
    sections: [
      {
        heading: 'What is it?',
        text: 'Keep only the K most probable tokens, zero out all others, then renormalize and sample. Prevents low-probability "tail" tokens from being selected.',
      },
      {
        heading: 'Effect of K value',
        items: [
          'K = 1: Greedy decoding — always most likely token',
          'K = 10: Very focused, conservative',
          'K = 40: GPT-2 default — good general balance',
          'K = 100: More diverse, some randomness',
          'K = vocab_size: Effectively disabled',
        ],
      },
      {
        heading: 'Problem with fixed K',
        text: 'If the model is very confident, K=40 might include many junk tokens. If uncertain, K=40 might be too restrictive. Top-P solves this adaptively.',
      },
      {
        heading: 'Alternative names',
        text: 'Top-K truncation, K-sampling, k-best filtering',
      },
    ],
  },

  // ── Top-P / Nucleus Sampling ───────────────────────────────────────────────
  topP: {
    title: '🎯 Top-P (Nucleus) Sampling',
    color: '#00f5ff',
    sections: [
      {
        heading: 'What is it?',
        text: 'Find the smallest set of top tokens whose cumulative probability ≥ P. Sample from only that "nucleus". The nucleus size adapts to model confidence.',
      },
      {
        heading: 'Why better than Top-K?',
        text: 'When model is confident, nucleus = 3 tokens. When uncertain, nucleus = 500 tokens. Dynamically adjusts to the situation. Introduced by Holtzman et al. 2020.',
      },
      {
        heading: 'Effect of P value',
        items: [
          'P = 0.5: Very conservative, top 50% probability mass',
          'P = 0.9: GPT default — good balance',
          'P = 0.95: Slightly more diverse',
          'P = 1.0: No filtering — use all tokens',
        ],
      },
      {
        heading: 'Also called',
        text: 'Nucleus sampling, top-p filtering, cumulative probability cutoff',
      },
      {
        heading: 'Paper',
        text: '"The Curious Case of Neural Text Degeneration" — Holtzman et al., 2020',
      },
    ],
  },

  // ── Repetition Penalty ─────────────────────────────────────────────────────
  repetitionPenalty: {
    title: '🔁 Repetition Penalty',
    color: '#34d399',
    sections: [
      {
        heading: 'What is it?',
        text: 'Divide the logit of any token that already appeared in the context by the penalty factor. Makes the model less likely to repeat itself.',
      },
      {
        heading: 'Formula',
        text: 'logit[t] = logit[t] / penalty   (if t ∈ already generated tokens)\nlogit[t] = logit[t]              (otherwise)',
      },
      {
        heading: 'Effect of penalty value',
        items: [
          '1.0: No penalty (disabled)',
          '1.1: Slight nudge away from repetition',
          '1.3: Moderate — good for dialogue',
          '1.5: Strong — may hurt coherence',
          '2.0+: Extreme — will force unusual words',
        ],
      },
      {
        heading: 'Alternatives',
        items: [
          'Frequency penalty (OpenAI) — penalizes by count',
          'Presence penalty (OpenAI) — penalizes by presence (binary)',
          'N-gram blocking — hard-block repeated n-grams',
          'Coverage penalty (beam search) — encourages coverage',
        ],
      },
    ],
  },

  // ── Attention Mechanism ─────────────────────────────────────────────────────
  attention: {
    title: '👁️ Self-Attention Mechanism',
    color: '#8b5cf6',
    sections: [
      {
        heading: 'Core formula',
        text: 'Attention(Q, K, V) = softmax(QKᵀ / √dₖ) × V\n\nEach position attends to all other positions, weighting their Values by similarity of their Queries and Keys.',
      },
      {
        heading: 'Q, K, V explained',
        items: [
          'Q (Query) — "What am I looking for?"',
          'K (Key) — "What do I offer to others?"',
          'V (Value) — "What information do I carry?"',
          'Score = Q·Kᵀ — how much does Q match K?',
          '÷ √dₖ — scale to prevent vanishing gradients',
          'softmax — normalize to probability distribution',
          '× V — weighted sum of values',
        ],
      },
      {
        heading: 'Complexity',
        text: 'O(n²·d) — quadratic in sequence length. Long sequences are expensive. KV-cache speeds up inference by reusing past K,V.',
      },
      {
        heading: 'Efficient alternatives',
        items: [
          'Flash Attention — IO-aware, memory-efficient exact attention',
          'Linear Attention — O(n) approximation',
          'Sparse Attention — attend to only some positions',
          'Sliding Window (Mistral) — local attention window',
          'Ring Attention — distributed long-context',
          'Mamba (SSM) — replaces attention entirely',
        ],
      },
    ],
  },

  // ── Multi-Head Attention ───────────────────────────────────────────────────
  numHeads: {
    title: '👁️ Multi-Head Attention (Heads)',
    color: '#fbbf24',
    sections: [
      {
        heading: 'What is it?',
        text: 'Run H parallel attention heads with different learned Q,K,V projections. Each head specializes in different relationship patterns. Concatenate and project at the end.',
      },
      {
        heading: 'Head count by model',
        items: [
          'GPT-2 small: 12 heads, 64-dim each',
          'BERT-base: 12 heads',
          'GPT-3: 96 heads',
          'GPT-4 (rumored): 128+ heads',
          'Llama 2-7B: 32 heads',
          'Llama 2-70B: 64 heads',
        ],
      },
      {
        heading: 'What heads learn',
        items: [
          'Head 1: Local syntactic relationships',
          'Head 2: Coreference (he/she → person)',
          'Head 3: Subject-verb agreement',
          'Head 4: Long-range dependencies',
          'Head N: Often interpretable patterns!',
        ],
      },
      {
        heading: 'Formula',
        text: 'MultiHead(Q,K,V) = Concat(head₁,...,headₕ)Wᴼ\nheadᵢ = Attention(QWᵢQ, KWᵢK, VWᵢV)',
      },
      {
        heading: 'Variants',
        items: [
          'MHA (Multi-Head) — standard',
          'MQA (Multi-Query) — share K,V across heads (faster)',
          'GQA (Grouped-Query) — Llama2, balance of MHA/MQA',
        ],
      },
    ],
  },

  // ── Positional Encoding ─────────────────────────────────────────────────────
  positionalEncoding: {
    title: '📍 Positional Encoding',
    color: '#fb923c',
    sections: [
      {
        heading: 'Why needed?',
        text: 'Attention is permutation-invariant — shuffling tokens gives same output. Positional encoding injects position information.',
      },
      {
        heading: 'Sinusoidal (original)',
        text: 'PE(pos, 2i) = sin(pos / 10000^(2i/d))\nPE(pos, 2i+1) = cos(pos / 10000^(2i/d))\n\nUnique for each position, generalizes to unseen lengths.',
      },
      {
        heading: 'Modern alternatives',
        items: [
          'Learned absolute (GPT-2) — trainable embeddings per position',
          'RoPE (Rotary) — Llama/GPT-NeoX, encodes relative position via rotation',
          'ALiBi — adds linear bias to attention scores',
          'Relative position — Shaw et al., T5',
          'NoPE — no positional encoding (some SSM models)',
        ],
      },
    ],
  },

  // ── Feed-Forward Network ────────────────────────────────────────────────────
  ffn: {
    title: '🧠 Feed-Forward Network (FFN)',
    color: '#f472b6',
    sections: [
      {
        heading: 'Architecture',
        text: 'FFN(x) = activation(xW₁ + b₁)W₂ + b₂\n\nTwo linear layers with nonlinearity. Applied independently to each position.',
      },
      {
        heading: 'Expansion ratio',
        text: 'W₁ projects from d_model to 4×d_model (typically). This 4× expansion creates the "memory" of the transformer.',
      },
      {
        heading: 'Activations used',
        items: [
          'ReLU — original transformer, simple max(0,x)',
          'GELU — GPT-2/BERT, smooth, better in practice',
          'SiLU/Swish — Llama, x·sigmoid(x)',
          'GLU variants — SwiGLU (Llama2), GeGLU',
          'ReGLU — gated variant of ReLU',
        ],
      },
      {
        heading: 'FFN as memory',
        text: 'Research shows FFN layers store factual knowledge. "Knowledge neurons" can be found and edited here (ROME, MEMIT papers).',
      },
    ],
  },

  // ── Layer Normalization ─────────────────────────────────────────────────────
  layerNorm: {
    title: '⚖️ Layer Normalization',
    color: '#fb923c',
    sections: [
      {
        heading: 'Formula',
        text: 'LayerNorm(x) = γ · (x - μ) / (σ + ε) + β\n\nNormalizes across the feature dimension for each token independently.',
      },
      {
        heading: 'Pre-norm vs Post-norm',
        items: [
          'Post-norm (original) — LayerNorm after residual. Harder to train, better quality.',
          'Pre-norm (modern) — LayerNorm before attention/FFN. Easier to train, most models use this.',
        ],
      },
      {
        heading: 'Alternatives',
        items: [
          'Batch Norm — normalizes across batch dimension (not used in LLMs)',
          'RMS Norm — simplified, no mean subtraction (Llama)',
          'Group Norm — normalizes across channel groups',
        ],
      },
    ],
  },

  // ── 3D Projection ─────────────────────────────────────────────────────────
  projection3D: {
    title: '🌐 3D Projection (Dimensionality Reduction)',
    color: '#00f5ff',
    sections: [
      {
        heading: 'Why reduce dimensions?',
        text: 'Embeddings are 128-3072 dimensional — impossible to visualize directly. We project to 3D to see clustering and relationships.',
      },
      {
        heading: 'Our method',
        text: 'Random Projection: 3 orthonormal random axes. Preserves relative distances approximately (Johnson-Lindenstrauss lemma).',
      },
      {
        heading: 'Better alternatives',
        items: [
          'PCA — finds directions of maximum variance. Deterministic.',
          'UMAP — preserves local neighborhood structure. Beautiful clusters.',
          't-SNE — great for visualization, but slow, non-parametric.',
          'ISOMAP — geodesic distances on manifold.',
          'AutoEncoder — learnable compression to any dim.',
        ],
      },
      {
        heading: 'Why UMAP is preferred in research',
        text: 'UMAP preserves both local (cluster) and global (inter-cluster) structure. t-SNE distorts global structure. Both are non-linear.',
      },
    ],
  },

  // ── Softmax ─────────────────────────────────────────────────────────────────
  softmax: {
    title: '📊 Softmax Function',
    color: '#34d399',
    sections: [
      {
        heading: 'Formula',
        text: 'softmax(xᵢ) = e^xᵢ / Σⱼ e^xⱼ\n\nConverts a vector of real numbers to a probability distribution (sums to 1, all positive).',
      },
      {
        heading: 'Numerical stability trick',
        text: 'Subtract max(x) before exponentiating to prevent overflow:\nsoftmax(x) = e^(x-max) / Σ e^(x-max)',
      },
      {
        heading: 'Alternatives',
        items: [
          'Sigmoid — for binary classification',
          'Sparsemax — produces sparse distributions',
          'Gumbel-Softmax — differentiable sampling',
          'Entmax — interpolates between softmax and sparsemax',
        ],
      },
    ],
  },

  // ── BPE / Tokenizer Algorithm ──────────────────────────────────────────────
  bpe: {
    title: '🔤 BPE (Byte-Pair Encoding)',
    color: '#f472b6',
    sections: [
      {
        heading: 'Algorithm',
        text: '1. Start with character vocabulary\n2. Count all adjacent pairs\n3. Merge most frequent pair into new token\n4. Repeat until vocabulary size reached',
      },
      {
        heading: 'Example merges',
        text: '"learning" → l+e+a+r+n+i+n+g → le+ar+n+ing → lear+ning → learning',
      },
      {
        heading: 'Vocabulary sizes',
        items: [
          'GPT-2: 50,257 tokens',
          'GPT-4: ~100,000 tokens (tiktoken cl100k)',
          'Llama 2: 32,000 tokens (SentencePiece)',
          'Llama 3: 128,000 tokens',
          'BERT: 30,522 tokens (WordPiece)',
        ],
      },
      {
        heading: 'Why subwords?',
        text: 'Word-level: can\'t handle new words. Char-level: too long sequences. Subword: best of both — handles morphology, rare words, any language.',
      },
    ],
  },

  // ── Transformer Architecture ───────────────────────────────────────────────
  transformerArch: {
    title: '🔄 Transformer Architecture',
    color: '#8b5cf6',
    sections: [
      {
        heading: 'Origin',
        text: '"Attention Is All You Need" — Vaswani et al., Google Brain, 2017. Replaced RNNs/LSTMs for sequence modeling.',
      },
      {
        heading: 'Three main variants',
        items: [
          'Encoder-only (BERT) — bidirectional, great for classification/retrieval',
          'Decoder-only (GPT) — autoregressive generation, left-to-right',
          'Encoder-Decoder (T5, BART) — seq2seq tasks like translation',
        ],
      },
      {
        heading: 'Decoder block (what we visualize)',
        text: 'Input → Embedding + PosEnc → [Masked Self-Attention → Add&Norm → FFN → Add&Norm] × N → LM Head → Probabilities',
      },
      {
        heading: 'Why transformers beat RNNs',
        items: [
          'Parallelizable training — all positions computed at once',
          'Long-range dependencies — direct O(1) attention path',
          'No vanishing gradient problem across sequence',
          'Scales extremely well with compute',
        ],
      },
    ],
  },

  // ── Greedy vs Sampling ─────────────────────────────────────────────────────
  decodingStrategy: {
    title: '🎲 Decoding Strategy',
    color: '#fbbf24',
    sections: [
      {
        heading: 'Greedy decoding',
        text: 'Always pick argmax(logits). Deterministic, fast, but often repetitive and sub-optimal.',
      },
      {
        heading: 'Sampling',
        text: 'Sample from the full distribution (possibly filtered by Top-K/P). Stochastic. More creative and diverse.',
      },
      {
        heading: 'Beam search',
        text: 'Keep top-B candidate sequences at each step. Better than greedy for translation, but can be generic for creative tasks.',
      },
      {
        heading: 'Other strategies',
        items: [
          'Contrastive Search — balance fluency vs diversity',
          'Typical Sampling — sample from the "typical" distribution',
          'Mirostat — adaptive temperature to target entropy',
          'Speculative Decoding — draft model + verification for speed',
        ],
      },
    ],
  },

  // ── Residual Connection ────────────────────────────────────────────────────
  residual: {
    title: '➕ Residual (Skip) Connection',
    color: '#fb923c',
    sections: [
      {
        heading: 'Formula',
        text: 'output = LayerNorm(x + Sublayer(x))\n\nThe input x is added to the sublayer output. Creates a "highway" for gradients.',
      },
      {
        heading: 'Why critical?',
        text: 'Without residuals, training 12+ layer networks is nearly impossible due to vanishing gradients. ResNet (2015) proved this for vision; Transformer adopted it.',
      },
      {
        heading: 'Effect',
        text: 'Allows very deep networks (100+ layers). Each layer only needs to learn a "residual" correction, not a full transformation.',
      },
    ],
  },

  // ── LM Head / Output Layer ─────────────────────────────────────────────────
  lmHead: {
    title: '🎲 Language Model Head',
    color: '#fbbf24',
    sections: [
      {
        heading: 'What is it?',
        text: 'A linear layer projecting from d_model to vocabulary size. Produces unnormalized logits (one per token).',
      },
      {
        heading: 'Weight tying',
        text: 'Most models tie the LM head weights with the input embedding matrix. Reduces parameters significantly and improves performance.',
      },
      {
        heading: 'After logits',
        text: 'Logits → Temperature scaling → Top-K/P filtering → Softmax → Probability distribution → Sample one token → Append → Repeat',
      },
    ],
  },

  // ── Chunk / Chunk Size ────────────────────────────────────────────────────
  chunking: {
    title: '📦 Text Chunking',
    color: '#6ee7b7',
    sections: [
      {
        heading: 'What is it?',
        text: 'Splitting long documents into smaller pieces (chunks) that fit within a model\'s context window, then embedding each chunk separately.',
      },
      {
        heading: 'Alternative names',
        text: 'Text splitting, document segmentation, passage chunking, document partitioning',
      },
      {
        heading: 'Chunking strategies',
        items: [
          'Fixed size — simple, e.g. 256/512 chars',
          'Sentence-based — split at sentence boundaries',
          'Paragraph-based — preserve semantic units',
          'Semantic chunking — split when topic changes (embedding-based)',
          'Sliding window — overlapping chunks for better recall',
          'Recursive character splitting — LangChain default',
        ],
      },
      {
        heading: 'Overlap',
        text: 'Add 10-20% overlap between chunks to avoid losing context at boundaries. Critical for retrieval quality.',
      },
    ],
  },

  // ── RAG ───────────────────────────────────────────────────────────────────
  rag: {
    title: '🔍 RAG (Retrieval-Augmented Generation)',
    color: '#f472b6',
    sections: [
      {
        heading: 'What is it?',
        text: 'Combine vector search (retrieve relevant chunks) with LLM generation. Reduces hallucinations, allows using private data without fine-tuning.',
      },
      {
        heading: 'Flow',
        text: 'Query → Embed query → Vector search top-K chunks → Inject into prompt → LLM generates answer grounded in retrieved context',
      },
      {
        heading: 'Alternatives',
        items: [
          'Fine-tuning — bakes knowledge into weights, expensive',
          'Long context — fit everything in context (GPT-4 128K)',
          'Tool use — LLM calls search API in real-time',
          'GraphRAG — uses knowledge graphs for structured retrieval',
        ],
      },
    ],
  },

  // ── Attention Head Patterns ────────────────────────────────────────────────
  attentionPatterns: {
    title: '🗺️ Attention Head Patterns',
    color: '#00f5ff',
    sections: [
      {
        heading: 'Local attention (Head 1)',
        text: 'Attends to nearby tokens (n±2). Captures local syntax, adjacent word relationships. exp(-|i-j|) decay.',
      },
      {
        heading: 'Positional bias (Head 2)',
        text: 'Attends to earlier positions. Common in autoregressive models. The BOS token often gets high attention.',
      },
      {
        heading: 'Syntactic (Head 3)',
        text: 'Attends to tokens of the same grammatical type. Captures noun-noun, verb-verb relationships.',
      },
      {
        heading: 'Semantic (Head 4)',
        text: 'Diagonal (self) + random long-range connections. Captures semantic dependencies across the sequence.',
      },
      {
        heading: 'Research findings',
        text: '"Analyzing Multi-Head Self-Attention" (Voita et al. 2019): Only 8-16% of heads are critical. Others can be pruned without quality loss.',
      },
    ],
  },

  // ── Entropy ───────────────────────────────────────────────────────────────
  entropy: {
    title: '📊 Attention Entropy',
    color: '#a78bfa',
    sections: [
      {
        heading: 'Formula',
        text: 'H = -Σ p(i) log p(i)\n\nMeasures the "spread" or uncertainty of the attention distribution.',
      },
      {
        heading: 'Interpretation',
        items: [
          'Low entropy (0) → sharp attention, confident, focused on one token',
          'High entropy (log N) → uniform attention, diffuse, attending to everything equally',
        ],
      },
      {
        heading: 'Practical meaning',
        text: 'Low entropy heads are more interpretable. High entropy heads may be "attending everywhere" — often less critical.',
      },
    ],
  },

  // ── Max Tokens ─────────────────────────────────────────────────────────────
  maxTokens: {
    title: '📏 Max New Tokens',
    color: '#fb923c',
    sections: [
      {
        heading: 'What is it?',
        text: 'Maximum number of tokens to generate before stopping. Each token ≈ 0.75 words in English.',
      },
      {
        heading: 'Stopping criteria',
        items: [
          'Max tokens reached',
          'EOS token generated (</s>, [END])',
          'User-defined stop sequences',
          'Min-length not yet reached (soft constraint)',
        ],
      },
      {
        heading: 'Token counts',
        text: '"Hello world" ≈ 2 tokens\nAverage sentence ≈ 15-25 tokens\nA4 page ≈ 500 tokens\nGPT-4 context: 128,000 tokens (~96,000 words)',
      },
    ],
  },
};

export default KNOWLEDGE;
