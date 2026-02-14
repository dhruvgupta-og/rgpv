export interface Subject {
  id: string;
  name: string;
  code: string;
  branch: string;
  semester: number;
  syllabus: SyllabusUnit[];
  papers: Paper[];
}

export interface SyllabusUnit {
  unit: number;
  title: string;
  topics: string[];
}

export interface Paper {
  id: string;
  year: string;
  month: string;
  type: string;
}

export interface Branch {
  id: string;
  name: string;
  shortName: string;
  icon: string;
  iconFamily: string;
  color: string;
}

export const branches: Branch[] = [
  { id: 'cse', name: 'Computer Science & Engineering', shortName: 'CSE', icon: 'laptop', iconFamily: 'Feather', color: '#0EA5E9' },
  { id: 'ece', name: 'Electronics & Communication', shortName: 'ECE', icon: 'cpu', iconFamily: 'Feather', color: '#8B5CF6' },
  { id: 'me', name: 'Mechanical Engineering', shortName: 'ME', icon: 'settings', iconFamily: 'Feather', color: '#F59E0B' },
  { id: 'ee', name: 'Electrical Engineering', shortName: 'EE', icon: 'zap', iconFamily: 'Feather', color: '#EF4444' },
  { id: 'ce', name: 'Civil Engineering', shortName: 'CE', icon: 'home', iconFamily: 'Feather', color: '#10B981' },
  { id: 'it', name: 'Information Technology', shortName: 'IT', icon: 'globe', iconFamily: 'Feather', color: '#06B6D4' },
  { id: 'ei', name: 'Electronics & Instrumentation', shortName: 'EI', icon: 'activity', iconFamily: 'Feather', color: '#EC4899' },
  { id: 'ch', name: 'Chemical Engineering', shortName: 'CH', icon: 'droplet', iconFamily: 'Feather', color: '#14B8A6' },
];

