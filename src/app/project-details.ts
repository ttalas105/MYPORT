export interface ProjectDetail {
  id: string;
  chapter: number;
  title: string;
  context: string;
  summary: string;
  role: string;
  quickSummary: string;
  stack?: string;
  draftNote?: string;
  sections: { id: string; title: string; paragraphs: string[] }[];
}

// Concise hiring summaries backed by local source and task-history notes in research/portfolio/.
// Keep individual contributions distinct from team ownership; do not invent impact metrics.
export const PROJECT_DETAILS: ProjectDetail[] = [
  {
    "id": "stanley",
    "chapter": 1,
    "title": "LLM Driven Video Generator",
    "context": "Independent project",
    "summary": "An AI workspace for planning YouTube videos, from research to scripts and thumbnails. I built the creation workflow and AI backend with a teammate.",
    "role": "Creation workflow and AI backend",
    "quickSummary": "Built the AI creation workflow and backend for research, scripts, titles, and thumbnails.",
    "stack": "React, TypeScript, Gemini, YouTube APIs, Cloudflare Workers, D1",
    "sections": [
      {
        "id": "workflow",
        "title": "The creation workflow",
        "paragraphs": [
          "I built a single chat for ideas, titles, scripts, and thumbnails. Creators can bring in images, short videos, or content from their YouTube channel."
        ]
      },
      {
        "id": "agent",
        "title": "Research and memory",
        "paragraphs": [
          "I connected Gemini to YouTube research and saved creator preferences. The AI has limits on tool calls and time, and shows when video transcripts or other sources are missing."
        ]
      },
      {
        "id": "testing",
        "title": "Teamwork and testing",
        "paragraphs": [
          "I tested research, saved preferences, and follow-up requests, plus the full creation flow in Playwright. A teammate built the dashboard, onboarding, Creator Twin, and browser extension interface."
        ]
      }
    ]
  },
  {
    "id": "okra",
    "chapter": 2,
    "title": "OKRA",
    "context": "TapMango · built from scratch",
    "summary": "I built TapMango’s goal-tracking app from scratch. It connects company and team goals to business data, with automatic progress reports and monthly check-ins.",
    "role": "Full-stack development, data models, and reporting",
    "quickSummary": "Built a goal-tracking app from scratch, with business data, progress reports, and monthly check-ins.",
    "stack": "Angular, TypeScript, PrimeNG, Node.js, Express, SQL Server",
    "sections": [
      {
        "id": "model",
        "title": "Goal tracking",
        "paragraphs": [
          "I built the interface, APIs, and database calculations. Teams can set targets, review monthly progress, and trace each result back to its source records."
        ]
      },
      {
        "id": "reporting",
        "title": "Accurate reports",
        "paragraphs": [
          "I automated data collection and added reporting rules, including a 30-day feature-usage measure. Reports keep zero usage separate from missing data and use the same rules in summaries and detailed views."
        ]
      },
      {
        "id": "editing",
        "title": "Safe updates",
        "paragraphs": [
          "I added checks for conflicting edits and tools to carry goals into the next quarter. I also fixed a database change that had blocked manual check-ins, then verified the save against the affected schema."
        ]
      }
    ]
  },
  {
    "id": "portal",
    "chapter": 3,
    "title": "Portal V2",
    "context": "TapMango · team redesign",
    "summary": "I built six live pages in TapMango’s merchant portal as part of the redesign team. My work spanned Angular interfaces, API endpoints, and integration with existing services.",
    "role": "Full-stack feature development",
    "quickSummary": "Built six live merchant pages for memberships, promotions, rewards, messaging, billing, and reviews.",
    "stack": "Angular, TypeScript, PrimeNG, Tailwind CSS, RxJS, C#, ASP.NET Core",
    "sections": [
      {
        "id": "memberships",
        "title": "Membership Plans",
        "paragraphs": [
          "I built a guided setup for free and paid memberships, including pricing, billing cycles, benefits, and participating locations."
        ]
      },
      {
        "id": "promotions-and-rewards",
        "title": "App Promotions and How to Earn",
        "paragraphs": [
          "Merchants can create and schedule promotions, choose audiences, and preview their content. How to Earn lets them publish and arrange the ways customers earn rewards."
        ]
      },
      {
        "id": "service-and-billing",
        "title": "Customer service and billing",
        "paragraphs": [
          "I built Service Desk’s customer messaging inbox, Billing/Invoices for searching and downloading invoices, and Review Boost for reviewing feedback and managing review requests."
        ]
      }
    ]
  },
  {
    "id": "tapi",
    "chapter": 4,
    "title": "Tapi",
    "context": "TapMango · AI assistant",
    "summary": "I contributed to TapMango’s AI assistant, helping merchants find product answers and work with business reports. My focus was reporting, help articles, and saved preferences.",
    "role": "Reporting tools, knowledge search, and memory",
    "quickSummary": "Built reporting tools, help-article search, and memory controls for TapMango’s AI assistant.",
    "stack": "Angular, TypeScript, NestJS, PostgreSQL, Prisma, OpenRouter, C#",
    "sections": [
      {
        "id": "reports",
        "title": "Reports",
        "paragraphs": [
          "I added report search, history, and an approval step before a report runs. Access checks control which results the assistant can read, and repeated approvals do not create duplicate jobs."
        ]
      },
      {
        "id": "guides",
        "title": "Help and memory",
        "paragraphs": [
          "I built tools to search published help articles and show their sources. I also added controls to review and remove saved context, scoped to the right merchant and user."
        ]
      },
      {
        "id": "validation",
        "title": "Testing",
        "paragraphs": [
          "I tested approval, permissions, duplicate requests, and unsupported report data. A completed report can remain private even when the assistant can track its status."
        ]
      }
    ]
  },
  {
    "id": "automations",
    "chapter": 5,
    "title": "Automations",
    "context": "North Group · Lead engineer",
    "summary": "I led the implementation of a connected workspace with North Group, combining organized files, searchable context, and a CRM built from email history.",
    "role": "Lead engineer · full implementation",
    "quickSummary": "Led a connected OneDrive workspace with searchable notes and emails, a CRM, and report-building tools.",
    "stack": "Claude, Microsoft OneDrive, Granola, automated workflows",
    "sections": [
      {
        "id": "onedrive-redesign",
        "title": "OneDrive redesign",
        "paragraphs": [
          "I redesigned the client’s OneDrive structure so files were organized and easier to find."
        ]
      },
      {
        "id": "context-layer",
        "title": "Context and reports",
        "paragraphs": [
          "I built workflows that keep Granola meeting notes and emails updated in OneDrive, so the client can ask Claude questions across their files and conversations. I also created a report-building skill that fills the client’s report templates from source data."
        ]
      },
      {
        "id": "crm-from-email-history",
        "title": "CRM from email history",
        "paragraphs": [
          "I built a CRM from past emails, turning existing correspondence into a structured record of contacts and relationships."
        ]
      }
    ]
  }
];
