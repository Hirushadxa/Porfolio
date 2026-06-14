export interface Project {
  slug: string;
  title: string;
  subtitle: string;
  year: string;
  role: string;
  description: string;
  tags: string[];
  liveUrl?: string;
  featured?: boolean;
}

export const projects: Project[] = [
  {
    slug: 'everyday-os',
    title: 'Everyday OS',
    subtitle: 'AI-driven life & finance platform',
    year: '2025',
    role: 'Full-stack developer',
    description:
      'A live web application for international students to manage their life and finances with AI assistance. Integrates the Google Gemini API for smart financial data extraction and budgeting, and connects Google Calendar + WhatsApp Business APIs to automate personalised schedule generation.',
    tags: ['React', 'TypeScript', 'Vite', 'Firebase', 'Gemini API', 'Tailwind'],
    liveUrl: 'https://everyday-os.web.app',
    featured: true,
  },
  {
    slug: 'manufacturing-bi',
    title: 'Manufacturing BI Dashboard',
    subtitle: 'OEE & production analytics',
    year: '2025',
    role: 'BI developer',
    description:
      'End-to-end business intelligence solution for visualising production metrics including Overall Equipment Effectiveness (OEE) and live status data. Built the full pipeline — ETL logic, data modelling, DAX measures, and the management dashboard.',
    tags: ['Power BI', 'DAX', 'Data modelling', 'ETL'],
  },
  {
    slug: 'smart-factory-cv',
    title: 'Smart Factory: Computer Vision Quality Station',
    subtitle: 'Automated visual defect detection',
    year: '2024',
    role: 'Lead project engineer',
    description:
      'Built an automated quality control station integrating a wenglor B60 smart camera for visual defect recognition. Created a closed-loop workflow where image data and edge hardware signals triggered control logic to operate sorting mechanisms.',
    tags: ['Computer Vision', 'Object Detection', 'IoT', 'Industrial Automation'],
  },
  {
    slug: 'mukuru-water',
    title: 'Rainwater Harvesting System',
    subtitle: 'Social entrepreneurship (BIP)',
    year: '2024',
    role: 'Systems designer',
    description:
      'Collaborated in an interdisciplinary team at Thomas More University to design a low-cost rainwater harvesting system for the Mukuru Kwa Reuben community in Kenya. Focused on resource management, system design, and sustainable material use.',
    tags: ['Systems Design', 'Sustainability', 'BIP'],
  },
  {
    slug: 'retail-innovation',
    title: 'Retail Innovation Pitch',
    subtitle: 'Inclusive retail concepts (BIP)',
    year: '2024',
    role: 'Strategy & research',
    description:
      'Applied design-thinking methodologies in Antwerp to develop inclusive, user-centric B2B/B2C retail concepts. Conducted competitor and risk analyses to validate the business model, culminating in a strategic pitch in front of a stakeholder jury.',
    tags: ['Design Thinking', 'Market Research', 'B2B/B2C Strategy'],
  },
];