const cseSubjects: Subject[] = [
  {
    id: 'cse-3-ds',
    name: 'Data Structures',
    code: 'CS-304',
    branch: 'cse',
    semester: 3,
    syllabus: [
      { unit: 1, title: 'Introduction & Arrays', topics: ['Algorithms', 'Time & Space Complexity', 'Arrays', 'Sparse Matrix', 'Polynomials'] },
      { unit: 2, title: 'Stacks & Queues', topics: ['Stack Operations', 'Polish Notation', 'Infix to Postfix', 'Queue', 'Circular Queue', 'Deque', 'Priority Queue'] },
      { unit: 3, title: 'Linked Lists', topics: ['Singly Linked List', 'Doubly Linked List', 'Circular Linked List', 'Polynomial Addition', 'Garbage Collection'] },
      { unit: 4, title: 'Trees', topics: ['Binary Trees', 'Tree Traversals', 'BST', 'AVL Trees', 'B-Trees', 'Heap', 'Huffman Coding'] },
      { unit: 5, title: 'Graphs & Sorting', topics: ['Graph Representations', 'BFS', 'DFS', 'Minimum Spanning Tree', 'Shortest Path', 'Bubble Sort', 'Quick Sort', 'Merge Sort', 'Hashing'] },
    ],
    papers: [
      { id: 'ds-2024-dec', year: '2024', month: 'Dec', type: 'Main' },
      { id: 'ds-2024-jun', year: '2024', month: 'Jun', type: 'Supply' },
      { id: 'ds-2023-dec', year: '2023', month: 'Dec', type: 'Main' },
      { id: 'ds-2023-jun', year: '2023', month: 'Jun', type: 'Supply' },
      { id: 'ds-2022-dec', year: '2022', month: 'Dec', type: 'Main' },
    ],
  },
  {
    id: 'cse-3-dm',
    name: 'Discrete Mathematics',
    code: 'CS-303',
    branch: 'cse',
    semester: 3,
    syllabus: [
      { unit: 1, title: 'Set Theory & Relations', topics: ['Sets', 'Operations on Sets', 'Relations', 'Equivalence Relations', 'Partial Order'] },
      { unit: 2, title: 'Functions & Propositional Logic', topics: ['Functions', 'Composition', 'Inverse', 'Propositional Logic', 'Truth Tables', 'Tautology'] },
      { unit: 3, title: 'Predicate Logic', topics: ['Quantifiers', 'Inference Theory', 'Proof Methods', 'Mathematical Induction'] },
      { unit: 4, title: 'Graph Theory', topics: ['Graphs', 'Paths', 'Circuits', 'Euler Graph', 'Hamiltonian Graph', 'Planar Graphs', 'Graph Coloring'] },
      { unit: 5, title: 'Algebraic Structures', topics: ['Groups', 'Subgroups', 'Rings', 'Fields', 'Lattices', 'Boolean Algebra'] },
    ],
    papers: [
      { id: 'dm-2024-dec', year: '2024', month: 'Dec', type: 'Main' },
      { id: 'dm-2023-dec', year: '2023', month: 'Dec', type: 'Main' },
      { id: 'dm-2023-jun', year: '2023', month: 'Jun', type: 'Supply' },
      { id: 'dm-2022-dec', year: '2022', month: 'Dec', type: 'Main' },
    ],
  },
  {
    id: 'cse-3-oop',
    name: 'Object Oriented Programming',
    code: 'CS-305',
    branch: 'cse',
    semester: 3,
    syllabus: [
      { unit: 1, title: 'Introduction to OOP', topics: ['OOP Concepts', 'Classes & Objects', 'Constructors', 'Destructors', 'Encapsulation'] },
      { unit: 2, title: 'Inheritance & Polymorphism', topics: ['Single Inheritance', 'Multiple Inheritance', 'Virtual Functions', 'Operator Overloading', 'Function Overloading'] },
      { unit: 3, title: 'Templates & Exception Handling', topics: ['Function Templates', 'Class Templates', 'Exception Handling', 'Try-Catch', 'Throw'] },
      { unit: 4, title: 'File Handling & Streams', topics: ['File I/O', 'Stream Classes', 'File Pointers', 'Random Access'] },
      { unit: 5, title: 'STL & Advanced Topics', topics: ['Containers', 'Iterators', 'Algorithms', 'Namespaces', 'RTTI'] },
    ],
    papers: [
      { id: 'oop-2024-dec', year: '2024', month: 'Dec', type: 'Main' },
      { id: 'oop-2024-jun', year: '2024', month: 'Jun', type: 'Supply' },
      { id: 'oop-2023-dec', year: '2023', month: 'Dec', type: 'Main' },
    ],
  },
  {
    id: 'cse-4-daa',
    name: 'Design & Analysis of Algorithms',
    code: 'CS-404',
    branch: 'cse',
    semester: 4,
    syllabus: [
      { unit: 1, title: 'Algorithm Analysis', topics: ['Asymptotic Notations', 'Recurrence Relations', 'Master Theorem', 'Amortized Analysis'] },
      { unit: 2, title: 'Divide & Conquer', topics: ['Binary Search', 'Merge Sort', 'Quick Sort', 'Strassen Matrix Multiplication', 'Max-Min Problem'] },
      { unit: 3, title: 'Greedy Algorithms', topics: ['Fractional Knapsack', 'Job Sequencing', 'Huffman Coding', 'Minimum Spanning Tree', 'Dijkstra'] },
      { unit: 4, title: 'Dynamic Programming', topics: ['0/1 Knapsack', 'LCS', 'Matrix Chain Multiplication', 'Floyd-Warshall', 'Bellman-Ford'] },
      { unit: 5, title: 'Backtracking & NP', topics: ['N-Queens', 'Graph Coloring', 'Hamiltonian Circuit', 'NP-Hard', 'NP-Complete', 'Approximation Algorithms'] },
    ],
    papers: [
      { id: 'daa-2024-dec', year: '2024', month: 'Dec', type: 'Main' },
      { id: 'daa-2024-jun', year: '2024', month: 'Jun', type: 'Supply' },
      { id: 'daa-2023-dec', year: '2023', month: 'Dec', type: 'Main' },
      { id: 'daa-2022-dec', year: '2022', month: 'Dec', type: 'Main' },
    ],
  },
  {
    id: 'cse-4-os',
    name: 'Operating Systems',
    code: 'CS-405',
    branch: 'cse',
    semester: 4,
    syllabus: [
      { unit: 1, title: 'Introduction to OS', topics: ['OS Types', 'System Calls', 'OS Structure', 'Virtual Machines'] },
      { unit: 2, title: 'Process Management', topics: ['Process States', 'Threads', 'CPU Scheduling', 'FCFS', 'SJF', 'Round Robin', 'Priority Scheduling'] },
      { unit: 3, title: 'Synchronization & Deadlock', topics: ['Critical Section', 'Semaphores', 'Monitors', 'Deadlock Prevention', 'Detection', 'Recovery', 'Banker\'s Algorithm'] },
      { unit: 4, title: 'Memory Management', topics: ['Paging', 'Segmentation', 'Virtual Memory', 'Page Replacement', 'Thrashing'] },
      { unit: 5, title: 'File & I/O Systems', topics: ['File System', 'Directory Structure', 'Allocation Methods', 'Disk Scheduling', 'RAID'] },
    ],
    papers: [
      { id: 'os-2024-dec', year: '2024', month: 'Dec', type: 'Main' },
      { id: 'os-2023-dec', year: '2023', month: 'Dec', type: 'Main' },
      { id: 'os-2023-jun', year: '2023', month: 'Jun', type: 'Supply' },
    ],
  },
  {
    id: 'cse-4-dbms',
    name: 'Database Management Systems',
    code: 'CS-403',
    branch: 'cse',
    semester: 4,
    syllabus: [
      { unit: 1, title: 'Introduction & ER Model', topics: ['DBMS Architecture', 'Data Models', 'ER Model', 'Keys', 'Generalization', 'Specialization'] },
      { unit: 2, title: 'Relational Model & SQL', topics: ['Relational Algebra', 'Tuple Calculus', 'SQL Queries', 'Joins', 'Subqueries', 'Views'] },
      { unit: 3, title: 'Normalization', topics: ['Functional Dependencies', '1NF', '2NF', '3NF', 'BCNF', 'Multivalued Dependencies', '4NF', '5NF'] },
      { unit: 4, title: 'Transaction Management', topics: ['ACID Properties', 'Serializability', 'Concurrency Control', 'Two Phase Locking', 'Timestamp Ordering'] },
      { unit: 5, title: 'File Organization & Indexing', topics: ['File Organization', 'B-Tree', 'B+ Tree', 'Hashing', 'Recovery Techniques'] },
    ],
    papers: [
      { id: 'dbms-2024-dec', year: '2024', month: 'Dec', type: 'Main' },
      { id: 'dbms-2024-jun', year: '2024', month: 'Jun', type: 'Supply' },
      { id: 'dbms-2023-dec', year: '2023', month: 'Dec', type: 'Main' },
      { id: 'dbms-2022-dec', year: '2022', month: 'Dec', type: 'Main' },
    ],
  },
  {
    id: 'cse-5-cn',
    name: 'Computer Networks',
    code: 'CS-501',
    branch: 'cse',
    semester: 5,
    syllabus: [
      { unit: 1, title: 'Introduction & Physical Layer', topics: ['Network Types', 'OSI Model', 'TCP/IP Model', 'Transmission Media', 'Multiplexing'] },
      { unit: 2, title: 'Data Link Layer', topics: ['Framing', 'Error Detection', 'CRC', 'Flow Control', 'Sliding Window', 'MAC Protocols', 'Ethernet'] },
      { unit: 3, title: 'Network Layer', topics: ['IP Addressing', 'Subnetting', 'Routing Algorithms', 'OSPF', 'BGP', 'IPv6'] },
      { unit: 4, title: 'Transport Layer', topics: ['TCP', 'UDP', 'Congestion Control', 'Flow Control', 'Connection Management'] },
      { unit: 5, title: 'Application Layer', topics: ['DNS', 'HTTP', 'FTP', 'SMTP', 'Network Security', 'Firewalls', 'Cryptography'] },
    ],
    papers: [
      { id: 'cn-2024-dec', year: '2024', month: 'Dec', type: 'Main' },
      { id: 'cn-2023-dec', year: '2023', month: 'Dec', type: 'Main' },
      { id: 'cn-2023-jun', year: '2023', month: 'Jun', type: 'Supply' },
    ],
  },
  {
    id: 'cse-5-se',
    name: 'Software Engineering',
    code: 'CS-504',
    branch: 'cse',
    semester: 5,
    syllabus: [
      { unit: 1, title: 'Introduction to SE', topics: ['Software Processes', 'SDLC Models', 'Waterfall', 'Agile', 'Spiral Model'] },
      { unit: 2, title: 'Requirements Engineering', topics: ['Requirements Gathering', 'SRS', 'Use Cases', 'DFD', 'ER Diagrams'] },
      { unit: 3, title: 'Software Design', topics: ['Design Principles', 'Coupling', 'Cohesion', 'Architectural Styles', 'UML Diagrams'] },
      { unit: 4, title: 'Testing', topics: ['Testing Types', 'Black Box', 'White Box', 'Unit Testing', 'Integration Testing', 'Regression Testing'] },
      { unit: 5, title: 'Project Management', topics: ['Project Planning', 'Estimation', 'COCOMO', 'Risk Management', 'Configuration Management'] },
    ],
    papers: [
      { id: 'se-2024-dec', year: '2024', month: 'Dec', type: 'Main' },
      { id: 'se-2023-dec', year: '2023', month: 'Dec', type: 'Main' },
    ],
  },
  {
    id: 'cse-6-cd',
    name: 'Compiler Design',
    code: 'CS-602',
    branch: 'cse',
    semester: 6,
    syllabus: [
      { unit: 1, title: 'Lexical Analysis', topics: ['Compiler Phases', 'Regular Expressions', 'Finite Automata', 'LEX Tool'] },
      { unit: 2, title: 'Syntax Analysis', topics: ['Context Free Grammars', 'Top-Down Parsing', 'LL(1)', 'Bottom-Up Parsing', 'LR Parsing', 'YACC'] },
      { unit: 3, title: 'Semantic Analysis', topics: ['Syntax Directed Translation', 'Type Checking', 'Symbol Table', 'Attribute Grammar'] },
      { unit: 4, title: 'Intermediate Code Generation', topics: ['Three Address Code', 'Quadruples', 'Triples', 'DAG'] },
      { unit: 5, title: 'Code Optimization & Generation', topics: ['Local Optimization', 'Global Optimization', 'Loop Optimization', 'Register Allocation', 'Code Generation'] },
    ],
    papers: [
      { id: 'cd-2024-dec', year: '2024', month: 'Dec', type: 'Main' },
      { id: 'cd-2023-dec', year: '2023', month: 'Dec', type: 'Main' },
      { id: 'cd-2023-jun', year: '2023', month: 'Jun', type: 'Supply' },
    ],
  },
  {
    id: 'cse-6-ai',
    name: 'Artificial Intelligence',
    code: 'CS-601',
    branch: 'cse',
    semester: 6,
    syllabus: [
      { unit: 1, title: 'Introduction to AI', topics: ['AI History', 'Intelligent Agents', 'Problem Solving', 'State Space Search'] },
      { unit: 2, title: 'Search Algorithms', topics: ['Uninformed Search', 'BFS', 'DFS', 'Informed Search', 'A*', 'Heuristic Functions'] },
      { unit: 3, title: 'Knowledge Representation', topics: ['Propositional Logic', 'First Order Logic', 'Inference', 'Unification', 'Resolution'] },
      { unit: 4, title: 'Machine Learning Basics', topics: ['Supervised Learning', 'Decision Trees', 'Neural Networks', 'Unsupervised Learning'] },
      { unit: 5, title: 'Expert Systems & NLP', topics: ['Expert System Architecture', 'Fuzzy Logic', 'NLP Basics', 'Robotics Introduction'] },
    ],
    papers: [
      { id: 'ai-2024-dec', year: '2024', month: 'Dec', type: 'Main' },
      { id: 'ai-2023-dec', year: '2023', month: 'Dec', type: 'Main' },
    ],
  },
  {
    id: 'cse-7-ml',
    name: 'Machine Learning',
    code: 'CS-701',
    branch: 'cse',
    semester: 7,
    syllabus: [
      { unit: 1, title: 'Introduction', topics: ['ML Types', 'Supervised vs Unsupervised', 'Bias-Variance Tradeoff', 'Cross Validation'] },
      { unit: 2, title: 'Regression & Classification', topics: ['Linear Regression', 'Logistic Regression', 'SVM', 'KNN', 'Naive Bayes'] },
      { unit: 3, title: 'Decision Trees & Ensembles', topics: ['Decision Trees', 'Random Forest', 'Bagging', 'Boosting', 'AdaBoost'] },
      { unit: 4, title: 'Neural Networks', topics: ['Perceptron', 'MLP', 'Backpropagation', 'CNN', 'RNN', 'Activation Functions'] },
      { unit: 5, title: 'Clustering & Dimensionality', topics: ['K-Means', 'Hierarchical Clustering', 'PCA', 'LDA', 'Reinforcement Learning'] },
    ],
    papers: [
      { id: 'ml-2024-dec', year: '2024', month: 'Dec', type: 'Main' },
      { id: 'ml-2023-dec', year: '2023', month: 'Dec', type: 'Main' },
    ],
  },
];

