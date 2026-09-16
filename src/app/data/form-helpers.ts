export type QuestionType = 'options' | 'text' | 'email' | 'tel' | 'textarea' | 'date' | 'checkbox' | 'provider';
export type FormPhase = 'project' | 'details' | 'contact';

export interface FormQuestion {
  key: string;
  label: string;
  type: QuestionType;
  options?: string[];
  phase: FormPhase;
  serviceQuestion?: string;
}

export const STATE_ABBREVIATIONS: Record<string, string> = {
  Alabama: 'AL', Alaska: 'AK', Arizona: 'AZ', Arkansas: 'AR', California: 'CA',
  Colorado: 'CO', Connecticut: 'CT', Delaware: 'DE', Florida: 'FL', Georgia: 'GA',
  Hawaii: 'HI', Idaho: 'ID', Illinois: 'IL', Indiana: 'IN', Iowa: 'IA', Kansas: 'KS',
  Kentucky: 'KY', Louisiana: 'LA', Maine: 'ME', Maryland: 'MD', Massachusetts: 'MA',
  Michigan: 'MI', Minnesota: 'MN', Mississippi: 'MS', Missouri: 'MO', Montana: 'MT',
  Nebraska: 'NE', Nevada: 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM',
  'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND', Ohio: 'OH', Oklahoma: 'OK',
  Oregon: 'OR', Pennsylvania: 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
  'South Dakota': 'SD', Tennessee: 'TN', Texas: 'TX', Utah: 'UT', Vermont: 'VT',
  Virginia: 'VA', Washington: 'WA', 'West Virginia': 'WV', Wisconsin: 'WI', Wyoming: 'WY',
  'Puerto Rico': 'PR', 'Washington DC': 'DC', 'District of Columbia': 'DC',
};

export function toStateAbbreviation(input: string): string {
  const trimmed = (input || '').trim();
  if (!trimmed) return '';
  if (STATE_ABBREVIATIONS[trimmed]) return STATE_ABBREVIATIONS[trimmed];
  const lower = trimmed.toLowerCase();
  const byName = Object.entries(STATE_ABBREVIATIONS).find(([name]) => name.toLowerCase() === lower);
  if (byName) return byName[1];
  const upper = trimmed.toUpperCase();
  const codes = new Set(Object.values(STATE_ABBREVIATIONS));
  if (codes.has(upper)) return upper;
  return '';
}

export function isValidUsState(input: string): boolean {
  return !!toStateAbbreviation(input);
}

export const AREA_CODES_US = [
  205, 251, 256, 334, 659, 907, 480, 520, 602, 623, 928, 479, 501, 870,
  209, 213, 279, 310, 323, 341, 408, 415, 424, 442, 510, 530, 559, 562, 619, 626, 650, 657, 661, 669, 707, 714, 747, 760, 805, 818, 820, 831, 858, 909, 916, 925, 949, 951, 628,
  303, 719, 720, 970, 203, 475, 860, 959, 302, 202,
  239, 305, 321, 352, 386, 407, 561, 689, 727, 754, 772, 786, 813, 850, 863, 904, 941, 954,
  229, 404, 470, 478, 678, 706, 762, 770, 912, 808, 208, 986,
  217, 224, 309, 312, 331, 464, 618, 630, 708, 773, 815, 847, 872,
  219, 260, 317, 463, 574, 765, 812, 930, 319, 515, 563, 641, 712,
  316, 620, 785, 913, 270, 364, 502, 606, 859, 225, 318, 337, 504, 985, 207,
  240, 301, 410, 443, 667, 339, 351, 413, 508, 617, 774, 781, 857, 978,
  231, 248, 269, 313, 517, 586, 616, 734, 810, 906, 947, 989,
  218, 320, 507, 612, 651, 763, 952, 228, 601, 662, 769,
  314, 417, 573, 636, 660, 816, 406, 308, 402, 531, 702, 725, 775, 603,
  201, 551, 609, 640, 732, 848, 856, 862, 908, 973, 505, 575,
  212, 315, 332, 347, 516, 518, 585, 607, 631, 646, 716, 718, 838, 845, 914, 917, 929, 934,
  252, 336, 704, 743, 828, 910, 919, 980, 984, 701,
  216, 220, 234, 330, 380, 419, 440, 513, 567, 614, 740, 937,
  405, 539, 580, 918, 458, 503, 541, 971,
  215, 223, 267, 272, 412, 445, 484, 570, 610, 717, 724, 814, 878, 401,
  803, 839, 843, 854, 864, 605, 423, 615, 629, 731, 865, 901, 931,
  210, 214, 254, 281, 325, 346, 361, 409, 430, 432, 469, 512, 682, 713, 726, 737, 806, 817, 830, 832, 903, 915, 936, 940, 945, 956, 972, 979,
  385, 435, 801, 802, 276, 434, 540, 571, 703, 757, 804, 826, 948,
  206, 253, 360, 425, 509, 564, 304, 681, 262, 414, 534, 608, 715, 920, 307, 787, 939, 340,
];

export const TCPA_TEXT =
  'By clicking GET YOUR QUOTE , I agree to the Terms of Service and Privacy Policy, I authorize home improvement companies, their contractors, and Partner Companies to contact me about home improvement offers by phone calls and text messages to the number I provided. I authorize that these marketing communications may be delivered to me using an automatic telephone dialing system or by prerecorded message. I understand that my consent is not a condition of purchase, and I may revoke that consent at any time. Mobile and data charges may apply. California Residents.';

export const BATH_CODE_BY_LABEL: Record<string, number> = {
  BathTub: 1, 'BathTub Install': 1, 'BathTub Linear': 2, 'BathTub Linear Install': 2,
  Cabinets: 3, 'Counter Tops': 4, 'Full Remodel': 5, 'General Remodeling': 6,
  'New Florring': 7, Shower: 8, 'Shower Install': 8, Sink: 9, 'Sink Install': 9,
  Toilet: 10, 'Toilet Install': 10, 'Walk-In Tub': 11, 'Walk-In Tub Install': 11,
  'Complete Remodel': 12, Vanity: 13, 'Vanity Install': 13, 'Vanity Repair': 14, Other: 15,
};
