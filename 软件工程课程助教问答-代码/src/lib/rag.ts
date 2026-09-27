// EXPORTS: retrieveKnowledge, IRetrievalResult
import { KNOWLEDGE_BASE, type IKnowledgeChunk } from '@/data/knowledge';

export interface IRetrievalResult {
  chunks: IKnowledgeChunk[];
  totalScore: number;
  isRelevant: boolean;
}

/**
 * 简单关键词匹配的 RAG 检索（前端轻量实现）
 * 计算 query 与每个 chunk 的关键词匹配度，返回 top-K 结果
 */
export function retrieveKnowledge(query: string, topK = 3): IRetrievalResult {
  const q = query.trim().toLowerCase();
  if (!q) {
    return { chunks: [], totalScore: 0, isRelevant: false };
  }

  // 中文分词（简化：按 2 字滑动窗口 + 直接包含匹配）
  const scored = KNOWLEDGE_BASE.map((chunk) => {
    let score = 0;

    // 直接包含章节名
    if (q.includes(chunk.chapter.replace(/第\d+章\s*/, ''))) {
      score += 20;
    }

    // 关键词匹配
    for (const kw of chunk.keywords) {
      if (q.includes(kw.toLowerCase())) {
        score += 10;
      }
    }

    // 内容文本包含
    const contentLower = chunk.content.toLowerCase();
    for (const kw of chunk.keywords) {
      if (contentLower.includes(kw.toLowerCase()) && q.includes(kw.toLowerCase())) {
        score += 5;
      }
    }

    // 双字组合匹配
    const bigrams = new Set<string>();
    for (let i = 0; i < q.length - 1; i++) {
      bigrams.add(q.slice(i, i + 2));
    }
    for (const bg of bigrams) {
      if (chunk.content.includes(bg) || chunk.section.includes(bg)) {
        score += 1;
      }
    }

    return { chunk, score };
  });

  scored.sort((a, b) => b.score - a.score);

  const top = scored.filter((s) => s.score > 0).slice(0, topK);
  const totalScore = top.reduce((sum, s) => sum + s.score, 0);

  // 相关度阈值：总分 >= 15 认为相关（至少命中 1-2 个关键词 + 章节名或多个关键词）
  const isRelevant = totalScore >= 15 && top.length > 0;

  return {
    chunks: top.map((t) => t.chunk),
    totalScore,
    isRelevant,
  };
}

/**
 * 将检索结果格式化为传给 AI 的知识文本
 */
export function formatKnowledgeForPrompt(chunks: IKnowledgeChunk[]): string {
  if (chunks.length === 0) {
    return '（未检索到相关教材内容）';
  }
  return chunks
    .map(
      (c, i) => `【片段 ${i + 1} - ${c.chapter} ${c.section}】\n${c.content}`
    )
    .join('\n\n');
}
