import { useState } from 'react';
import { Copy, Check, Shield, BookOpen, FileText, AlertOctagon, Quote, ListOrdered } from 'lucide-react';
import { toast } from 'sonner';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MOCK_SYSTEM_PROMPT } from '@/data/systemprompt';

const SECTION_ICONS: Record<string, typeof Shield> = {
  '角色设定': Shield,
  '知识库范围': BookOpen,
  '回答规则': FileText,
  '拒答规则': AlertOctagon,
  '引用格式要求': Quote,
  '输出格式': ListOrdered,
};

export default function PromptPage() {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(MOCK_SYSTEM_PROMPT.fullPrompt);
      setCopied(true);
      toast.success('已复制到剪贴板');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('复制失败');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-4xl mx-auto px-4 md:px-6 py-8 md:py-12">
        {/* 标题区 */}
        <div className="text-center mb-8 md:mb-12">
          <Badge variant="outline" className="mb-3">
            Prompt Engineering
          </Badge>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            系统 Prompt 设计
          </h1>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto">
            本智能体的 System Prompt 完整设计，包含角色设定、知识库范围、回答规则、拒答机制等核心模块
          </p>
          <p className="text-[11px] text-muted-foreground mt-3">
            202525350148 | 本作品仅供学习使用，请勿剽窃
          </p>
          <div className="flex items-center justify-center gap-4 mt-4 text-xs text-muted-foreground">
            <span>版本：{MOCK_SYSTEM_PROMPT.version}</span>
            <span>·</span>
            <span>更新：{MOCK_SYSTEM_PROMPT.updatedAt}</span>
          </div>
        </div>

        {/* 分段说明 */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg">Prompt 模块解析</CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {MOCK_SYSTEM_PROMPT.sections.map((section, i) => {
                const Icon = SECTION_ICONS[section.title] ?? FileText;
                return (
                  <AccordionItem key={i} value={`item-${i}`}>
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-3">
                        <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <Icon className="size-4" />
                        </div>
                        <div className="text-left">
                          <div className="text-sm font-medium text-foreground">
                            {section.title}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {section.description}
                          </div>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="pl-11 pr-2">
                        <div className="p-3 rounded-md bg-muted/50 border border-border/50 text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                          {section.content}
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </CardContent>
        </Card>

        {/* 完整 Prompt 代码块 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">完整 System Prompt</CardTitle>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              {copied ? (
                <>
                  <Check className="size-4 text-success" />
                  已复制
                </>
              ) : (
                <>
                  <Copy className="size-4" />
                  一键复制
                </>
              )}
            </button>
          </CardHeader>
          <CardContent>
            <pre className="p-4 rounded-lg bg-foreground/[0.02] border border-border/50 text-xs text-foreground overflow-x-auto whitespace-pre-wrap leading-relaxed font-mono">
              {MOCK_SYSTEM_PROMPT.fullPrompt}
            </pre>
          </CardContent>
        </Card>

        {/* 设计说明 */}
        <div className="mt-8 text-xs text-muted-foreground text-center space-y-1">
          <p>💡 Prompt 工程核心要点：明确角色边界 + 严格知识库范围 + 标准化拒答话术 + 引用溯源要求</p>
          <p>本智能体所有回答均基于《实用软件工程（第3版）》教材知识库，不联网、不编造</p>
        </div>
      </main>
    </div>
  );
}
