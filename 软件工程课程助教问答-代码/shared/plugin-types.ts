// ---- plugin:se_course_rag_qa_agent_1 ----
// ============================================================
// 插件 se_course_rag_qa_agent_1 (软件工程课程RAG问答智能体) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface SeCourseRagQaAgentOneInput {
  /** 用户提出的软件工程相关问题 */
  user_question: string;
  /** 从RAG知识库检索到的《实用软件工程（第3版）》相关教材内容 */
  retrieved_knowledge: string;
}

/**
 * capabilityClient.load('se_course_rag_qa_agent_1').callStream<SeCourseRagQaAgentOneOutput>('textGenerate', input)
 * 每个 chunk 就是下面这个扁平对象，字段名与 SeCourseRagQaAgentOneOutput 一致，外面没有 data / choices / message 包装：
 *   {"content":"示例文本","response":"示例文本"}
 * 返回值可能是 AsyncIterable<chunk>，也可能是 { output: AsyncIterable<chunk> }，取流前先归一化。
 * 逐段累加：
 *   for await (const chunk of stream) { result += chunk.content ?? ''; }
 */
export interface SeCourseRagQaAgentOneOutput {
  /** [object Object] */
  content: string;
  /** [object Object] */
  response?: string;
}
// ---- end:se_course_rag_qa_agent_1 ----