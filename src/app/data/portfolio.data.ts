export interface Role {
  company: string;
  title: string;
  period: string;
  line: string;
}

export interface Project {
  name: string;
  description: string;
  tags: string[];
  url?: string;
}

export const ROLES: Role[] = [
  {
    company: 'TapMango',
    title: 'Software Engineer',
    period: '2025 –',
    line: 'Loyalty and online ordering platform used by thousands of businesses. Back as an engineer after interning here in 2022.',
  },
  {
    company: 'JobBuddy',
    title: 'Software Engineer',
    period: 'Apr 2025 –',
    line: 'Building Joda — an AI assistant for construction teams. LLM integrations, automation pipelines, document processing.',
  },
];

export const PROJECTS: Project[] = [
  {
    name: 'thomas.talas.ca',
    description:
      'This site. Angular portfolio with seasonal themes, accent controls, Abacus counters, responsive bento panels, and a deliberately small surface area.',
    tags: ['angular', 'typescript', 'scss', 'signals', 'abacus'],
    url: 'https://thomas.talas.ca',
  },
  {
    name: 'Joda',
    description:
      'AI-powered job assistant that helps construction teams manage projects, track progress, and stay connected. Handles document processing, job summaries, and replaces hours of manual coordination.',
    tags: ['supabase', 'n8n', 'openai', 'rest-apis', 'ai'],
  },
  {
    name: 'AI Workflow Automation',
    description:
      'End-to-end automation pipelines connecting business tools and LLMs. Auto-classification, document summarization, Slack routing. Deployed at two companies.',
    tags: ['n8n', 'openai', 'webhooks', 'automation'],
  },
  {
    name: 'Portfolio theme system',
    description:
      'Four-season color system with persisted theme and accent controls. Built as a small frontend design system instead of hard-coded one-off colors.',
    tags: ['design-system', 'css-vars', 'localstorage', 'accessibility'],
  },
  {
    name: 'kimvu.design',
    description:
      'Production website for an interior designer. Multiple iterations with the client. Fully responsive, custom layouts, real client work.',
    tags: ['html', 'css', 'javascript'],
    url: 'https://kimvu.design',
  },
];
