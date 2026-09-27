import { useState, useMemo, useCallback } from 'react';
import { capabilityClient, scopedStorage } from '@lark-apaas/client-toolkit-lite';
import { toast } from 'sonner';
import { Play, Loader2, CheckCircle2, XCircle, BarChart3, Target, ShieldCheck, Clock, History } from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MOCK_EVAL_QUESTIONS, type IEvalQuestion } from '@/data/evalquestions';
import { MOCK_SYSTEM_PROMPT } from '@/data/systemprompt';
import { retrieveKnowledge, formatKnowledgeForPrompt } from '@/lib/rag';
import type { SeCourseRagQaAgentOneOutput } from '@shared/plugin-types';

const PLUGIN_ID = 'se_course_rag_qa_agent_1';
const STORAGE_KEY = '__rag_se_eval_results';

interface IEvalItemResult {
  questionId: string;
  actualAnswer: string;
  isCorrect: boolean;
  isRefused: boolean;
}

interface IEvalResult {
  id: string;
  totalQuestions: number;
  inScopeCount: number;
  outOfScopeCount: number;
  inScopeAccuracy: number;
  outOfScopeRefuseRate: number;
  overallScore: number;
  details: IEvalItemResult[];
  createdAt: number;
}

function isRefusalResponse(text: string): boolean {
  const patterns = ['超出了本课程', '超出教材', '不在教材', '无法回答', '没有相关内容', '抱歉', '我只回答'];
  return patterns.some((p) => text.includes(p));
}

function evaluateAnswer(question: IEvalQuestion, answer: string): { isCorrect: boolean; isRefused: boolean } {
  const refused = isRefusalResponse(answer);
  let isCorrect = false;

  if (question.category === 'in-scope') {
    // 知识库内：非拒答 + 包含章节相关关键词 = 正确
    isCorrect = !refused && answer.length > 50;
  } else {
    // 超范围：明确拒答 = 正确
    isCorrect = refused;
  }

  return { isCorrect, isRefused: refused };
}

