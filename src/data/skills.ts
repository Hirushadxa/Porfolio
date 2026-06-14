export interface SkillGroup {
  title: string;
  items: string[];
}

export const skillGroups: SkillGroup[] = [
  {
    title: 'Data & BI',
    items: ['Power BI', 'DAX', 'KPI Tracking', 'SQL (basics)', 'Excel (advanced)', 'ETL'],
  },
  {
    title: 'Programming & Web',
    items: [
      'TypeScript',
      'Python',
      'C++ (basics)',
      'React',
      'Vite',
      'Tailwind CSS',
      'Firebase',
      'REST APIs',
      'Gemini API',
    ],
  },
  {
    title: 'Technology & Engineering',
    items: [
      'IoT',
      'Sensor Tech',
      'Computer Vision',
      'Industrial Automation',
      'TCP/IP',
      'SAP ERP (academic)',
      'AutoStore AS/RS',
    ],
  },
  {
    title: 'Methodology & Management',
    items: [
      'BPMN',
      'Lean',
      'Agile / Scrum',
      'Design Thinking',
      'Requirements Engineering',
      'Market Research',
    ],
  },
];