const eceSubjects: Subject[] = [
  {
    id: 'ece-3-ss',
    name: 'Signals & Systems',
    code: 'EC-301',
    branch: 'ece',
    semester: 3,
    syllabus: [
      { unit: 1, title: 'Signal Classification', topics: ['Continuous & Discrete Signals', 'Signal Operations', 'Elementary Signals', 'System Properties'] },
      { unit: 2, title: 'LTI Systems', topics: ['Convolution', 'Impulse Response', 'System Properties', 'Differential Equations'] },
      { unit: 3, title: 'Fourier Analysis', topics: ['Fourier Series', 'Fourier Transform', 'Properties', 'Parseval\'s Theorem'] },
      { unit: 4, title: 'Laplace Transform', topics: ['ROC', 'Properties', 'Inverse Laplace', 'System Analysis'] },
      { unit: 5, title: 'Z-Transform', topics: ['Z-Transform', 'ROC', 'Inverse Z-Transform', 'Discrete System Analysis'] },
    ],
    papers: [
      { id: 'ss-2024-dec', year: '2024', month: 'Dec', type: 'Main' },
      { id: 'ss-2023-dec', year: '2023', month: 'Dec', type: 'Main' },
      { id: 'ss-2023-jun', year: '2023', month: 'Jun', type: 'Supply' },
    ],
  },
  {
    id: 'ece-3-an',
    name: 'Analog Electronics',
    code: 'EC-302',
    branch: 'ece',
    semester: 3,
    syllabus: [
      { unit: 1, title: 'Diode Circuits', topics: ['PN Junction', 'Diode Applications', 'Rectifiers', 'Clippers', 'Clampers'] },
      { unit: 2, title: 'BJT Amplifiers', topics: ['BJT Biasing', 'Small Signal Analysis', 'CE', 'CB', 'CC Configurations'] },
      { unit: 3, title: 'FET Amplifiers', topics: ['JFET', 'MOSFET', 'Biasing', 'Small Signal Models'] },
      { unit: 4, title: 'Operational Amplifiers', topics: ['Ideal Op-Amp', 'Inverting', 'Non-Inverting', 'Integrator', 'Differentiator'] },
      { unit: 5, title: 'Feedback & Oscillators', topics: ['Feedback Types', 'Barkhausen Criterion', 'RC Oscillators', 'LC Oscillators'] },
    ],
    papers: [
      { id: 'an-2024-dec', year: '2024', month: 'Dec', type: 'Main' },
      { id: 'an-2023-dec', year: '2023', month: 'Dec', type: 'Main' },
    ],
  },
  {
    id: 'ece-4-dc',
    name: 'Digital Communication',
    code: 'EC-401',
    branch: 'ece',
    semester: 4,
    syllabus: [
      { unit: 1, title: 'Sampling & Quantization', topics: ['Sampling Theorem', 'Aliasing', 'Quantization', 'PCM', 'DPCM'] },
      { unit: 2, title: 'Digital Modulation', topics: ['ASK', 'FSK', 'PSK', 'QAM', 'QPSK', 'MSK'] },
      { unit: 3, title: 'Error Control Coding', topics: ['Hamming Code', 'CRC', 'Convolutional Codes', 'Viterbi Decoding'] },
      { unit: 4, title: 'Spread Spectrum', topics: ['DSSS', 'FHSS', 'CDMA', 'PN Sequences'] },
      { unit: 5, title: 'Information Theory', topics: ['Entropy', 'Channel Capacity', 'Shannon Theorem', 'Source Coding'] },
    ],
    papers: [
      { id: 'dc-2024-dec', year: '2024', month: 'Dec', type: 'Main' },
      { id: 'dc-2023-dec', year: '2023', month: 'Dec', type: 'Main' },
    ],
  },
  {
    id: 'ece-5-dsp',
    name: 'Digital Signal Processing',
    code: 'EC-501',
    branch: 'ece',
    semester: 5,
    syllabus: [
      { unit: 1, title: 'Discrete Fourier Transform', topics: ['DFT Properties', 'Circular Convolution', 'FFT Algorithms'] },
      { unit: 2, title: 'FIR Filter Design', topics: ['Window Method', 'Kaiser Window', 'Frequency Sampling', 'Parks-McClellan'] },
      { unit: 3, title: 'IIR Filter Design', topics: ['Butterworth', 'Chebyshev', 'Bilinear Transform', 'Impulse Invariance'] },
      { unit: 4, title: 'Multi-rate DSP', topics: ['Decimation', 'Interpolation', 'Polyphase Structures'] },
      { unit: 5, title: 'DSP Applications', topics: ['Speech Processing', 'Image Processing', 'Adaptive Filters', 'DSP Processors'] },
    ],
    papers: [
      { id: 'dsp-2024-dec', year: '2024', month: 'Dec', type: 'Main' },
      { id: 'dsp-2023-dec', year: '2023', month: 'Dec', type: 'Main' },
    ],
  },
];

