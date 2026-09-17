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

// Hiring summaries aligned with Thomas's supplied résumé and research/portfolio/ evidence.
// Keep individual contributions distinct from team ownership; do not invent impact metrics.
export const PROJECT_DETAILS: ProjectDetail[] = [
  {
    "id": "stanley",
    "chapter": 1,
    "title": "LLM Driven Video Generator",
    "context": "Independent project",
    "summary": "I built a full-stack YouTube creation workflow from scratch with a teammate. It helps creators research ideas and generate titles, scripts, and thumbnails.",
    "role": "Full-stack creation workflow and AI backend",
    "quickSummary": "Built a full-stack workflow for YouTube research, titles, scripts, and thumbnails.",
    "stack": "React, TypeScript, Gemini, YouTube APIs, Cloudflare Workers, D1",
    "sections": [
      {
        "id": "workflow",
        "title": "The creation workflow",
        "paragraphs": [
          "I built the React and TypeScript creation flow and Gemini backend on Cloudflare Workers/D1, connecting YouTube research to content generation."
        ]
      },
      {
        "id": "agent",
        "title": "Research and memory",
        "paragraphs": [
          "I designed AI tool calls with reusable research, saved creator preferences, input validation, request limits, and retries."
        ]
      },
      {
        "id": "testing",
        "title": "Testing and outreach",
        "paragraphs": [
          "I tested research, memory, and conversation continuity, and pitched the project to Stan’s CTO for a potential partnership."
        ]
      }
    ]
  },
  {
    "id": "okra",
    "chapter": 2,
    "title": "OKRA",
    "context": "TapMango · built from scratch",
    "summary": "I designed and built OKRA, TapMango’s internal goal-tracking tool, from scratch. It connects goals to business data and automates metric collection, reports, and monthly check-ins.",
    "role": "Full-stack development, data models, and reporting",
    "quickSummary": "Designed and built TapMango’s internal goal tracker, with automated metrics, reports, and monthly check-ins.",
    "stack": "Angular, TypeScript, PrimeNG, Node.js, Express, SQL Server",
    "sections": [
      {
        "id": "model",
        "title": "Goal tracking",
        "paragraphs": [
          "I built the Angular interface, Node.js/Express APIs, and SQL Server data model. Teams can set goals, track progress, and trace results back to source data."
        ]
      },
      {
        "id": "reporting",
        "title": "Accurate reports",
        "paragraphs": [
          "I developed planning and reporting APIs that validate metric calculations and use consistent rules across reports and summaries."
        ]
      },
      {
        "id": "editing",
        "title": "Planning and check-ins",
        "paragraphs": [
          "I built monthly check-ins and tools to carry goals into the next quarter, with checks that prevent conflicting edits."
        ]
      }
    ]
  },
  {
    "id": "portal",
    "chapter": 3,
    "title": "Portal V2",
    "context": "TapMango · team redesign",
    "summary": "I developed live workflows for Portal V2, TapMango’s merchant dashboard for loyalty and customer operations. As part of the redesign team, I built Angular interfaces and C#/ASP.NET Core APIs.",
    "role": "Full-stack feature development",
    "quickSummary": "Shipped merchant workflows for memberships, promotions, rewards, service requests, billing, and reviews.",
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
        "title": "Service requests, billing, and reviews",
        "paragraphs": [
          "I built Service Desk for handling service requests, Billing/Invoices for finding and downloading invoices, and Review Boost for managing customer reviews."
        ]
      }
    ]
  },
  {
    "id": "tapi",
    "chapter": 4,
    "title": "TAPI",
    "context": "TapMango · AI assistant",
    "summary": "I co-built TAPI from the ground up so merchants can operate TapMango in natural language. The assistant works across AI models, with reporting, product-document search, and user-controlled memory.",
    "role": "AI assistant development, reporting, search, and memory",
    "quickSummary": "Co-built TAPI from the ground up so merchants can operate TapMango in natural language.",
    "stack": "Angular, TypeScript, NestJS, PostgreSQL, Prisma, OpenRouter, C#",
    "sections": [
      {
        "id": "reports",
        "title": "Reporting and approved execution",
        "paragraphs": [
          "I implemented the reporting engine, history, and approved execution with NestJS and C# APIs, keeping access scoped to each merchant."
        ]
      },
      {
        "id": "guides",
        "title": "Product-document search",
        "paragraphs": [
          "I built tools to search product documentation and show sources, so merchants can find answers about the platform through the assistant."
        ]
      },
      {
        "id": "memory",
        "title": "User-controlled memory",
        "paragraphs": [
          "I added controls to review and remove saved context, keeping memory scoped to the correct merchant and user."
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
