// --- Base Token Types ---
export type BaseTokens = {
  radius: string;
  shadow: string;
  border: string;
  borderNone: string;
  spacing: {
    sm: string;
    md: string;
  };
  animation: {
    duration: string;
    easing: string;
  };
  zIndex: string;
};

// --- Colors Types ---
export type ColorTypes = {
  text: {
    primary: string;    // Main content text
    secondary: string;  // Secondary text
    tertiary: string;   // Less important text
    disabled: string;   // Text for inactive elements
    contrast: string;   // Text on colored backgrounds
    accent: string;     // Links, active elements
    success: string;    // Success messages
    warning: string;    // Warnings
    error: string;      // Errors
    info: string;       // Informational messages
  };
  background: {
    primary: string;    // Page background
    secondary: string;  // Cards, Modals background
    tertiary: string;   // Nested elements, input fields
    hover: string;      // Hover state for interactive elements
    disabled: string;   // Background for disabled elements
    accent: string;     // Primary buttons, active states
    accentHover: string;// Primary button hover
    success: string;    // Success elements
    successHover: string;// Success hover
    warning: string;    // Warning elements
    warningHover: string;// Warning hover
    error: string;      // Error elements
    errorHover: string; // Error hover
    info: string;       // Info elements
    infoHover: string;  // Info hover
  };
  border: {
    primary: string;    // Cards, Modal dividers
    secondary: string;  // Input fields, outline buttons
    tertiary: string;   // Less prominent borders
    disabled: string;   // Borders for disabled elements
    focus: string;      // Input field focus
    error: string;      // Input field error state
    info: string;       // Info state
    success: string;    // Success state
    warning: string;    // Warning state
  };
  ring: {
    focus: string;      // Focus ring
    error: string;      // Error state ring
    offset: string;     // Offset color
  };
  gradients: {
    primary: string;
    neutral: string;
    hero: string;
  };
};

// --- Mixins Types ---
export type Mixins = {
  surface: string;
  container: string;
  interactive: string;
  gridPattern: string;
  navigation: {
    spacing: string;
    link: string;
  };
  input: string;
  text: string;
  scrollbar: string; 
};


// --- Typography Types ---
export type Typography = {
  fontFamily: {
    base: string;
    heading: string;
    display: string;
    mono: string;
  };
  size: {
    xs: string;
    sm: string;
    md: string;
    base: string;
    lg: string;
    xl: string;
    '2xl': string;
    '3xl': string;
  };
  weight: {
    normal: string;
    medium: string;
    semibold: string;
    bold: string;
  };
  content: {
    h1: string;
    h2: string;
    h3: string;
    h4: string;
    h5: string;
    h6: string;
    p: string;
    ul: string;
    ol: string;
    li: string;
    blockquote: string;
    code: string;
    pre: string;
    a: string;       
  };
  lineHeight: string;
  letterSpacing: string;
  color: string;
};


// --- Layout Types ---
export type Layout = {
  radius: string;
  spacing: {
    padding: string;
    margin: string;
  };
  container: {
    base: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
    spacing: string;
    width: string;
    margin: string;
    minHeight: string;
    height: string;
    wrapper: string;
  };
  flex: {
    start: string;
    center: string;
    between: string;
    col: string;
    row: string;
    spacing: string;
    grow: string;
    justify: string;
    items: string;
    direction: string;
  };
  grid: {
    cols: string;
    gap: string;
    spacing: string;
  };
  row: {
    spacing: string;
  };
  column: {
    spacing: string;
  };
  stack: {
    vertical: string;
    horizontal: string;
  };
  size: {
    width: string;
    height: string;
  };
  alignment: {
    horizontal: string;
    vertical: string;
  };
};

// --- Breakpoints Types ---
export type Breakpoints = {
  sm: string;
  md: string;
  lg: string;
  xl: string;
  values: string;
  unit: string;
  step: string;
};

// --- Icons Types ---
export type Icons = {
  size: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  color: {
    primary: string;
    secondary: string;
    success: string;
    warning: string;
    error: string;
    info: string;
    contrast: string;
  };
  stroke: {
    thin: string;
    regular: string;
    bold: string;
  };
};

// --- Media Types ---
export type Media = {
  image: {
    fit: string;
    position: string;
    aspectRatio: string;
    radius: string;
  };
  video: string;
};

// --- Interactions Types ---
export type Interactions = {
  hover: string;
  focus: string;
  active: string;
  disabled: string;
  transition: {
    property: string;
    duration: string;
    timing: string;
  };
  transform: {
    scale: string;
    rotate: string;
    translate: string;
  };
  states: {
    hover: string;
    selected: string;
    pressed: string;
    focus: string;
    active: string;
    disabled: string;
  };
};

export type Scrollbar = {
  width: string;
  color: string;
  hover: string;
  radius: string;
  height: string;
  thumb: {
    background: string;
    radius: string;
    hover: string;
  };
  track: {
    background: string;
    radius: string;
  };
};