const meSubjects: Subject[] = [
  {
    id: 'me-3-tom',
    name: 'Theory of Machines',
    code: 'ME-301',
    branch: 'me',
    semester: 3,
    syllabus: [
      { unit: 1, title: 'Mechanisms', topics: ['Kinematic Pairs', 'Kinematic Chains', 'Grashof Law', 'Inversions', 'Mechanisms'] },
      { unit: 2, title: 'Velocity & Acceleration', topics: ['Relative Velocity', 'Instantaneous Centre', 'Klein Construction', 'Coriolis Component'] },
      { unit: 3, title: 'Gears', topics: ['Gear Terminology', 'Law of Gearing', 'Involute Profile', 'Gear Trains', 'Epicyclic Gear Train'] },
      { unit: 4, title: 'Cams', topics: ['Cam Types', 'Follower Types', 'Cam Profiles', 'SHM', 'Uniform Acceleration'] },
      { unit: 5, title: 'Gyroscope & Governors', topics: ['Gyroscopic Couple', 'Stability', 'Governor Types', 'Hunting', 'Isochronism'] },
    ],
    papers: [
      { id: 'tom-2024-dec', year: '2024', month: 'Dec', type: 'Main' },
      { id: 'tom-2023-dec', year: '2023', month: 'Dec', type: 'Main' },
    ],
  },
  {
    id: 'me-3-td',
    name: 'Thermodynamics',
    code: 'ME-302',
    branch: 'me',
    semester: 3,
    syllabus: [
      { unit: 1, title: 'Basic Concepts', topics: ['System & Surroundings', 'Properties', 'Zeroth Law', 'Work & Heat'] },
      { unit: 2, title: 'First Law', topics: ['First Law for Closed Systems', 'Open Systems', 'SFEE', 'PMM-1'] },
      { unit: 3, title: 'Second Law', topics: ['Kelvin-Planck Statement', 'Clausius Statement', 'Carnot Cycle', 'Entropy'] },
      { unit: 4, title: 'Availability & Properties', topics: ['Available Energy', 'Irreversibility', 'Maxwell Relations', 'Clausius-Clapeyron'] },
      { unit: 5, title: 'Power & Refrigeration Cycles', topics: ['Rankine Cycle', 'Otto Cycle', 'Diesel Cycle', 'Vapour Compression', 'Gas Refrigeration'] },
    ],
    papers: [
      { id: 'td-2024-dec', year: '2024', month: 'Dec', type: 'Main' },
      { id: 'td-2023-dec', year: '2023', month: 'Dec', type: 'Main' },
      { id: 'td-2023-jun', year: '2023', month: 'Jun', type: 'Supply' },
    ],
  },
  {
    id: 'me-4-fm',
    name: 'Fluid Mechanics',
    code: 'ME-401',
    branch: 'me',
    semester: 4,
    syllabus: [
      { unit: 1, title: 'Fluid Properties', topics: ['Fluid Types', 'Viscosity', 'Surface Tension', 'Capillarity', 'Compressibility'] },
      { unit: 2, title: 'Fluid Statics', topics: ['Pascal Law', 'Hydrostatic Force', 'Buoyancy', 'Stability of Floating Bodies'] },
      { unit: 3, title: 'Fluid Kinematics', topics: ['Streamlines', 'Pathlines', 'Velocity Potential', 'Stream Function', 'Vorticity'] },
      { unit: 4, title: 'Fluid Dynamics', topics: ['Euler Equation', 'Bernoulli Equation', 'Momentum Equation', 'Applications'] },
      { unit: 5, title: 'Pipe Flow', topics: ['Laminar Flow', 'Turbulent Flow', 'Darcy Equation', 'Moody Diagram', 'Pipe Networks'] },
    ],
    papers: [
      { id: 'fm-2024-dec', year: '2024', month: 'Dec', type: 'Main' },
      { id: 'fm-2023-dec', year: '2023', month: 'Dec', type: 'Main' },
    ],
  },
];

