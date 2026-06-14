export interface Experience {
  role: string;
  company: string;
  location: string;
  period: string;
  bullets: string[];
}

export const experience: Experience[] = [
  {
    role: 'Operations & Logistics Assistant (Praktisches Semester)',
    company: 'SCA Logistik & Fulfillment GmbH',
    location: 'Reichertshofen, Germany',
    period: '05/2024 – 10/2024',
    bullets: [
      'End-to-end involvement in e-commerce fulfilment processes for webshop customers',
      'Operated Warehouse Management and ERP systems for inventory tracking and order processing',
      'Contributed to logistics process improvement initiatives including co-packing and contract packaging',
      'Hands-on experience with AutoStore AS/RS intralogistics',
    ],
  },
  {
    role: 'Web Developer (Freelance)',
    company: 'Self-employed',
    location: 'Remote',
    period: '2023 – Present',
    bullets: [
      'Designed and developed commercial websites including Sun Tech Lanka',
      'Built a Moodle-like LMS platform and a tutoring website (thethula.com)',
      'Leveraged AI-based developer tools for accelerated design and deployment',
    ],
  },
  {
    role: 'Social Media Consultant (Freelance)',
    company: 'forzahorizon5_xpert — Gaming Creator',
    location: 'Remote',
    period: '2022 – Present',
    bullets: [
      'Helped grow channel to 452K Instagram followers, 5.5M TikTok followers, 44.2K YouTube subscribers',
      'Negotiated first sponsorship deals with MOZA Racing and Next Level Racing',
      'Guided the YouTube channel through monetisation onto the YouTube Partner Programme',
      'Recovered account access after a security incident with zero audience loss',
    ],
  },
  {
    role: 'Junior Executive — IT',
    company: 'Singer Sri Lanka PLC',
    location: 'Kadawatha, Sri Lanka',
    period: '11/2020 – 08/2022',
    bullets: [
      'First point of contact for internal IT support across Windows environments and network issues',
      'Analysed and improved cross-departmental data workflows to reduce downtime',
      'Promoted from IT Assistant for consistently strong performance',
      'Supported the integration of new software tools and managed inter-departmental interfaces',
    ],
  },
];