// --- Component Types ---
export type Button = {
  base: string;
  ring: string;
  gradient: string;
  radius: string;
  minWidth: string;
  variants: {
    primary: string;
    secondary: string;
    outline: string;
    danger: string;
    warning: string;
    ghost: string;
    link: string;
    info: string;
  };
  size: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  iconOnly: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  icon: {
    primary: string;
    secondary: string;
  };
  height: string;
  padding: string;
  fontSize: string;
  gap: string;
  border: string;
};

export type Input = {
  base: string;
  field: string;
  label: string;
  background: string;
  helper: string;
  states: {
    default: string;
    hover: string;
    focus: string;
    error: string;
    disabled: string;
    success: string;
  };
  height: string;
  padding: string;
  fontSize: string;
  radius: string;
  border: string;
  placeholder: string;
  color: string;
};

export type Textarea = {
  base: string;
  field: string;
  label: string;
  background: string;
  helper: string;
  states: {
    default: string;
    hover: string;
    focus: string;
    error: string;
    disabled: string;
    success: string;
  };
  height: string;
  padding: string;
  fontSize: string;
  radius: string;
  border: string;
  placeholder: string;
  color: string;
};

export type Card = {
  base: string;
  variants: {
    default: string;
    elevated: string;
    outlined: string;
    flat: string;
    transparent: string;
    gradient: string;
  };
  header: string;
  content: string;
  footer: string;
  padding: string;
  radius: string;
  border: string;
  background: string;
  shadow: string;
};

export type Select = {
  base: string;
  background: string;
  label: string;
  field: {
    base: string;
    placeholder: string;
  };
  dropdown: {
    base: string;
    option: {
      base: string;
      selected: string;
      hover: string;
    };
  };
  chips: {
    base: string;
    removeButton: string;
  };
};

export type Progressbar = {
  base: string;
  bar: string;
  size: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
  };
};

export type Checkbox = {
  base: string;
  border: {
    default: string;
    checked: string;
  };
  background: {
    default: string;
    checked: string;
  };
};

export type Switch = {
  base: string;
  handle: string;
  default: string;
  checked: string;
  label: string;
};

export type Modal = {
  overlay: string;
  container: string;
  header: string;
  content: string;
  footer: string;
  padding: string;
  radius: string;
  background: string;
  shadow: string;
};

export type Tooltip = {
  padding: string;
  radius: string;
  background: string;
  arrow: string;
  base: string;
};

export type DateTime = {
  container: string;
  header: string;
  navButton: string;
  title: string;
  weekday: string;
  calendarGrid: string;
  day: {
    base: string;
    default: string;
    today: string;
    selected: string;
    scheduled: string;
    disabled: string;
  };
  time: {
    wrapper: string;
    label: string;
    select: string;
  };
  scheduledNotice: string;
};

export type Badge = {
  base: string;
  variants: {
    primary: string;
    secondary: string;
    success: string;
    warning: string;
    error: string;
    info: string;
  };
  size: {
    xs: string;
    sm: string;
    md: string;
  };
};

export type Form = {
  layout: string;
  radius: string;
  fieldset: string;
  legend: string;
  label: string;
  helper: string;
  validation: {
    success: {
      color: string;
      border: string;
      background: string;
    };
    error: {
      color: string;
      border: string;
      background: string;
    };
    message: {
      fontSize: string;
      margin: string;
    };
  };
};

export type List = {
  base: string;
  types: {
    unordered: string;
    ordered: string;
  };
  item: string;
  styleType: {
    ordered: string;
    unordered: string;
  };
  spacing: string;
  indent: string;
};

export type Table = {
  wrapper: string;
  base: string;
  header: {
    cell: string;
    row: string;
  };
  body: {
    row: string;
    cell: string;
  };
  footer: {
    row: string;
    cell: string;
  };
  pagination: {
    wrapper: string;
    button: string;
    text: string;
  };
  border: string;
  cellPadding: string;
  stripes: {
    odd: string;
    even: string;
  };
};

export type Components = {
  button: Button;
  input: Input;
  textarea: Textarea;
  card: Card;
  select: Select;
  progressbar: Progressbar;
  checkbox: Checkbox;
  switch: Switch;
  modal: Modal;
  tooltip: Tooltip;
  badge: Badge;
  form: Form;
  list: List;
  table: Table;
  scrollbar: Scrollbar;
  datetime: DateTime;
};

export type Logo = {
  background: string;
  text: string;
};

export type Print = {
  pageBreak: string;
  color: {
    text: string;
    background: string;
  };
  margin: string;
  fontFamily: string;
};

// --- Complete Theme Type ---
export type Theme = {
  name: string;
  title: string;
  type: 'light' | 'dark';
  icon: string;
  logo: Logo;
  base: BaseTokens;
  mixins: Mixins;
  typography: Typography;
  layout: Layout;
  colors: ColorTypes;
  icons: Icons;
  breakpoints: Breakpoints;
  media: Media;
  interactions: Interactions;
  components: Components;
  border: string;
  print: Print;
};

export default Theme;