const eeSubjects: Subject[] = [
  {
    id: 'ee-3-em',
    name: 'Electrical Machines - I',
    code: 'EE-301',
    branch: 'ee',
    semester: 3,
    syllabus: [
      { unit: 1, title: 'DC Generators', topics: ['Construction', 'EMF Equation', 'Characteristics', 'Losses', 'Efficiency'] },
      { unit: 2, title: 'DC Motors', topics: ['Working Principle', 'Types', 'Speed Control', 'Testing', 'Applications'] },
      { unit: 3, title: 'Transformers', topics: ['Construction', 'EMF Equation', 'Equivalent Circuit', 'Regulation', 'Efficiency'] },
      { unit: 4, title: 'Three Phase Transformers', topics: ['Connections', 'Parallel Operation', 'Auto Transformer', 'Tap Changing'] },
      { unit: 5, title: 'Special Machines', topics: ['Stepper Motors', 'Servo Motors', 'Universal Motors', 'Reluctance Motors'] },
    ],
    papers: [
      { id: 'em-2024-dec', year: '2024', month: 'Dec', type: 'Main' },
      { id: 'em-2023-dec', year: '2023', month: 'Dec', type: 'Main' },
    ],
  },
  {
    id: 'ee-4-pe',
    name: 'Power Electronics',
    code: 'EE-401',
    branch: 'ee',
    semester: 4,
    syllabus: [
      { unit: 1, title: 'Power Semiconductor Devices', topics: ['SCR', 'TRIAC', 'MOSFET', 'IGBT', 'GTO', 'Characteristics'] },
      { unit: 2, title: 'Rectifiers', topics: ['Single Phase Rectifiers', 'Three Phase Rectifiers', 'Filters', 'Power Factor'] },
      { unit: 3, title: 'Choppers', topics: ['Step-down Chopper', 'Step-up Chopper', 'Buck-Boost', 'Control Strategies'] },
      { unit: 4, title: 'Inverters', topics: ['Single Phase Inverter', 'Three Phase Inverter', 'PWM Techniques', 'Harmonic Reduction'] },
      { unit: 5, title: 'AC Voltage Controllers', topics: ['Single Phase Controller', 'Three Phase Controller', 'Cycloconverter', 'Applications'] },
    ],
    papers: [
      { id: 'pe-2024-dec', year: '2024', month: 'Dec', type: 'Main' },
      { id: 'pe-2023-dec', year: '2023', month: 'Dec', type: 'Main' },
    ],
  },
];

