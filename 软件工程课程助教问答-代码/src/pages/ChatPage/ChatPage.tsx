import { useState, useEffect, useRef, useCallback, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { capabilityClient } from '@lark-apaas/client-toolkit-lite';
import { toast } from 'sonner';
import { Plus, X, Send, Loader2, Sparkles, AlertTriangle, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Menu } from 'lucide-react';
import { retrieveKnowledge, formatKnowledgeForPrompt } from '@/lib/rag';
import { recognizeIntent } from '@/lib/intentRecognizer';
import {
  getSessions,
  createSession,
  deleteSession,
  updateSession,
  type IChatSession,
  type IChatMessage,
} from '@/lib/chatStorage';
import { MOCK_SYSTEM_PROMPT } from '@/data/systemprompt';
import type { SeCourseRagQaAgentOneOutput } from '@shared/plugin-types';

const PLUGIN_ID = 'se_course_rag_qa_agent_1';

const SUGGESTED_QUESTIONS = [
  '什么是软件危机？产生的原因是什么？',
  '请简述瀑布模型的特点和优缺点',
  '什么是黑盒测试和白盒测试？它们有什么区别？',
  'UML中有哪些常用的图？',
  '什么是COCOMO模型？它用于什么场景？',
];

function isRefusalResponse(text: string): boolean {
  const refusalPatterns = [
    '超出了本课程知识库范围',
    '超出教材范围',
    '不在教材范围内',
    '无法回答',
    '没有相关内容',
    '抱歉',
    '不在本课程',
    '我只回答',
  ];
  return refusalPatterns.some((p) => text.includes(p));
}

export default function ChatPage() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<IChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const activeSession = sessions.find((s) => s.id === activeSessionId) ?? null;

  // 初始化加载会话
  useEffect(() => {
    const loaded = getSessions();
    setSessions(loaded);
    if (loaded.length > 0) {
      setActiveSessionId(loaded[0].id);
    } else {
      const s = createSession();
      setSessions([s]);
      setActiveSessionId(s.id);
    }
  }, []);

  // 自动滚动到底部
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeSession?.messages.length, isLoading]);

  const handleNewChat = useCallback(() => {
    const s = createSession();
    setSessions((prev) => [s, ...prev]);
    setActiveSessionId(s.id);
    setMobileSheetOpen(false);
  }, []);

  const handleDeleteSession = useCallback(
    (id: string) => {
      deleteSession(id);
      const remaining = sessions.filter((s) => s.id !== id);
      setSessions(remaining);
      if (activeSessionId === id) {
        if (remaining.length > 0) {
          setActiveSessionId(remaining[0].id);
        } else {
          const s = createSession();
          setSessions([s]);
          setActiveSessionId(s.id);
        }
      }
      toast.success('对话已删除');
      setDeleteConfirmId(null);
    },
    [sessions, activeSessionId]
  );

  const handleSelectSession = useCallback(
    (id: string) => {
      setActiveSessionId(id);
      setMobileSheetOpen(false);
    },
    []
  );

  const handleSendMessage = useCallback(
    async (question: string) => {
      if (!question.trim() || isLoading || !activeSession) return;

      const userMsg: IChatMessage = {
        id: `msg_${Date.now()}_u`,
        role: 'user',
        content: question.trim(),
        timestamp: Date.now(),
      };

      // 先添加用户消息
      const updatedSession: IChatSession = {
        ...activeSession,
        messages: [...activeSession.messages, userMsg],
      };
      updateSession(updatedSession);
      setSessions((prev) =>
        prev.map((s) => (s.id === activeSession.id ? updatedSession : s))
      );
      setInput('');
      setIsLoading(true);

      // RAG 检索
      const retrieval = retrieveKnowledge(question);

      // 意图联想识别
      const suggested = recognizeIntent(question);

      try {
        const abortController = new AbortController();
        abortRef.current = abortController;

        // 构造 prompt：系统提示 + 检索到的知识 + 用户问题
        const prompt = `${MOCK_SYSTEM_PROMPT.fullPrompt}

【检索到的教材内容】
${retrieval.isRelevant ? formatKnowledgeForPrompt(retrieval.chunks) : '未检索到与问题相关的教材内容，请直接拒答。'}

【用户问题】
${question}

请基于上述教材内容回答用户问题。如果检索内容中没有答案或问题超出范围，请使用标准拒答话术回复。`;

        const stream = capabilityClient
          .load(PLUGIN_ID)
          .callStream('textGenerate', { user_question: question, retrieved_knowledge: retrieval.isRelevant ? formatKnowledgeForPrompt(retrieval.chunks) : '未检索到相关内容' });

        const assistantMsg: IChatMessage = {
          id: `msg_${Date.now()}_a`,
          role: 'assistant',
          content: '',
          citations: retrieval.isRelevant
            ? [...new Set(retrieval.chunks.map((c) => c.chapter))]
            : [],
          isRefused: !retrieval.isRelevant,
          suggestedQuestion: suggested ?? undefined,
          timestamp: Date.now(),
        };

        // 添加空的助手消息
        const withAssistant: IChatSession = {
          ...updatedSession,
          messages: [...updatedSession.messages, assistantMsg],
        };
        setSessions((prev) =>
          prev.map((s) => (s.id === activeSession.id ? withAssistant : s))
        );

        let fullContent = '';
        for await (const rawChunk of stream) {
          if (abortController.signal.aborted) break;
          const chunk = rawChunk as unknown as SeCourseRagQaAgentOneOutput;
          if (chunk.content) {
            fullContent += chunk.content;
            // 实时更新消息内容
            setSessions((prev) =>
              prev.map((s) =>
                s.id === activeSession.id
                  ? {
                      ...s,
                      messages: s.messages.map((m) =>
                        m.id === assistantMsg.id
                          ? { ...m, content: fullContent }
                          : m
                      ),
                    }
                  : s
              )
            );
          }
        }

        // 最终判断是否拒答
        const refused = isRefusalResponse(fullContent) || !retrieval.isRelevant;
        const finalSession: IChatSession = {
          ...withAssistant,
          messages: withAssistant.messages.map((m) =>
            m.id === assistantMsg.id
              ? {
                  ...m,
                  content: fullContent,
                  isRefused: refused,
                  citations: refused
                    ? []
                    : [...new Set(retrieval.chunks.map((c) => c.chapter))],
                }
              : m
          ),
        };
        updateSession(finalSession);
        setSessions((prev) =>
          prev.map((s) => (s.id === activeSession.id ? finalSession : s))
        );
      } catch (error) {
        toast.error('智能体服务暂不可用，请稍后重试');
        // 移除空的助手消息
        setSessions((prev) =>
          prev.map((s) =>
            s.id === activeSession.id
              ? { ...s, messages: s.messages.slice(0, -1) }
              : s
          )
        );
      } finally {
        setIsLoading(false);
        abortRef.current = null;
      }
    },
    [activeSession, isLoading]
  );

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      handleSendMessage(input);
    }
  };

  const sessionList = (
    <div className="flex flex-col h-full">
      {/* 侧边栏顶部：Logo + 署名 */}
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center gap-2 mb-1">
          <div className="size-7 shrink-0 rounded-md bg-primary text-primary-foreground flex items-center justify-center">
            <BookOpen className="size-4" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-semibold text-foreground leading-tight truncate">软件工程助教</span>
            <span className="text-[11px] text-muted-foreground leading-tight">《实用软件工程》第3版</span>
          </div>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground leading-relaxed border-t border-border/40 pt-2">
          202525350148<br />
          本作品仅供学习使用，请勿剽窃
        </p>
      </div>
      <div className="p-3 border-b border-border/50">
        <Button onClick={handleNewChat} className="w-full gap-2">
          <Plus className="size-4" />
          新建对话
        </Button>
      </div>
       <ScrollArea className="flex-1">
         <div className="p-2 space-y-1">
           {sessions.length === 0 ? (
             <div className="text-center text-sm text-muted-foreground py-8">
               暂无对话
             </div>
           ) : (
             sessions.map((s) => (
                <div
                  key={s.id}
                  className={`w-full min-w-0 overflow-hidden rounded-md transition-colors grid grid-cols-[1fr_auto] items-center ${s.id === activeSessionId ? 'bg-primary/10' : 'hover:bg-accent/50'}`}
                >
                  <button
                    onClick={() => handleSelectSession(s.id)}
                    className={`min-w-0 w-full overflow-hidden text-left px-3 py-2.5 text-sm ${s.id === activeSessionId ? 'text-primary' : 'text-foreground'}`}
                  >
                    <span className="block overflow-hidden text-ellipsis whitespace-nowrap">{s.title}</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteConfirmId(s.id);
                    }}
                    className="w-8 h-8 mr-1 flex items-center justify-center rounded-md text-[#999] hover:text-destructive hover:bg-destructive/10 transition-colors justify-self-end"
                    aria-label="删除对话"
                    title="删除对话"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
             ))
           )}
         </div>
       </ScrollArea>
     </div>
   );

  const messages = activeSession?.messages ?? [];
  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-1 min-h-0 w-full bg-background">
      {/* 桌面端左侧边栏 */}
      <aside className="hidden md:flex flex-col w-64 shrink-0 border-r border-border/50 bg-muted/30">
        {sessionList}
      </aside>

      {/* 主聊天区 */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 移动端顶栏 */}
        <div className="md:hidden flex items-center justify-between px-4 py-2 border-b border-border/30">
          <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SheetHeader className="px-4 py-3 border-b">
                <SheetTitle className="text-base">对话历史</SheetTitle>
              </SheetHeader>
              {sessionList}
            </SheetContent>
          </Sheet>
          <span className="text-sm font-medium">
            {activeSession?.title ?? '软件工程助教'}
          </span>
          <div className="w-9" />
        </div>

        {/* 消息区 */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 py-6">
            <AnimatePresence>
              {isEmpty ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="text-center py-12 space-y-8"
                >
                  <div className="flex justify-center">
                    <div className="size-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                      <BookOpen className="size-8" />
                    </div>
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-foreground mb-2">
                      软件工程课程智能助教
                    </h1>
                    <p className="text-muted-foreground text-sm max-w-md mx-auto">
                      基于《实用软件工程（第3版）》教材知识库，为你解答软件工程课程相关问题。
                    </p>
                  </div>
                  <div className="space-y-2 max-w-lg mx-auto">
                    <p className="text-xs text-muted-foreground mb-3">
                      💡 试试这些问题：
                    </p>
                    {SUGGESTED_QUESTIONS.map((q, i) => (
                      <motion.button
                        key={q}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.1 + i * 0.08 }}
                        onClick={() => handleSendMessage(q)}
                        className="w-full text-left px-4 py-3 rounded-lg border border-border/50 bg-card hover:border-primary/40 hover:bg-primary/5 transition-colors text-sm text-foreground"
                      >
                        <span className="text-primary mr-2">·</span>
                        {q}
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              ) : (
                <div className="space-y-6">
                  {messages.map((msg) => (
                    <MessageBubble key={msg.id} message={msg} />
                  ))}
                  {isLoading && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-start gap-3"
                    >
                      <div className="size-8 shrink-0 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                        <Sparkles className="size-4" />
                      </div>
                      <div className="rounded-2xl rounded-tl-sm px-4 py-3 bg-card border border-border/50">
                        <Loader2 className="size-4 animate-spin text-muted-foreground" />
                      </div>
                    </motion.div>
                  )}
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* 输入区 */}
        <div className="border-t border-border/30 bg-background/80 backdrop-blur-sm">
          <div className="max-w-3xl mx-auto px-4 py-3">
            <p className="text-[11px] text-muted-foreground text-center mb-2">
              202525350148 | 本作品仅供学习使用，请勿剽窃
            </p>
            <form onSubmit={onSubmit} className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="请输入你的软件工程问题..."
                className="flex-1"
                disabled={isLoading}
              />
              <Button type="submit" disabled={isLoading || !input.trim()}>
                {isLoading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
              </Button>
            </form>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              回答基于教材知识库生成，仅供学习参考。
              <button
                onClick={() => navigate('/prompt')}
                className="text-primary hover:underline ml-1"
              >
                查看系统 Prompt
              </button>
            </p>
          </div>
        </div>

        {/* 删除确认对话框 */}
        <Dialog
          open={deleteConfirmId !== null}
          onOpenChange={(open) => {
            if (!open) setDeleteConfirmId(null);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>确定删除这条对话吗？</DialogTitle>
              <DialogDescription>
                删除后无法恢复，请谨慎操作。
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setDeleteConfirmId(null)}
              >
                取消
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => {
                  if (deleteConfirmId) {
                    handleDeleteSession(deleteConfirmId);
                  }
                }}
              >
                确认删除
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: IChatMessage }) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-start gap-3 justify-end"
      >
        <div className="max-w-[80%] rounded-2xl rounded-tr-sm px-4 py-3 bg-primary text-primary-foreground">
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex items-start gap-3"
    >
      <div className="size-8 shrink-0 rounded-full bg-primary/10 text-primary flex items-center justify-center">
        <Sparkles className="size-4" />
      </div>
      <div className="max-w-[85%] flex flex-col gap-2">
        <div className="rounded-2xl rounded-tl-sm px-4 py-3 bg-card border border-border/50">
          {message.isRefused && (
            <div className="flex items-center gap-1.5 mb-2">
              <AlertTriangle className="size-3.5 text-amber-500" />
              <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-600 bg-amber-50">
                超出范围
              </Badge>
            </div>
          )}
          {message.suggestedQuestion && (
            <div className="mb-3 px-3 py-2 rounded-md bg-primary/8 border border-primary/20 text-primary text-sm flex items-start gap-2">
              <span className="shrink-0">💡</span>
              <span>
                你可能想问的是：<span className="font-medium">{message.suggestedQuestion}</span>
              </span>
            </div>
          )}
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content || '正在思考...'}
            </ReactMarkdown>
          </div>
        </div>
        {message.citations && message.citations.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {message.citations.map((c) => (
              <Badge
                key={c}
                variant="secondary"
                className="text-[10px] font-normal"
              >
                📖 {c}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
