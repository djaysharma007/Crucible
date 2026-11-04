import { CreateQuestionInput } from '@crucible/shared';

export const SEED_QUESTIONS: CreateQuestionInput[] = [
  {
    title: 'Two Sum',
    descriptionMd: `Given an array of integers \`nums\` and an integer \`target\`, return *indices of the two numbers such that they add up to \`target\`*.

You may assume that each input would have ***exactly one solution***, and you may not use the *same* element twice.

You can return the answer in any order.

### Example 1:
\`\`\`
Input: nums = [2,7,11,15], target = 9
Output: [0,1]
Explanation: Because nums[0] + nums[1] == 9, we return [0, 1].
\`\`\`

### Example 2:
\`\`\`
Input: nums = [3,2,4], target = 6
Output: [1,2]
\`\`\`

### Constraints:
- \`2 <= nums.length <= 10^4\`
- \`-10^9 <= nums[i] <= 10^9\`
- \`-10^9 <= target <= 10^9\`
- **Only one valid answer exists.**`,
    difficulty: 'easy',
    tags: ['array', 'hash-table'],
    languages: [
      {
        language: 'typescript',
        starterCode: `function twoSum(nums: number[], target: number): number[] {
  // Your code here
  const map = new Map<number, number>();
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (map.has(complement)) {
      return [map.get(complement)!, i];
    }
    map.set(nums[i], i);
  }
  return [];
}

const fs = require('fs');
const lines = fs.readFileSync(0, 'utf-8').trim().split('\\n');
if (lines.length >= 2) {
  const nums = JSON.parse(lines[0]);
  const target = parseInt(lines[1], 10);
  console.log(JSON.stringify(twoSum(nums, target)));
}
`,
      },
      {
        language: 'javascript',
        starterCode: `function twoSum(nums, target) {
  // Your code here
  const map = new Map();
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (map.has(complement)) {
      return [map.get(complement), i];
    }
    map.set(nums[i], i);
  }
  return [];
}

const fs = require('fs');
const lines = fs.readFileSync(0, 'utf-8').trim().split('\\n');
if (lines.length >= 2) {
  const nums = JSON.parse(lines[0]);
  const target = parseInt(lines[1], 10);
  console.log(JSON.stringify(twoSum(nums, target)));
}
`,
      },
      {
        language: 'python',
        starterCode: `import sys
import json

def two_sum(nums: list[int], target: int) -> list[int]:
    # Your code here
    seen = {}
    for i, num in enumerate(nums):
        complement = target - num
        if complement in seen:
            return [seen[complement], i]
        seen[num] = i
    return []

if __name__ == '__main__':
    lines = sys.stdin.read().strip().split('\\n')
    if len(lines) >= 2:
        nums = json.loads(lines[0])
        target = int(lines[1])
        print(json.dumps(two_sum(nums, target)))
`,
      },
      {
        language: 'java',
        starterCode: `import java.util.*;

public class Main {
    public static int[] twoSum(int[] nums, int target) {
        Map<Integer, Integer> map = new HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            int complement = target - nums[i];
            if (map.containsKey(complement)) {
                return new int[] { map.get(complement), i };
            }
            map.put(nums[i], i);
        }
        return new int[0];
    }

    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        if (scanner.hasNextLine()) {
            String line1 = scanner.nextLine().trim();
            line1 = line1.substring(1, line1.length() - 1);
            String[] parts = line1.split(",");
            int[] nums = new int[parts.length];
            for (int i = 0; i < parts.length; i++) {
                nums[i] = Integer.parseInt(parts[i].trim());
            }
            int target = scanner.nextInt();
            int[] result = twoSum(nums, target);
            System.out.printf("[%d,%d]%n", result[0], result[1]);
        }
    }
}
`,
      },
      {
        language: 'cpp',
        starterCode: `#include <iostream>
#include <vector>
#include <unordered_map>
#include <string>
#include <sstream>

using namespace std;

vector<int> twoSum(vector<int>& nums, int target) {
    unordered_map<int, int> seen;
    for (int i = 0; i < nums.size(); i++) {
        int comp = target - nums[i];
        if (seen.count(comp)) {
            return {seen[comp], i};
        }
        seen[nums[i]] = i;
    }
    return {};
}

int main() {
    string line;
    if (getline(cin, line)) {
        line = line.substr(1, line.size() - 2);
        stringstream ss(line);
        string item;
        vector<int> nums;
        while (getline(ss, item, ',')) {
            nums.push_back(stoi(item));
        }
        int target;
        cin >> target;
        vector<int> res = twoSum(nums, target);
        cout << "[" << res[0] << "," << res[1] << "]" << endl;
    }
    return 0;
}
`,
      },
    ],
    testCases: [
      {
        input: '[2,7,11,15]\n9',
        expectedOutput: '[0,1]',
        isHidden: false,
        order: 0,
      },
      {
        input: '[3,2,4]\n6',
        expectedOutput: '[1,2]',
        isHidden: false,
        order: 1,
      },
      {
        input: '[3,3]\n6',
        expectedOutput: '[0,1]',
        isHidden: true,
        order: 2,
      },
      {
        input: '[-1,-2,-3,-4,-5]\n-8',
        expectedOutput: '[2,4]',
        isHidden: true,
        order: 3,
      },
    ],
  },
  {
    title: 'Valid Parentheses',
    descriptionMd: `Given a string \`s\` containing just the characters \`'('\`, \`')'\`, \`'{'\`, \`'}'\`, \`'['\` and \`']'\`, determine if the input string is valid.

An input string is valid if:
1. Open brackets must be closed by the same type of brackets.
2. Open brackets must be closed in the correct order.
3. Every close bracket has a corresponding open bracket of the same type.

### Example 1:
\`\`\`
Input: s = "()"
Output: true
\`\`\`

### Example 2:
\`\`\`
Input: s = "()[]{}"
Output: true
\`\`\`

### Example 3:
\`\`\`
Input: s = "(]"
Output: false
\`\`\`

### Constraints:
- \`1 <= s.length <= 10^4\`
- \`s\` consists of parentheses only \`'()[]{}'.\``,
    difficulty: 'easy',
    tags: ['string', 'stack'],
    languages: [
      {
        language: 'typescript',
        starterCode: `function isValid(s: string): boolean {
  const stack: string[] = [];
  const map: Record<string, string> = { ')': '(', '}': '{', ']': '[' };
  for (const ch of s) {
    if (ch in map) {
      if (stack.pop() !== map[ch]) return false;
    } else {
      stack.push(ch);
    }
  }
  return stack.length === 0;
}

const fs = require('fs');
const s = fs.readFileSync(0, 'utf-8').trim();
console.log(isValid(s).toString());
`,
      },
      {
        language: 'javascript',
        starterCode: `function isValid(s) {
  const stack = [];
  const map = { ')': '(', '}': '{', ']': '[' };
  for (const ch of s) {
    if (ch in map) {
      if (stack.pop() !== map[ch]) return false;
    } else {
      stack.push(ch);
    }
  }
  return stack.length === 0;
}

const fs = require('fs');
const s = fs.readFileSync(0, 'utf-8').trim();
console.log(isValid(s).toString());
`,
      },
      {
        language: 'python',
        starterCode: `import sys

def is_valid(s: str) -> bool:
    stack = []
    mapping = {")": "(", "}": "{", "]": "["}
    for char in s:
        if char in mapping:
            top = stack.pop() if stack else '#'
            if mapping[char] != top:
                return False
        else:
            stack.append(char)
    return not stack

if __name__ == '__main__':
    s = sys.stdin.read().strip()
    print(str(is_valid(s)).lower())
`,
      },
      {
        language: 'java',
        starterCode: `import java.util.*;

public class Main {
    public static boolean isValid(String s) {
        Deque<Character> stack = new ArrayDeque<>();
        for (char c : s.toCharArray()) {
            if (c == '(') stack.push(')');
            else if (c == '{') stack.push('}');
            else if (c == '[') stack.push(']');
            else if (stack.isEmpty() || stack.pop() != c) return false;
        }
        return stack.isEmpty();
    }

    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        String s = scanner.hasNextLine() ? scanner.nextLine().trim() : "";
        System.out.println(isValid(s));
    }
}
`,
      },
      {
        language: 'cpp',
        starterCode: `#include <iostream>
#include <stack>
#include <string>

using namespace std;

bool isValid(string s) {
    stack<char> st;
    for (char c : s) {
        if (c == '(') st.push(')');
        else if (c == '{') st.push('}');
        else if (c == '[') st.push(']');
        else {
            if (st.empty() || st.top() != c) return false;
            st.pop();
        }
    }
    return st.empty();
}

int main() {
    string s;
    if (cin >> s) {
        cout << (isValid(s) ? "true" : "false") << endl;
    }
    return 0;
}
`,
      },
    ],
    testCases: [
      {
        input: '()',
        expectedOutput: 'true',
        isHidden: false,
        order: 0,
      },
      {
        input: '()[]{}',
        expectedOutput: 'true',
        isHidden: false,
        order: 1,
      },
      {
        input: '(]',
        expectedOutput: 'false',
        isHidden: false,
        order: 2,
      },
      {
        input: '([)]',
        expectedOutput: 'false',
        isHidden: true,
        order: 3,
      },
      {
        input: '{[]}',
        expectedOutput: 'true',
        isHidden: true,
        order: 4,
      },
    ],
  },
];