const ceSubjects: Subject[] = [
  {
    id: 'ce-3-sm',
    name: 'Strength of Materials',
    code: 'CE-301',
    branch: 'ce',
    semester: 3,
    syllabus: [
      { unit: 1, title: 'Stress & Strain', topics: ['Simple Stress', 'Strain', 'Hooke\'s Law', 'Elastic Constants', 'Poisson\'s Ratio'] },
      { unit: 2, title: 'Shear Force & Bending Moment', topics: ['SF & BM Diagrams', 'Cantilever', 'Simply Supported', 'Overhanging Beams'] },
      { unit: 3, title: 'Bending & Shear Stresses', topics: ['Theory of Bending', 'Section Modulus', 'Shear Stress Distribution'] },
      { unit: 4, title: 'Torsion', topics: ['Torsion of Circular Shafts', 'Power Transmission', 'Combined Bending & Torsion'] },
      { unit: 5, title: 'Deflection & Columns', topics: ['Double Integration', 'Macaulay Method', 'Euler Theory', 'Rankine Formula'] },
    ],
    papers: [
      { id: 'sm-2024-dec', year: '2024', month: 'Dec', type: 'Main' },
      { id: 'sm-2023-dec', year: '2023', month: 'Dec', type: 'Main' },
    ],
  },
];

