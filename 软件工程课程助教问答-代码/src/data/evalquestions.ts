// EXPORTS: IEvalQuestion, MOCK_EVAL_QUESTIONS
export interface IEvalQuestion {
  id: string
  question: string
  category: 'in-scope' | 'out-of-scope'
  expectedBehavior: string
  chapter?: string
}

export const MOCK_EVAL_QUESTIONS: IEvalQuestion[] = [
  // ===== 知识库内题目（12道，覆盖各章节） =====
  {
    id: 'q1',
    question: '什么是软件危机？软件危机产生的原因是什么？',
    category: 'in-scope',
    expectedBehavior: '正确回答软件危机的定义及产生原因，引用第1章内容',
    chapter: '第1章 软件工程概述'
  },
  {
    id: 'q2',
    question: '请简述瀑布模型的特点和优缺点。',
    category: 'in-scope',
    expectedBehavior: '正确描述瀑布模型特点、优点和缺点，引用第2章内容',
    chapter: '第2章 软件过程模型'
  },
  {
    id: 'q3',
    question: '可行性研究包括哪几个方面？',
    category: 'in-scope',
    expectedBehavior: '正确列出技术可行性、经济可行性、操作可行性等，引用第3章内容',
    chapter: '第3章 可行性研究'
  },
  {
    id: 'q4',
    question: '需求分析的主要任务是什么？有哪些常用的需求获取方法？',
    category: 'in-scope',
    expectedBehavior: '正确说明需求分析任务和获取方法，引用第4章内容',
    chapter: '第4章 需求分析'
  },
  {
    id: 'q5',
    question: '什么是结构化设计？请说明内聚和耦合的概念。',
    category: 'in-scope',
    expectedBehavior: '正确解释结构化设计、内聚和耦合，引用第5章内容',
    chapter: '第5章 结构化设计'
  },
  {
    id: 'q6',
    question: 'UML中有哪些常用的图？请列举至少5种。',
    category: 'in-scope',
    expectedBehavior: '正确列举UML常用图（用例图、类图、序列图等），引用第6章内容',
    chapter: '第6章 面向对象方法与UML'
  },
  {
    id: 'q7',
    question: '面向对象分析的核心步骤有哪些？',
    category: 'in-scope',
    expectedBehavior: '正确描述OOA步骤，引用第7章内容',
    chapter: '第7章 面向对象分析'
  },
  {
    id: 'q8',
    question: '什么是黑盒测试和白盒测试？它们有什么区别？',
    category: 'in-scope',
    expectedBehavior: '正确解释黑盒/白盒测试及区别，引用第9章内容',
    chapter: '第9章 软件测试与维护'
  },
  {
    id: 'q9',
    question: '软件测试的生命周期分为哪几个阶段？',
    category: 'in-scope',
    expectedBehavior: '正确描述测试各阶段（单元/集成/系统/验收），引用第9章内容',
    chapter: '第9章 软件测试与维护'
  },
  {
    id: 'q10',
    question: '什么是COCOMO模型？它用于什么场景？',
    category: 'in-scope',
    expectedBehavior: '正确解释COCOMO模型及用途（成本估算），引用第10章内容',
    chapter: '第10章 软件工程管理'
  },
  {
    id: 'q11',
    question: 'CMM分为哪几个等级？每个等级的特点是什么？',
    category: 'in-scope',
    expectedBehavior: '正确列出CMM五级及特点，引用第10章内容',
    chapter: '第10章 软件工程管理'
  },
  {
    id: 'q12',
    question: '什么是软件配置管理？它包括哪些活动？',
    category: 'in-scope',
    expectedBehavior: '正确解释SCM及主要活动，引用第10章内容',
    chapter: '第10章 软件工程管理'
  },

  // ===== 超范围干扰题（12道） =====
  {
    id: 'o1',
    question: '今天北京的天气怎么样？',
    category: 'out-of-scope',
    expectedBehavior: '明确拒答，说明问题超出教材范围'
  },
  {
    id: 'o2',
    question: 'Python中的装饰器是什么？请举例说明。',
    category: 'out-of-scope',
    expectedBehavior: '明确拒答，Python语法不在教材范围内'
  },
  {
    id: 'o3',
    question: '最近有什么新的AI技术进展吗？',
    category: 'out-of-scope',
    expectedBehavior: '明确拒答，网络新闻/技术动态不在教材内'
  },
  {
    id: 'o4',
    question: '请推荐几本学习Java的好书。',
    category: 'out-of-scope',
    expectedBehavior: '明确拒答，推荐书籍超出教材范围'
  },
  {
    id: 'o5',
    question: 'React和Vue哪个框架更好用？',
    category: 'out-of-scope',
    expectedBehavior: '明确拒答，前端框架比较不在教材内'
  },
  {
    id: 'o6',
    question: '如何用JavaScript实现深拷贝？',
    category: 'out-of-scope',
    expectedBehavior: '明确拒答，JS编程细节不在教材内'
  },
  {
    id: 'o7',
    question: '2024年软件工程就业形势如何？',
    category: 'out-of-scope',
    expectedBehavior: '明确拒答，就业形势分析不在教材内'
  },
  {
    id: 'o8',
    question: '请解释一下区块链的工作原理。',
    category: 'out-of-scope',
    expectedBehavior: '明确拒答，区块链技术不在教材内'
  },
  {
    id: 'o9',
    question: 'MySQL数据库如何进行性能优化？',
    category: 'out-of-scope',
    expectedBehavior: '明确拒答，数据库优化不在教材内'
  },
  {
    id: 'o10',
    question: '写一个快速排序的C语言实现。',
    category: 'out-of-scope',
    expectedBehavior: '明确拒答，算法代码实现不在教材内'
  },
  {
    id: 'o11',
    question: 'Docker和Kubernetes有什么区别？',
    category: 'out-of-scope',
    expectedBehavior: '明确拒答，容器技术不在教材内'
  },
  {
    id: 'o12',
    question: '介绍一下敏捷开发中的Scrum框架。',
    category: 'out-of-scope',
    expectedBehavior: '明确拒答，Scrum具体框架不在本教材详细范围内'
  }
]