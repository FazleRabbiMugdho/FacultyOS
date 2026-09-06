/**
 * Chunk raw document text into overlapping segments for pgvector RAG embeddings.
 */
export function chunkText(
  text: string,
  chunkSize: number = 500,
  overlap: number = 100
): string[] {
  if (!text || text.trim().length === 0) return [];

  const words = text.split(/\s+/);
  const chunks: string[] = [];

  let i = 0;
  while (i < words.length) {
    const chunk = words.slice(i, i + chunkSize).join(" ");
    if (chunk.trim().length > 0) {
      chunks.push(chunk.trim());
    }
    i += chunkSize - overlap;
    if (i >= words.length - overlap && i < words.length) {
      // Last small tail
      const tail = words.slice(i).join(" ");
      if (tail.trim().length > 0 && !chunks.includes(tail.trim())) {
        chunks.push(tail.trim());
      }
      break;
    }
  }

  return chunks.length > 0 ? chunks : [text];
}