function loadHistory(): IEvalResult[] {
  try {
    const raw = scopedStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveHistory(history: IEvalResult[]): void {
  try {
    scopedStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch {
    // 忽略
  }
}

export default function EvalPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [currentResult, setCurrentResult] = useState<IEvalResult | null>(null);
  const [detailFilter, setDetailFilter] = useState<'all' | 'in-scope' | 'out-of-scope'>('all');
  const [history, setHistory] = useState<IEvalResult[]>(() => loadHistory());

  const inScopeQuestions = MOCK_EVAL_QUESTIONS.filter((q) => q.category === 'in-scope');
  const outOfScopeQuestions = MOCK_EVAL_QUESTIONS.filter((q) => q.category === 'out-of-scope');

  const filteredDetails = useMemo(() => {
    if (!currentResult) return [];
    return currentResult.details.filter((d) => {
      const q = MOCK_EVAL_QUESTIONS.find((q) => q.id === d.questionId);
      if (!q) return false;
      if (detailFilter === 'all') return true;
      return q.category === detailFilter;
    });
  }, [currentResult, detailFilter]);

  const chartOption = useMemo(() => {
    if (!currentResult) return null;
    return {
      tooltip: { trigger: 'item' },
      legend: { bottom: 0, left: 'center', icon: 'circle' },
      series: [
        {
          type: 'pie',
          radius: ['55%', '75%'],
          center: ['50%', '45%'],
          avoidLabelOverlap: false,
          itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
          label: { show: true, position: 'center', fontSize: 24, fontWeight: 'bold', formatter: `${currentResult.overallScore.toFixed(1)}\n分` },
          data: [
            { value: currentResult.overallScore, name: '综合得分', itemStyle: { color: '#0ea5e9' } },
            { value: 100 - currentResult.overallScore, name: '', itemStyle: { color: '#f1f5f9' } },
          ],
        },
      ],
    };
  }, [currentResult]);

  const barChartOption = useMemo(() => {
    if (!currentResult) return null;
    return {
      tooltip: { trigger: 'axis' },
      grid: { left: 40, right: 20, top: 20, bottom: 30 },
      xAxis: {
        type: 'category',
        data: ['知识库内准确率', '超范围拒答率'],
        axisLabel: { fontSize: 12 },
      },
      yAxis: {
        type: 'value',
        max: 100,
        axisLabel: { formatter: '{value}%' },
      },
      series: [
        {
          type: 'bar',
          data: [
            { value: currentResult.inScopeAccuracy, itemStyle: { color: '#10b981', borderRadius: [4, 4, 0, 0] } },
            { value: currentResult.outOfScopeRefuseRate, itemStyle: { color: '#f59e0b', borderRadius: [4, 4, 0, 0] } },
          ],
          barWidth: 40,
          label: { show: true, position: 'top', formatter: '{c}%', fontSize: 12, fontWeight: 'bold' },
        },
      ],
    };
  }, [currentResult]);

  const runEvaluation = useCallback(async () => {
    if (isRunning) return;
    setIsRunning(true);
    setProgress(0);
    setCurrentResult(null);

    const results: IEvalItemResult[] = [];
    const total = MOCK_EVAL_QUESTIONS.length;

    try {
      for (let i = 0; i < total; i++) {
        const q = MOCK_EVAL_QUESTIONS[i];
        setCurrentQuestion(q.question);
        setProgress(Math.round((i / total) * 100));

        // RAG 检索
        const retrieval = retrieveKnowledge(q.question);
        const knowledge = retrieval.isRelevant
          ? formatKnowledgeForPrompt(retrieval.chunks)
          : '未检索到相关内容';

        // 调用插件
        const stream = capabilityClient
          .load(PLUGIN_ID)
          .callStream('textGenerate', {
            user_question: q.question,
            retrieved_knowledge: knowledge,
          });

        let fullAnswer = '';
        for await (const rawChunk of stream) {
          const chunk = rawChunk as unknown as SeCourseRagQaAgentOneOutput;
          if (chunk.content) fullAnswer += chunk.content;
        }

        const evalResult = evaluateAnswer(q, fullAnswer);
        results.push({
          questionId: q.id,
          actualAnswer: fullAnswer.slice(0, 300) + (fullAnswer.length > 300 ? '...' : ''),
          isCorrect: evalResult.isCorrect,
          isRefused: evalResult.isRefused,
        });
      }

      setProgress(100);

      // 计算统计
      const inScopeCorrect = results.filter(
        (r) => MOCK_EVAL_QUESTIONS.find((q) => q.id === r.questionId)?.category === 'in-scope' && r.isCorrect
      ).length;
      const outOfScopeCorrect = results.filter(
        (r) => MOCK_EVAL_QUESTIONS.find((q) => q.id === r.questionId)?.category === 'out-of-scope' && r.isCorrect
      ).length;

      const inScopeAccuracy = inScopeQuestions.length > 0 ? (inScopeCorrect / inScopeQuestions.length) * 100 : 0;
      const outOfScopeRefuseRate = outOfScopeQuestions.length > 0 ? (outOfScopeCorrect / outOfScopeQuestions.length) * 100 : 0;
      const overallScore = (inScopeAccuracy + outOfScopeRefuseRate) / 2;

      const evalResult: IEvalResult = {
        id: `eval_${Date.now()}`,
        totalQuestions: total,
        inScopeCount: inScopeQuestions.length,
        outOfScopeCount: outOfScopeQuestions.length,
        inScopeAccuracy: Math.round(inScopeAccuracy * 10) / 10,
        outOfScopeRefuseRate: Math.round(outOfScopeRefuseRate * 10) / 10,
        overallScore: Math.round(overallScore * 10) / 10,
        details: results,
        createdAt: Date.now(),
      };

      setCurrentResult(evalResult);
      const newHistory = [evalResult, ...history].slice(0, 10);
      setHistory(newHistory);
      saveHistory(newHistory);

      toast.success('评测完成！');
    } catch (error) {
      toast.error('评测执行失败，请重试');
    } finally {
      setIsRunning(false);
      setCurrentQuestion('');
    }
  }, [isRunning, history, inScopeQuestions.length, outOfScopeQuestions.length]);

  const selectHistoryResult = useCallback((id: string) => {
    const found = history.find((h) => h.id === id);
    if (found) setCurrentResult(found);
  }, [history]);

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-6xl mx-auto px-4 md:px-6 py-8 md:py-12 space-y-6">
        {/* 标题 */}
        <div className="text-center mb-2">
          <Badge variant="outline" className="mb-3">
            Evaluation Benchmark
          </Badge>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            智能体评测中心
          </h1>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto">
            预置知识库内题目与超范围干扰题，一键评测智能体的问答准确率与拒答率
          </p>
          <p className="text-[11px] text-muted-foreground mt-3">
            202525350148 | 本作品仅供学习使用，请勿剽窃
          </p>
        </div>

        {/* 题库概览 + 开始评测 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Target className="size-4 text-primary" />
                题库总量
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground tabular-nums">
                {MOCK_EVAL_QUESTIONS.length}
                <span className="text-sm font-normal text-muted-foreground ml-1">道</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                涵盖教材 11 个章节核心知识点
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CheckCircle2 className="size-4 text-success" />
                知识库内题目
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-success tabular-nums">
                {inScopeQuestions.length}
                <span className="text-sm font-normal text-muted-foreground ml-1">道</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                检验回答准确性与引用质量
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <ShieldCheck className="size-4 text-amber-500" />
                超范围干扰题
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-amber-500 tabular-nums">
                {outOfScopeQuestions.length}
                <span className="text-sm font-normal text-muted-foreground ml-1">道</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                检验拒答机制是否生效
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 开始评测按钮 */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 py-2">
          <Button
            size="lg"
            onClick={runEvaluation}
            disabled={isRunning}
            className="gap-2 min-w-[160px]"
          >
            {isRunning ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                评测中 {progress}%
              </>
            ) : (
              <>
                <Play className="size-4" />
                开始评测
              </>
            )}
          </Button>
          {history.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <History className="size-3.5" />
                历史记录：
              </span>
              <Select value={currentResult?.id} onValueChange={selectHistoryResult}>
                <SelectTrigger className="w-40 h-9 text-xs">
                  <SelectValue placeholder="选择历史评测" />
                </SelectTrigger>
                <SelectContent>
                  {history.map((h) => (
                    <SelectItem key={h.id} value={h.id} className="text-xs">
                      {new Date(h.createdAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })} · {h.overallScore.toFixed(1)}分
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* 进度提示 */}
        <AnimatePresence>
          {isRunning && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="py-6">
                  <div className="flex items-center gap-3 mb-3">
                    <Loader2 className="size-5 animate-spin text-primary" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">
                        正在评测：{currentQuestion}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        已完成 {Math.round(progress / (100 / MOCK_EVAL_QUESTIONS.length))} / {MOCK_EVAL_QUESTIONS.length} 题
                      </div>
                    </div>
                  </div>
                  <div className="w-full h-2 bg-primary/10 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-primary rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 评测结果 */}
        <AnimatePresence>
          {currentResult && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="space-y-6"
            >
              {/* 统计卡片 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <BarChart3 className="size-4 text-primary" />
                      综合评分
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex items-center justify-center py-4">
                    <div className="w-full h-40">
                      {chartOption && (
                        <ReactECharts option={chartOption} style={{ height: '100%', width: '100%' }} />
                      )}
                    </div>
                  </CardContent>
                </Card>
                <Card className="md:col-span-2">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      分项指标
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-48">
                      {barChartOption && (
                        <ReactECharts option={barChartOption} style={{ height: '100%', width: '100%' }} />
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* 详细结果表格 */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-lg">逐题详情</CardTitle>
                  <Tabs defaultValue="all" value={detailFilter} onValueChange={(v) => setDetailFilter(v as typeof detailFilter)}>
                    <TabsList className="h-8">
                      <TabsTrigger value="all" className="text-xs h-7 px-3">全部</TabsTrigger>
                      <TabsTrigger value="in-scope" className="text-xs h-7 px-3">知识库内</TabsTrigger>
                      <TabsTrigger value="out-of-scope" className="text-xs h-7 px-3">超范围</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="w-full overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12 whitespace-nowrap">题号</TableHead>
                          <TableHead className="whitespace-nowrap min-w-[200px]">题目</TableHead>
                          <TableHead className="w-24 whitespace-nowrap">类型</TableHead>
                          <TableHead className="whitespace-nowrap min-w-[180px]">预期行为</TableHead>
                          <TableHead className="whitespace-nowrap min-w-[280px]">实际回答</TableHead>
                          <TableHead className="w-20 whitespace-nowrap text-center">判定</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredDetails.map((detail, idx) => {
                          const q = MOCK_EVAL_QUESTIONS.find((qq) => qq.id === detail.questionId);
                          if (!q) return null;
                          return (
                            <TableRow key={detail.questionId}>
                              <TableCell className="font-mono text-xs text-muted-foreground">
                                {idx + 1}
                              </TableCell>
                              <TableCell className="text-sm max-w-[240px]">
                                <span className="block line-clamp-2">{q.question}</span>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="secondary"
                                  className={q.category === 'in-scope' ? 'bg-success/10 text-success border-success/20' : 'bg-amber-50 text-amber-600 border-amber-200'}
                                >
                                  {q.category === 'in-scope' ? '知识库内' : '超范围'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground max-w-[200px]">
                                <span className="block line-clamp-2">{q.expectedBehavior}</span>
                              </TableCell>
                              <TableCell className="text-xs text-foreground max-w-[320px]">
                                <div className="max-h-[80px] overflow-y-auto">
                                  {detail.actualAnswer || '（无回答）'}
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                {detail.isCorrect ? (
                                  <CheckCircle2 className="size-5 text-success mx-auto" />
                                ) : (
                                  <XCircle className="size-5 text-destructive mx-auto" />
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              <div className="text-center text-xs text-muted-foreground">
                <Clock className="size-3 inline mr-1" />
                评测时间：{new Date(currentResult.createdAt).toLocaleString('zh-CN')}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 空态：还没跑过评测 */}
        {!currentResult && !isRunning && (
          <div className="text-center py-12">
            <div className="size-16 mx-auto mb-4 rounded-2xl bg-muted/50 text-muted-foreground flex items-center justify-center">
              <BarChart3 className="size-8" />
            </div>
            <p className="text-sm text-muted-foreground">
              点击「开始评测」运行完整题库测试
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
