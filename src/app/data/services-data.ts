export interface ServiceInput {
  question: string;
  options?: string[];
  type?: 'text' | 'date' | 'select';
  crmField?: string;
}

export interface ServiceDef {
  id: number;
  title: string;
  formType: string;
  category: number;
  description: string;
  icon: string;
  image: string;
  inputs: ServiceInput[];
}

export const ALL_SERVICES: ServiceDef[] = [
  {
    id: 1,
    title: 'Solar',
    formType: 'solar',
    icon: 'bi-sun-fill',
    category: 20,
    description:
      'Harness the power of the sun with our advanced solar solutions. Reduce energy costs, lower your carbon footprint, and enjoy sustainable energy tailored to your needs.',
    image: 'assets/images/thumbs/solar-image3.webp',
    inputs: [
      { question: 'How much is your electricity bill?', options: ['50$', '100$', '200$', '300$', '400$', '500$', '600$', '700$', '800$', '900$', 'More than 900$'], crmField: 'SolarCurrencyBill' },
      { question: 'How much sun hits your roof?', options: ['Full sun', 'Partially shaded', 'Mostly shaded', 'Not sure'], crmField: 'HowMuchSun' },
      { question: 'Who is your energy provider?', type: 'text', crmField: 'ElectricalEnergyProvider' },
      { question: 'What is the nature of your project?', options: ['New', 'Repair', 'Remodeling'], crmField: 'ProjectNature' },
    ],
  },
  {
    id: 2,
    title: 'Windows',
    formType: 'windows',
    icon: 'bi-window',
    category: 18,
    description:
      'Enhance your home’s and offices beauty and efficiency with our premium window services. From installations to replacements, we provide energy-saving, stylish, and durable options.',
    image: 'assets/images/thumbs/windows.webp',
    inputs: [
      { question: 'What is the nature of your project?', options: ['Install', 'Repair', 'Remodeling'], crmField: 'ProjectNature' },
      { question: 'How many windows are involved?', options: ['1 window', '2 windows', '3-5 windows', '6-9 windows', '10+ windows'], crmField: 'windowsType' },
      { question: 'Project status?', options: ['Ready to hire', 'Planning and budgeting'], crmField: 'ProjectStatus' },
      { question: 'What is the material of your windows', options: ['Vinyl', 'Wood', 'Aluminium', 'Brick', 'Stone', 'Metal', 'Windows Cleaning'], crmField: 'windowsMaterial' },
    ],
  },
  {
    id: 3,
    title: 'Roofing',
    formType: 'roofing',
    icon: 'bi-house-door-fill',
    category: 15,
    description:
      'Protect your home with our reliable roofing solutions. Whether you need new roof, repairs, or maintenance, we ensure durability, safety, and top-notch craftsmanship.',
    image: 'assets/images/thumbs/roofing-image.webp',
    inputs: [
      { question: 'What is the nature of your project?', options: ['New', 'Repair', 'Remodelling'], crmField: 'ProjectNature' },
      { question: 'What type of material do you need', options: ['Ashphalt Shingle', 'Cedar Shake', 'Metal', 'Natural Slate', 'Tar', 'Commercial Roofing', 'Flat, Foam, or Single Ply Roofing', 'Traditional Tile Roofing', 'Wood or Composite Roofing', 'Water proof coatings', 'Roof Removal', 'Roof Maintenance or Cleaning', 'Other'], crmField: 'roofingType' },
      { question: 'Project status?', options: ['Ready to hire', 'Planning and budgeting'], crmField: 'ProjectStatus' },
    ],
  },
  {
    id: 4,
    title: 'HVAC',
    formType: 'hvac',
    icon: 'bi-thermometer-sun',
    category: 19,
    description:
      'Stay comfortable year-round with our HVAC services. From installation to maintenance, we optimize your heating and cooling systems for peak efficiency.',
    image: 'assets/images/thumbs/HVAC-img.webp',
    inputs: [
      { question: 'What is the nature of your project?', options: ['New', 'Repair', 'Remodeling'], crmField: 'ProjectNature' },
      { question: 'What type of HVAC do you need', options: ['Air Ducts', 'Boiler & Radiators', 'Central air Cleaning & maintenance', 'Central Air', 'Cooling', 'Heat', 'Ductless Air Conditioning', 'Furnaces', 'Gas Heat', 'Geothermal Systems', 'Heating', 'Heat Pumps', 'Oil Heat', 'Radiant Floor System', 'Thermostats', 'Ductless AC', 'Ducts and Vents'], crmField: 'HVACType' },
      { question: 'Project status?', options: ['Ready to hire', 'Planning and budgeting'], crmField: 'ProjectStatus' },
    ],
  },
  {
    id: 5,
    title: 'Painting',
    formType: 'painting',
    icon: 'bi-brush-fill',
    category: 13,
    description:
      'Transform your space with our expert painting services. We deliver flawless finishes and vibrant colors that breathe life into your home or business.',
    image: 'assets/images/thumbs/Painting-img.webp',
    inputs: [
      { question: 'Type of painting needed', options: ['Exterior painting - Trim/Shutters', 'Exterior painting - Whole House', 'Paint or Stain - Deck/Fence/Porch', 'Interior Painting 1-2 Rooms', 'Interior Painting 3+ Rooms', 'Wallpaper Hanging/Removal', 'Speciality- Faux Finishes', 'Speciality - Textures', 'Commercial', 'Paint Removal or Stripping'], crmField: 'PaintType' },
      { question: 'Project status?', options: ['Ready to hire', 'Planning and budgeting'], crmField: 'ProjectStatus' },
    ],
  },
  {
    id: 6,
    title: 'Plumbing',
    formType: 'plumbing',
    icon: 'bi-droplet-fill',
    category: 14,
    description:
      'Solve your plumbing problems with our fast and efficient services. From leaky faucets to major installations, we ensure everything flows smoothly.',
    image: 'assets/images/thumbs/Plumbing-img.webp',
    inputs: [
      { question: 'What is the nature of your project?', options: ['New', 'Repair', 'Remodeling'], crmField: 'ProjectNature' },
      { question: 'Type of plumbing needed?', options: ['Basement Drainage Channel', 'Bathtubs', 'Industrial Plumbing', 'Faucets Fixtures Pipes', 'Gas pipes', 'General', 'Leak Detection', 'Remodeling and construction', 'Sewer and Drain', 'Walk-In Bath', 'Fire Sprinkler System', 'Pump out a septic tank', 'Septic system', 'SUMP pump', 'Water heater', 'Water Line', 'Water main', 'Other'], crmField: 'PlumberType' },
      { question: 'Project status?', options: ['Ready to hire', 'Planning and budgeting'], crmField: 'ProjectStatus' },
    ],
  },
  {
    id: 7,
    title: 'Gutters',
    formType: 'gutters',
    icon: 'bi-cloud-rain-fill',
    category: 22,
    description:
      'Keep your home safe from water damage with our seamless gutter solutions. We offer installation, repair, and cleaning services for optimal drainage.',
    image: 'assets/images/thumbs/Gutters-img.webp',
    inputs: [
      { question: 'What is the nature of your project?', options: ['New', 'Repair', 'Remodeling'], crmField: 'ProjectNature' },
      { question: 'Type of product needed', options: ['Galvanized', 'Seamless Metal', 'PVC', 'Wood', 'Gutter Cleaning', 'Gutter Protection', 'Other'], crmField: 'Guttertype' },
      { question: 'Project status?', options: ['Ready to hire', 'Planning and budgeting'], crmField: 'ProjectStatus' },
    ],
  },
  {
    id: 8,
    title: 'HomeSecurity',
    formType: 'home_security',
    icon: 'bi-shield-lock-fill',
    category: 23,
    description:
      'Secure your peace of mind with our advanced home security systems. Protect your loved ones with cutting-edge technology and professional installation.',
    image: 'assets/images/thumbs/Homesecurity-img.webp',
    inputs: [
      { question: 'Type of service needed', options: ['Equipment Only', 'New System Installation', 'Reactivating The Existing System'], crmField: 'HomeSecurity' },
    ],
  },
  {
    id: 9,
    title: 'Kitchen',
    formType: 'kitchen',
    icon: 'bi-cup-hot-fill',
    category: 11,
    description:
      'Create your dream kitchen with our expert remodeling and installation services. We blend functionality and style to make your culinary space extraordinary.',
    image: 'assets/images/thumbs/Kitchen-img.webp',
    inputs: [
      { question: 'What is the nature of your project?', options: ['New Kitchen', 'Repair Kitchen', 'Kitchen Remodelling'], crmField: 'ProjectNature' },
      { question: 'Type of remodeling needed?', options: ['Appliances', 'Cabinets', 'Cabinet Repair', 'Counter Tops or Sinks', 'Floor Plan', 'Flooring', 'Full Kitchen'], crmField: 'Kitchentype' },
      { question: 'Project status?', options: ['Ready to hire', 'Planning and budgeting'], crmField: 'ProjectStatus' },
    ],
  },
  {
    id: 10,
    title: 'Siding',
    formType: 'siding',
    icon: 'bi-layers-fill',
    category: 16,
    description:
      'Enhance your home’s curb appeal and durability with our top-quality siding services. Choose from a variety of styles and materials for lasting beauty.',
    image: 'assets/images/thumbs/Siding-img.webp',
    inputs: [
      { question: 'What is the nature of your project?', options: ['New', 'Repair', 'Remodeling'], crmField: 'ProjectNature' },
      { question: 'What type of project', options: ['Aluminium', 'BrickFace', 'Composite Wood', 'StoneFace', 'Stucco', 'Vinyl', 'Other'], crmField: 'Sidingtype' },
      { question: 'Project status?', options: ['Ready to hire', 'Planning and budgeting'], crmField: 'ProjectStatus' },
    ],
  },
  {
    id: 11,
    title: 'Bathroom',
    formType: 'bathroom',
    icon: 'bi-water',
    category: 2,
    description:
      'Revitalize your bathroom with our modern renovation solutions. From luxurious upgrades to practical fixes, we craft spaces that blend comfort and elegance.',
    image: 'assets/images/thumbs/Bathroom-img.webp',
    inputs: [
      { question: 'What is the nature of your project?', options: ['New Bath Install', 'Bathroom Remodel'], crmField: 'ProjectNature' },
      { question: 'Type of remodeling needed', options: ['BathTub', 'BathTub Linear', 'Cabinets', 'Counter Tops', 'Full Remodel', 'General Remodeling', 'New Florring', 'Shower', 'Sink', 'Toilet', 'Walk-In Tub', 'Complete Remodel', 'Vanity', 'Other'], crmField: 'bathtype' },
      { question: 'Project status?', options: ['Ready to hire', 'Planning and budgeting'], crmField: 'ProjectStatus' },
    ],
  },
  {
    id: 12,
    title: 'Fencing',
    formType: 'fencing',
    icon: 'bi-border-all',
    category: 8,
    description:
      'Define your property with our custom fencing solutions. We provide durable, stylish, and secure options to fit your needs and style.',
    image: 'assets/images/thumbs/Fencing-img.webp',
    inputs: [
      { question: 'Type of fencing project?', options: ['Wood Fence', 'Vinyl or PVC Fence', 'Chain Link Fence', 'Wrought Iron Fence', 'Aluminium Or Steel Fence', 'Barbed Wired Fence', 'Electric Pet Fence'], crmField: 'Fencingtype' },
      { question: 'Project status?', options: ['Ready to hire', 'Planning and budgeting'], crmField: 'ProjectStatus' },
    ],
  },
  {
    id: 13,
    title: 'Flooring',
    formType: 'flooring',
    icon: 'bi-grid-3x3-gap-fill',
    category: 9,
    description:
      'Upgrade your home with our premium flooring services. From hardwood to tiles, we offer elegant, durable, and cost-effective solutions for every space.',
    image: 'assets/images/thumbs/Flooring-img.webp',
    inputs: [
      { question: 'Floor Type?', options: ['Carpet', 'Epoxy Flooring', 'Hardwood Floor', 'Laminate Floor', 'Tile Floor', 'Vinyl Or Linoleum Floor', 'Wood Floor - Refinishing', 'Wood Floor'], crmField: 'Floortype' },
      { question: 'Project status?', options: ['Ready to hire', 'Planning and budgeting'], crmField: 'ProjectStatus' },
    ],
  },
];

export function findServiceByTitle(title: string): ServiceDef | undefined {
  return ALL_SERVICES.find((s) => s.title.toLowerCase() === decodeURIComponent(title).toLowerCase());
}
