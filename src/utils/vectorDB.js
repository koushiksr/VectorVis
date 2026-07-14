// ─── In-Memory Vector Database ──────────────────────────────────────────────
// Stores embeddings with metadata, supports cosine similarity search,
// and provides 3D projection via simple PCA-like reduction.

export class VectorDB {
  constructor() {
    this.vectors = []; // { id, text, embedding, metadata, color, position3d }
    this.nextId = 0;
  }

  // Cosine similarity between two vectors
  cosineSimilarity(a, b) {
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    return dot / (Math.sqrt(normA) * Math.sqrt(normB) + 1e-8);
  }

  // Add a vector entry
  add(text, embedding, metadata = {}) {
    const id = this.nextId++;
    const entry = {
      id,
      text,
      embedding,
      metadata,
      color: this._generateColor(id),
      position3d: null,
    };
    this.vectors.push(entry);
    this._reproject3D();
    return entry;
  }

  // Top-K nearest neighbors
  search(queryEmbedding, topK = 5) {
    return this.vectors
      .map(v => ({
        ...v,
        similarity: this.cosineSimilarity(queryEmbedding, v.embedding),
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);
  }

  // Simple PCA-like projection to 3D using random projection matrix (stable)
  _reproject3D() {
    if (this.vectors.length === 0) return;
    const dim = this.vectors[0].embedding.length;

    // Use seeded random projection axes (3 axes)
    const axes = this._getProjectionAxes(dim, 3);

    this.vectors.forEach(v => {
      const coords = axes.map(axis =>
        v.embedding.reduce((sum, val, i) => sum + val * axis[i], 0)
      );
      v.position3d = { x: coords[0] * 5, y: coords[1] * 5, z: coords[2] * 5 };
    });
  }

  _getProjectionAxes(dim, numAxes) {
    const axes = [];
    for (let a = 0; a < numAxes; a++) {
      const axis = [];
      for (let i = 0; i < dim; i++) {
        // Seeded pseudo-random using sine
        axis.push(Math.sin((a * 1000 + i) * 9301 + 49297) * 0.5);
      }
      // Normalize
      const norm = Math.sqrt(axis.reduce((s, v) => s + v * v, 0));
      axes.push(axis.map(v => v / (norm + 1e-8)));
    }
    return axes;
  }

  _generateColor(id) {
    const hues = [200, 270, 320, 160, 40, 180, 300];
    const hue = hues[id % hues.length];
    return `hsl(${hue}, 80%, 65%)`;
  }

  getAll() {
    return this.vectors;
  }

  clear() {
    this.vectors = [];
    this.nextId = 0;
  }

  get size() {
    return this.vectors.length;
  }
}

export const vectorDB = new VectorDB();
