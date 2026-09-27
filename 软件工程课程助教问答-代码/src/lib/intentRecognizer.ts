// EXPORTS: recognizeIntent
// 意图联想识别：用户输入简略词/缩写时，联想出标准问题

interface IntentRule {
  keywords: string[];
  suggestedQuestion: string;
}

const INTENT_RULES: IntentRule[] = [
  {
    keywords: ['白盒', '黑盒'],
    suggestedQuestion: '黑盒测试和白盒测试分别是什么？',
  },
  {
    keywords: ['瀑布'],
    suggestedQuestion: '瀑布模型的特点和优缺点是什么？',
  },
  {
    keywords: ['敏捷'],
    suggestedQuestion: '敏捷开发的核心思想和特点是什么？',
  },
  {
    keywords: ['风险'],
    suggestedQuestion: '软件风险管理的主要步骤和方法是什么？',
  },
  {
    keywords: ['质量'],
    suggestedQuestion: '软件质量特性包括哪些方面？',
  },
  {
    keywords: ['配置'],
    suggestedQuestion: '软件配置管理的主要内容是什么？',
  },
  {
    keywords: ['估算'],
    suggestedQuestion: '软件估算方法有哪些？',
  },
  {
    keywords: ['维护'],
    suggestedQuestion: '软件维护有哪些类型？',
  },
  {
    keywords: ['UML', '用例', '类图'],
    suggestedQuestion: 'UML中有哪些常用的图？',
  },
  {
    keywords: ['设计模式', '模式'],
    suggestedQuestion: '设计模式有哪些分类？',
  },
  {
    keywords: ['CMM', 'cmm'],
    suggestedQuestion: 'CMM成熟度模型分为哪几个等级？',
  },
  {
    keywords: ['COCOMO', 'cocomo'],
    suggestedQuestion: '什么是COCOMO模型？它用于什么场景？',
  },
  {
    keywords: ['内聚', '耦合'],
    suggestedQuestion: '内聚和耦合分别是什么？它们有什么区别？',
  },
  {
    keywords: ['单元测试', '集成测试'],
    suggestedQuestion: '软件测试分为哪些阶段？',
  },
  {
    keywords: ['数据流'],
    suggestedQuestion: '数据流图的基本元素和画法是什么？',
  },
  {
    keywords: ['可行性'],
    suggestedQuestion: '可行性研究包括哪些方面？',
  },
  {
    keywords: ['软件危机'],
    suggestedQuestion: '什么是软件危机？产生的原因是什么？',
  },
  {
    keywords: ['软件工程'],
    suggestedQuestion: '软件工程的定义是什么？',
  },
  {
    keywords: ['原型'],
    suggestedQuestion: '快速原型模型的特点和适用场景是什么？',
  },
  {
    keywords: ['增量'],
    suggestedQuestion: '增量模型的特点和优缺点是什么？',
  },
  {
    keywords: ['对象', '类', '继承', '多态'],
    suggestedQuestion: '面向对象的基本概念有哪些？',
  },
  {
    keywords: ['等价类', '边界值'],
    suggestedQuestion: '黑盒测试有哪些常用方法？',
  },
  {
    keywords: ['逻辑覆盖', '路径覆盖'],
    suggestedQuestion: '白盒测试的覆盖标准有哪些？',
  },
  {
    keywords: ['人员', '团队'],
    suggestedQuestion: '软件开发人员的组织方式有哪些？',
  },
  {
    keywords: ['文档'],
    suggestedQuestion: '软件文档分为哪几类？',
  },
  {
    keywords: ['安全'],
    suggestedQuestion: '软件安全的主要威胁和防护措施有哪些？',
  },
  {
    keywords: ['项目管理'],
    suggestedQuestion: '软件项目管理的主要内容是什么？',
  },
];

/**
 * 识别用户问题的意图联想
 * - 如果命中联想规则且不是已经完整的标准问法，返回联想后的标准问题
 * - 如果未命中或问题已经比较完整，返回 null
 */
export function recognizeIntent(question: string): string | null {
  const cleaned = question.trim();
  if (!cleaned) return null;

  // 问题太长（超过 20 字）通常已是完整问题，不做联想
  if (cleaned.length > 20) return null;

  let matched: string | null = null;
  let maxHits = 0;

  for (const rule of INTENT_RULES) {
    let hits = 0;
    for (const kw of rule.keywords) {
      if (cleaned.includes(kw)) {
        hits++;
      }
    }
    // 至少命中 1 个关键词，且命中数更多则更新
    if (hits > 0 && hits > maxHits) {
      // 排除用户问题本身就是完整标准问题的情况
      if (rule.suggestedQuestion.includes(cleaned) && cleaned.length >= rule.suggestedQuestion.length - 2) {
        continue;
      }
      maxHits = hits;
      matched = rule.suggestedQuestion;
    }
  }

  return matched;
}
