export interface ProjectDetail {
  id: string;
  chapter: number;
  title: string;
  context: string;
  summary: string;
  role: string;
  stack?: string;
  draftNote?: string;
  sections: { id: string; title: string; paragraphs: string[] }[];
}

// Public summaries are backed by local source and task-history notes in research/portfolio/.
// Keep company contribution credits explicit; code existence alone is not a claim of production impact.
// Unverified case studies carry their own draftNote instead of labelling all projects as filler.
export const PROJECT_DETAILS: ProjectDetail[] = [
  {
    "id": "stanley",
    "chapter": 1,
    "title": "Stanley for YouTube",
    "context": "Independent project",
    "summary": "Stanley for YouTube is a conversational workspace for developing video ideas, titles, scripts, and thumbnails. We built it independently to demonstrate a product direction and get the company’s attention. My work focused on the creation workflow and the engineering behind it: a bounded AI runtime, YouTube research, persistent memory, and an interface that shows what the system is actually doing.",
    "role": "Collaborative product development · creation interface, server routes, AI runtime, and evidence handling",
    "stack": "React, TypeScript, Vite / vinext, Gemini, YouTube APIs, Cloudflare Workers and D1, Drizzle",
    "sections": [
      {
        "id": "workflow",
        "title": "From a title generator to a creative workflow",
        "paragraphs": [
          "The project started as a title generator. As we developed it, the more useful interaction became a conversation: choose an idea, refine its angle, write a script, work through filming decisions, and develop a thumbnail. Those steps share a brief, so asking the creator to reconstruct their intent for every tool would make the product harder to use.",
          "I built the unified creation chat and its server workflow. The application identifies the requested deliverable and renders conversational replies alongside structured ideas, titles, scripts, and thumbnail output. It accepts reference images, short video uploads, microphone transcription, and videos selected from a connected YouTube channel.",
          "The broader product was collaborative. A teammate contributed the dashboard, onboarding, Creator Twin, and extension interface work; I also refined the navigation and dashboard experience as those pieces came together."
        ]
      },
      {
        "id": "agent",
        "title": "Keeping the agent bounded",
        "paragraphs": [
          "The research loop gives Gemini three explicit tools: a connected-channel snapshot, public reference-video search, and evidence for a specific video. A request policy decides which tools are appropriate. The model can then choose among the permitted tools or answer from the context already available.",
          "I separated the loop from the provider adapter and tool implementations. The runtime validates tool arguments, limits rounds and calls, applies deadlines, and retries selected transport failures. Identical safe reads are reused within a turn. Repeated requests that add no new information stop the loop.",
          "Tool results distinguish success, partial evidence, empty results, and errors. The server streams actual tool activity to the interface, so a longer request can show which research is underway and what has completed."
        ]
      },
      {
        "id": "evidence",
        "title": "YouTube evidence has limits",
        "paragraphs": [
          "A title, thumbnail, and view count do not establish what someone said in a video. Specific-video research keeps track of transcript availability, timestamps, and coverage. If an owner-authorized caption track is unavailable, the application makes that limitation explicit before attempting work that depends on the transcript.",
          "Named-creator research also needs to identify the right channel before using its uploads. I added channel-resolution and evidence-policy checks, including tests for ambiguous names and follow-up questions that should reuse evidence already collected.",
          "Authenticated analytics, public observations, and simulated demo reports remain separate. The demo workspace is labelled so someone can explore the product without mistaking sample owner metrics for another creator’s private analytics."
        ]
      },
      {
        "id": "memory",
        "title": "Remember the creator, preserve the brief",
        "paragraphs": [
          "Cloudflare D1 stores creator and project records, with their schema defined in Drizzle. The current creator-memory policy requires an explicit request to remember or forget something before changing durable memory. Retrieval selects relevant saved facts instead of inserting every preference into every answer.",
          "The active conversation carries the current video’s choices. A follow-up such as “use the second idea” should keep that selection, even when a later attachment introduces a different topic. I worked on conversation-context handling and regression cases for that boundary.",
          "This separates a creator’s longer-lived preferences from the direction of one piece of work. It also lets corrections replace earlier facts without quietly turning every conversation into a permanent profile."
        ]
      },
      {
        "id": "testing",
        "title": "Testing decisions, not just responses",
        "paragraphs": [
          "The deterministic tests exercise tool selection, malformed arguments, timeouts, repeated calls, memory relevance, attachment policies, and continuity between turns. They use controlled provider and tool responses, which makes failures reproducible without depending on a live model or consuming API quota.",
          "Playwright scenarios cover the interface workflows, including taking an idea through a script and thumbnail and attaching different kinds of media. These checks address application behavior; they are separate from evaluating the quality of a live model’s creative suggestions."
        ]
      }
    ]
  },
  {
    "id": "okra",
    "chapter": 2,
    "title": "OKRA",
    "context": "TapMango · built from scratch",
    "summary": "I built OKRA from scratch at TapMango to connect company and team goals to the operational measurements behind them. It brings objectives, key results, automated reporting, manual monthly check-ins, and source-level drilldowns into one application. My work crossed the frontend, API, and SQL Server calculations, working with product and data colleagues to turn reporting definitions into usable review workflows.",
    "role": "Full-stack development · metric modeling, automated reporting, and review workflows",
    "stack": "Angular, TypeScript, PrimeNG, Node.js, Express, SQL Server, T-SQL",
    "sections": [
      {
        "id": "model",
        "title": "Separate the measurement from its target",
        "paragraphs": [
          "A metric describes a measurement. A key result gives that measurement a target, reporting period, aggregation rule, and filters. Keeping those concepts separate allows the same automated source facts to support different reporting questions without duplicating the collection process.",
          "Automated loaders write contributing records into a snapshot store with the context needed for a drilldown. Manual check-ins use the same store with a separate collection tag and a monthly value. The API checks the key result’s collection method so a manual submission cannot overwrite an automated feed."
        ]
      },
      {
        "id": "reporting",
        "title": "From reporting data to a review",
        "paragraphs": [
          "Scheduled SQL loaders bring existing upstream reporting data into the application’s snapshot store. The API then serves the overview, monthly series, and contributing rows instead of making each browser request query the upstream reporting system.",
          "The interface lets a reviewer move from a key result into its monthly values and then into the records behind a calculation. Monthly key results retain separate month statuses, and missing data has its own state rather than being presented as a zero.",
          "These snapshots can be corrected when source data changes. For example, a monthly loader replaces the selected period inside a transaction. That keeps reporting corrections scoped to the affected period."
        ]
      },
      {
        "id": "checkpoint",
        "title": "Getting a 30-day metric right",
        "paragraphs": [
          "One feature I added measures usage at a feature’s 30-day checkpoint. The reporting period is determined by the launch date plus 30 days, rather than by the date the loader happened to collect the record.",
          "The numerator counts positive usage; the denominator keeps the full eligible population, including records with zero usage. Dropping those records would change the meaning of the metric. The usage score already existed upstream; my work connected it to the requested key-result definition.",
          "I carried the same eligibility rule through the monthly series, cached overview, and source drilldown. The drilldown shows the launch date and usage score so a reviewer can follow why a record counts. The SQL query shifts the date bounds instead of applying date arithmetic to the indexed column, with an index aligned to the metric, collection method, and source date."
        ]
      },
      {
        "id": "editing",
        "title": "Shared editing and reporting tradeoffs",
        "paragraphs": [
          "Objective and key-result updates use row-version checks. When someone saves an older version, the API returns a conflict instead of silently replacing a newer edit. Quarterly rollover copies the objective structure and its key results in a transaction, remapping parent-child relationships into the next period.",
          "Overview reads use a per-key-result, per-quarter cache. Recalculation is best-effort after a successful write, keeping a saved check-in separate from a failed reporting refresh. The tradeoff is that the cached overview can lag the underlying data until a later recomputation."
        ]
      },
      {
        "id": "regression",
        "title": "A regression at the database boundary",
        "paragraphs": [
          "A synchronization change added a trigger to the shared snapshot table and broke manual submissions. The form and its validation still worked; SQL Server rejected the existing MERGE statement because it returned OUTPUT directly from a table with an enabled trigger.",
          "I traced the failed save to that interaction and changed the query to capture the saved row with OUTPUT INTO before selecting the result. The fix was checked against the trigger-enabled schema inside a rolled-back transaction, followed by syntax and frontend build checks.",
          "The regression connected two paths that looked separate in the interface: automated collection and manual entry. Checking both against the shared database behavior was essential to fixing the actual failure."
        ]
      }
    ]
  },
  {
    "id": "portal",
    "chapter": 3,
    "title": "Portal V2",
    "context": "TapMango · team redesign",
    "summary": "Portal V2 is the team’s modernization of TapMango’s merchant workspace. I contributed individual workflows across the Angular interface and C# services, including Review Boost, SMS Keywords, Gift Cards, Discounts, and Smart Product detail flows. The work also included follow-up fixes in Service Desk, promotion scheduling, and billing, where a new interface still has to preserve existing merchant behavior.",
    "role": "Software engineer on the Portal V2 team · feature implementation, backend integration, and workflow correctness",
    "stack": "Angular, TypeScript, PrimeNG, Tailwind CSS, RxJS, C#, ASP.NET Core",
    "sections": [
      {
        "id": "review-boost",
        "title": "Review Boost as a complete workflow",
        "paragraphs": [
          "Review Boost brings customer feedback and the settings behind review requests into one workspace. I implemented its Portal V2 module across the Angular frontend, portal backend, and Admin service. Merchants can search feedback, filter by rating and location, read comments, sort results, and move through pages.",
          "The settings are organized around three decisions: when to request feedback, where review links point, and what happens after feedback arrives. First-time setup follows those steps before saving; existing merchants can edit the relevant group directly.",
          "Multi-location configuration has a focused editor that makes missing review destinations visible. Routine feedback review stays accessible without requiring someone to work through the full configuration every time they open the page."
        ]
      },
      {
        "id": "migration",
        "title": "Preserving behavior behind the new page",
        "paragraphs": [
          "Saving Review Boost settings involves more than updating a form record. It coordinates merchant configuration with campaign activities, triggers, notifications, and rewards. I carried that existing behavior into the new service path, using a database transaction for related changes and invalidating configuration and trigger caches after saving.",
          "The portal backend derives merchant and user context from the authenticated session. The service filters feedback to permitted locations and rejects merchant-wide settings changes by location-restricted users. Those checks belong at the API boundary as well as in the interface.",
          "On the frontend, I reused the portal’s shared search, pagination, filter, and feedback patterns. Feature-specific configuration stays in its own module while familiar interactions remain consistent with the rest of the product."
        ]
      },
      {
        "id": "service-desk",
        "title": "Small screens expose state problems",
        "paragraphs": [
          "In Service Desk, opening a conversation’s action menu on mobile could also select the conversation, switch the layout to the thread, and hide the menu being used. I separated those actions so opening a menu does not unexpectedly navigate the person away from it.",
          "Closing or reopening a conversation also has to reconcile the queue, selection, and polling. I worked through those transitions and made unread indicators clear only after the mark-read request succeeds.",
          "The corresponding browser scenarios cover the failure paths: a menu that stays actionable, an unsuccessful mark-read request that preserves the unread state, and queue changes that stop polling the old selection."
        ]
      },
      {
        "id": "correctness",
        "title": "Dates and exports need to round-trip",
        "paragraphs": [
          "Promotion scheduling had a different boundary problem: a date could look correct while conversion lost part of the merchant’s timezone offset. I updated the backend conversion to use the full timezone and added regression cases for fractional offsets, noon, and the distinct meanings of a midnight start and end.",
          "For invoice CSV export, I made the download follow the active filters through every result page. The service accumulates the matching rows before building the file, rather than exporting only the visible page. It escapes CSV fields and protects values that a spreadsheet could otherwise interpret as formulas.",
          "These changes preserve the meaning of the merchant’s action across systems: the saved schedule should reopen at the intended local time, and a filtered export should contain the same set of invoices the interface describes."
        ]
      },
      {
        "id": "validation",
        "title": "Validation around the failure mode",
        "paragraphs": [
          "The work used targeted frontend and backend tests alongside Playwright workflows and browser review. Review Boost checks covered setup, settings editing, and mobile layouts; follow-up scenarios exercised mobile menus, schedule conversions, and filtered exports.",
          "Mocked interface tests helped make those flows deterministic. Service builds and focused backend checks covered different parts of the integration, including timezone conversions and the persistence behavior behind a form submission."
        ]
      }
    ]
  },
  {
    id: 'tapi',
    chapter: 4,
    title: 'Tapi',
    context: 'TapMango · AI assistant',
    summary:
      'Tapi is TapMango’s AI assistant for product guidance and merchant business questions. I contributed reporting tools, guide ingestion and retrieval, and memory management within the team’s broader AI platform. My work connected the assistant to existing systems while making the available evidence, permitted actions, and saved context easier to inspect.',
    role: 'Software engineer on the Tapi team · reporting integrations, knowledge retrieval, and memory controls',
    stack: 'Angular, TypeScript, NestJS, Zod, PostgreSQL with vector search, Prisma, OpenRouter, C# Admin services',
    sections: [
      {
        id: 'assistant',
        title: 'An assistant inside an existing product',
        paragraphs: [
          'Tapi combines an Angular chat interface with a NestJS gateway. The team’s runtime lets the model inspect declared tool contracts and request supported operations. The gateway validates those requests and applies the signed-in user’s access before calling a service.',
          'My contributions sit at those service boundaries. A help article, a completed report, and a remembered preference answer different questions. The integration needs to preserve those differences so the assistant can explain a feature without treating that explanation as proof of a merchant’s current results.',
        ],
      },
      {
        id: 'reports',
        title: 'Report discovery and data access',
        paragraphs: [
          'I added report discovery and completed history so Tapi could find reports that already existed. History returns a bounded list of report references and selected metadata. Knowing that a report exists does not automatically grant the assistant access to its contents.',
          'For supported report types, I implemented a reviewed field projection in the C# Admin service and matching validation in the gateway. Unexpected fields or an unsupported schema stop the read. Other reports can remain discoverable in history without enabling detailed row access. This keeps the integration specific about which evidence the model receives.',
        ],
      },
      {
        id: 'approval',
        title: 'Review the report before it runs',
        paragraphs: [
          'I then connected report execution to an approval card showing the exact report and its inputs. The server builds the request using the authenticated merchant and user context. Repeated approvals reuse the existing report instead of publishing the same pending job twice.',
          'The gateway polls for a bounded period and distinguishes completion, failure, and a job that is still running. During review, I reduced the status query to the report identifier, type, and status it actually needs. The query is scoped to the current merchant and user before those fields are returned.',
          'Completion and permission to read the result remain separate. An approved report can finish successfully while its detailed rows stay unavailable to the assistant. Only a supported read contract allows the conversation to continue into those results.',
        ],
      },
      {
        id: 'guides',
        title: 'Knowledge you can investigate',
        paragraphs: [
          'I built guide ingestion and retrieval around documents with explicit sources, audiences, publication states, and heading-based chunks. Draft material stays out of published-guide search, and content hashes identify identical chunks during ingestion. Retrieved material keeps the source context needed to support an answer.',
          'I added coverage reports for parsing problems and missing metadata, alongside retrieval telemetry in the debug traces. Search timing, result counts, and the returned material give a developer somewhere concrete to start when an answer lacks useful evidence.',
          'That makes knowledge maintenance part of the product. A missing source, an unpublished document, and an overly narrow query need different fixes; changing the prompt alone would leave the underlying problem in place.',
        ],
      },
      {
        id: 'memory',
        title: 'Make saved context inspectable',
        paragraphs: [
          'I also worked on the memory service, embedding-based retrieval, and its management interface. Users can inspect saved context and remove an entry. The interface exposes the content, source context, and update information, while the service scopes operations to the relevant merchant and user.',
          'Memory supports preferences and continuity. Current business facts still need evidence from the appropriate service. Keeping that distinction explicit lets a preferred reporting style carry forward without turning an old conversational note into a current performance figure.',
        ],
      },
      {
        id: 'validation',
        title: 'Check the boundaries as well as the answer',
        paragraphs: [
          'The reporting work included gateway contract tests, Admin boundary tests, and approval and evaluation scenarios. Checks covered unexpected fields, mismatched report references, duplicate execution, and the successful path.',
          'Local verification also exercised a report that completed after approval while its customer-level rows remained unavailable for assistant readback. That tested two separate decisions in the same workflow: whether the requested report could run, and whether its result could become model context.',
        ],
      },
    ],
  },
];