const itSubjects: Subject[] = [
  {
    id: 'it-3-ds',
    name: 'Data Structures',
    code: 'IT-303',
    branch: 'it',
    semester: 3,
    syllabus: [
      { unit: 1, title: 'Arrays & Strings', topics: ['Array Operations', 'Multi-dimensional Arrays', 'String Processing', 'Pattern Matching'] },
      { unit: 2, title: 'Stacks & Queues', topics: ['Stack Applications', 'Expression Evaluation', 'Queue Types', 'Priority Queue'] },
      { unit: 3, title: 'Linked Lists', topics: ['Types of Linked Lists', 'Operations', 'Applications', 'Memory Management'] },
      { unit: 4, title: 'Trees', topics: ['Binary Trees', 'BST', 'AVL Trees', 'Heap', 'Tree Traversals'] },
      { unit: 5, title: 'Graphs', topics: ['Graph Representations', 'Traversals', 'Shortest Path', 'MST', 'Sorting Algorithms'] },
    ],
    papers: [
      { id: 'it-ds-2024-dec', year: '2024', month: 'Dec', type: 'Main' },
      { id: 'it-ds-2023-dec', year: '2023', month: 'Dec', type: 'Main' },
    ],
  },
  {
    id: 'it-4-wt',
    name: 'Web Technology',
    code: 'IT-402',
    branch: 'it',
    semester: 4,
    syllabus: [
      { unit: 1, title: 'HTML & CSS', topics: ['HTML5 Elements', 'Forms', 'CSS3', 'Responsive Design', 'Media Queries'] },
      { unit: 2, title: 'JavaScript', topics: ['DOM Manipulation', 'Events', 'AJAX', 'jQuery', 'ES6 Features'] },
      { unit: 3, title: 'Server-side Programming', topics: ['PHP', 'Node.js', 'Express', 'RESTful APIs'] },
      { unit: 4, title: 'Databases for Web', topics: ['MySQL', 'MongoDB', 'CRUD Operations', 'Session Management'] },
      { unit: 5, title: 'Web Frameworks', topics: ['React', 'Angular', 'MVC Pattern', 'Web Security', 'Authentication'] },
    ],
    papers: [
      { id: 'wt-2024-dec', year: '2024', month: 'Dec', type: 'Main' },
      { id: 'wt-2023-dec', year: '2023', month: 'Dec', type: 'Main' },
    ],
  },
];

export const allSubjects: Subject[] = [
  ...cseSubjects,
  ...eceSubjects,
  ...meSubjects,
  ...eeSubjects,
  ...ceSubjects,
  ...itSubjects,
];

export function getSubjectsByBranchAndSemester(branchId: string, semester: number): Subject[] {
  return allSubjects.filter(s => s.branch === branchId && s.semester === semester);
}

export function getAvailableSemesters(branchId: string): number[] {
  const semesters = new Set(allSubjects.filter(s => s.branch === branchId).map(s => s.semester));
  return Array.from(semesters).sort((a, b) => a - b);
}

export function searchSubjects(query: string): Subject[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  return allSubjects.filter(s =>
    s.name.toLowerCase().includes(q) ||
    s.code.toLowerCase().includes(q) ||
    s.branch.toLowerCase().includes(q)
  );
}

export function getSubjectById(id: string): Subject | undefined {
  return allSubjects.find(s => s.id === id);
}

export function getBranchById(id: string): Branch | undefined {
  return branches.find(b => b.id === id);
}
