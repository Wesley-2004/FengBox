import { NextResponse } from 'next/server';

// Vercel 免费版默认超时 10 秒，Pro 版 60 秒
// 我们一次调用完成所有事情，避免超时
export const maxDuration = 60; // Pro 用户会用到，免费用户最多 10 秒

export async function POST(request: Request) {
  try {
    const { resume, targetJob } = await request.json();

    if (!resume || resume.trim().length < 50) {
      return NextResponse.json(
        { error: '请提供简历内容（至少 50 字）' },
        { status: 400 }
      );
    }

    // 一次调用完成所有分析（节省时间）
    const fullPrompt = buildPrompt(resume, targetJob || '');

    const aiResponse = await callDeepSeek([
      {
        role: 'system',
        content: '你是一个资深的 HR 简历分析专家。请严格按照用户要求的 JSON 格式输出，不要添加任何解释或 markdown 标记。',
      },
      {
        role: 'user',
        content: fullPrompt,
      },
    ]);

    // 从 AI 响应中提取 JSON
    let result;
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('AI 响应中没有 JSON');
      }
    } catch (e) {
      console.error('JSON 解析失败:', aiResponse);
      // 返回一个降级的默认结果
      result = getDefaultResult();
    }

    return NextResponse.json({
      success: true,
      parsed: result.parsed || {},
      scores: result.scores || getDefaultScores(),
      suggestions: result.suggestions || [],
    });
  } catch (error) {
    console.error('优化出错:', error);
    return NextResponse.json(
      { error: '简历优化服务出错，请稍后重试' },
      { status: 500 }
    );
  }
}

function buildPrompt(resume: string, targetJob: string): string {
  const jobText = targetJob ? `\n目标岗位：${targetJob}` : '';

  return `请分析以下简历，并返回严格的 JSON 格式结果（不要任何解释，只返回 JSON）：

【简历内容】
${resume}${jobText}

【输出格式】
{
  "parsed": {
    "basicInfo": {
      "name": "候选人姓名",
      "experience": "工作年限（如 3 年）",
      "currentTitle": "当前职位",
      "industry": "所在行业"
    },
    "summary": "整体评价（2-3句话）"
  },
  "scores": {
    "scores": {
      "content": 数字0-100,
      "ats": 数字0-100,
      "hrReadability": 数字0-100,
      "keywordMatch": 数字0-100
    },
    "overall": 综合分数0-100,
    "strengths": ["优点1", "优点2"],
    "weaknesses": ["缺点1", "缺点2"]
  },
  "suggestions": [
    {
      "priority": "high/medium/low",
      "category": "内容/格式/关键词/成果/技能",
      "issue": "原文中需要改进的具体句子",
      "suggestion": "具体改进建议",
      "reason": "为什么这样改会更好"
    }
  ]
}

【评分标准】
- content（内容完整性）：个人信息、教育、经验、技能是否齐全，描述是否详细
- ats（ATS 友好度）：格式清晰、避免表格图片、关键词突出
- hrReadability（HR 阅读体验）：动词开头、量化数据、突出成果
- keywordMatch（关键词匹配度）：与目标岗位关键词的重合度

【要求】
1. suggestions 必须返回 6-8 条
2. 高优先级建议至少 2 条
3. 每条 issue 必须引用原文中的具体句子
4. suggestion 必须具体可执行
5. 直接返回 JSON，不要 markdown 代码块标记`;
}

async function callDeepSeek(messages: Array<{ role: string; content: string }>) {
  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages,
      temperature: 0.7,
      max_tokens: 3000,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`DeepSeek API 错误: ${JSON.stringify(data)}`);
  }

  return data.choices[0].message.content;
}

function getDefaultScores() {
  return {
    scores: { content: 70, ats: 70, hrReadability: 70, keywordMatch: 70 },
    overall: 70,
    strengths: [],
    weaknesses: [],
  };
}

function getDefaultResult() {
  return {
    parsed: { basicInfo: {}, summary: '简历解析遇到问题，但已尽力评估。' },
    scores: getDefaultScores(),
    suggestions: [
      {
        priority: 'medium',
        category: '内容',
        issue: '简历需要更详细的描述',
        suggestion: '建议为每段工作经历添加具体成果和量化数据',
        reason: '量化的成果比笼统的描述更有说服力',
      },
    ],
  };
}
