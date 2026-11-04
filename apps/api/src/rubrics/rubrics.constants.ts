export const DEFAULT_SEED_RUBRIC = {
  name: 'Core Software Engineering Rubric',
  criteria: [
    {
      name: 'Problem Solving',
      description: 'Ability to comprehend, decompose, and formulate an algorithmic solution.',
      weight: 1.0,
      levelDescriptors: {
        '1': 'Struggled to understand the problem; unable to make progress even with hints.',
        '2': 'Understood the problem with assistance; developed a suboptimal or brute force approach.',
        '3': 'Quickly identified workable solution with minor hints; addressed main edge cases.',
        '4': 'Optimal approach quickly identified; proactive clarification and edge case handling.',
      },
    },
    {
      name: 'Code Quality & Correctness',
      description: 'Cleanliness, structure, idiomatic usage, naming, and handling edge conditions.',
      weight: 1.0,
      levelDescriptors: {
        '1': 'Disorganized code, syntax confusion, unhandled basic edge cases.',
        '2': 'Working code but messy structure; poor naming or excessive duplication.',
        '3': 'Clean, modular, and readable; uses language idioms correctly.',
        '4': 'Production-grade code; thoroughly structured, robust typing, and zero redundancies.',
      },
    },
    {
      name: 'Communication & Collaboration',
      description: 'Thinking out loud, taking feedback, explaining tradeoffs clearly.',
      weight: 1.0,
      levelDescriptors: {
        '1': 'Silent during coding, defensive or resistant to feedback and hints.',
        '2': 'Explains thoughts only when prompted; passive receiver of interviewer hints.',
        '3': 'Clear verbalization of thought process; incorporates feedback constructively.',
        '4': 'Exemplary communicator; proactive discussion of tradeoffs and collaborative problem-solving.',
      },
    },
    {
      name: 'System & Algorithmic Efficiency',
      description: 'Time and space complexity analysis, scalability tradeoffs.',
      weight: 1.0,
      levelDescriptors: {
        '1': 'Unable to identify time or space complexity; ignores performance implications.',
        '2': 'Identifies complexity after heavy guidance; limited intuition on optimizations.',
        '3': 'Accurate Big-O analysis of time and space; understands basic tradeoffs.',
        '4': 'Deep analysis of algorithmic tradeoffs, memory locality, and hardware/system bottlenecks.',
      },
    },
  ],
};
